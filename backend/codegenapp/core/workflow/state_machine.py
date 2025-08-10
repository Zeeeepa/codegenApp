"""
State machine implementation for CI/CD workflow orchestration.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Set
from codegenapp.models.workflow_state import (
    WorkflowState, WorkflowTransition, WorkflowExecution, 
    StateTransitionRule, VALID_TRANSITIONS, WorkflowConfig
)

logger = logging.getLogger(__name__)


class StateMachineError(Exception):
    """State machine specific errors"""
    pass


class InvalidTransitionError(StateMachineError):
    """Invalid state transition error"""
    pass


class TimeoutError(StateMachineError):
    """State timeout error"""
    pass


class StateMachine:
    """CI/CD Workflow State Machine"""
    
    def __init__(self, config: WorkflowConfig):
        self.config = config
        self.transition_rules = self._build_transition_map()
        self.active_timeouts: Dict[str, asyncio.Task] = {}
        
    def _build_transition_map(self) -> Dict[WorkflowState, List[StateTransitionRule]]:
        """Build transition rule mapping for fast lookup"""
        transition_map = {}
        for rule in VALID_TRANSITIONS:
            if rule.from_state not in transition_map:
                transition_map[rule.from_state] = []
            transition_map[rule.from_state].append(rule)
        return transition_map
    
    async def validate_transition(
        self, 
        execution: WorkflowExecution,
        to_state: WorkflowState,
        conditions: Dict[str, Any]
    ) -> bool:
        """Validate if transition is allowed"""
        current_state = execution.current_state
        
        # Get applicable rules
        if current_state not in self.transition_rules:
            logger.error(f"No transition rules found for state {current_state}")
            return False
        
        applicable_rules = [
            rule for rule in self.transition_rules[current_state]
            if rule.to_state == to_state
        ]
        
        if not applicable_rules:
            logger.error(f"No valid transition from {current_state} to {to_state}")
            return False
        
        # Check if any rule is satisfied
        for rule in applicable_rules:
            if await self._check_rule_conditions(rule, conditions):
                logger.info(f"Transition validated: {current_state} -> {to_state}")
                return True
        
        logger.warning(f"Transition conditions not met: {current_state} -> {to_state}")
        return False
    
    async def _check_rule_conditions(
        self, 
        rule: StateTransitionRule, 
        conditions: Dict[str, Any]
    ) -> bool:
        """Check if rule conditions are satisfied"""
        # Check required conditions
        for condition in rule.required_conditions:
            if condition not in conditions or not conditions[condition]:
                logger.debug(f"Required condition not met: {condition}")
                return False
        
        # Optional conditions don't block transition
        logger.debug(f"All required conditions met for rule {rule.from_state} -> {rule.to_state}")
        return True
    
    async def transition(
        self,
        execution: WorkflowExecution,
        to_state: WorkflowState,
        trigger: str,
        conditions: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> WorkflowTransition:
        """Execute state transition"""
        current_state = execution.current_state
        
        # Validate transition
        if not await self.validate_transition(execution, to_state, conditions):
            raise InvalidTransitionError(
                f"Invalid transition from {current_state} to {to_state}"
            )
        
        # Cancel existing timeout
        await self._cancel_timeout(execution.id)
        
        # Create transition record
        transition = WorkflowTransition(
            from_state=current_state,
            to_state=to_state,
            timestamp=datetime.utcnow(),
            trigger=trigger,
            metadata=metadata
        )
        
        # Update execution state
        execution.current_state = to_state
        execution.last_activity = datetime.utcnow()
        execution.state_history.append(transition)
        
        # Set up timeout for new state if applicable
        await self._setup_timeout(execution, to_state)
        
        logger.info(f"State transition completed: {current_state} -> {to_state} (trigger: {trigger})")
        return transition
    
    async def _setup_timeout(self, execution: WorkflowExecution, state: WorkflowState):
        """Set up timeout for state"""
        timeout_seconds = self._get_state_timeout(state)
        if timeout_seconds is None:
            return
        
        async def timeout_handler():
            try:
                await asyncio.sleep(timeout_seconds)
                logger.warning(f"Workflow {execution.id} timed out in state {state}")
                # This would trigger a timeout event that the workflow engine handles
                await self._handle_timeout(execution, state)
            except asyncio.CancelledError:
                logger.debug(f"Timeout cancelled for workflow {execution.id} state {state}")
        
        task = asyncio.create_task(timeout_handler())
        self.active_timeouts[execution.id] = task
    
    async def _cancel_timeout(self, execution_id: str):
        """Cancel active timeout for execution"""
        if execution_id in self.active_timeouts:
            self.active_timeouts[execution_id].cancel()
            del self.active_timeouts[execution_id]
    
    def _get_state_timeout(self, state: WorkflowState) -> Optional[int]:
        """Get timeout for state"""
        timeout_map = {
            WorkflowState.PLANNING: self.config.planning_timeout,
            WorkflowState.CODING: self.config.coding_timeout,
            WorkflowState.VALIDATING: self.config.validation_timeout,
        }
        return timeout_map.get(state)
    
    async def _handle_timeout(self, execution: WorkflowExecution, state: WorkflowState):
        """Handle state timeout"""
        # This would be handled by the workflow engine
        # For now, just log the timeout
        logger.error(f"Workflow {execution.id} timed out in state {state}")
        raise TimeoutError(f"Workflow timed out in state {state}")
    
    def get_valid_transitions(self, current_state: WorkflowState) -> List[WorkflowState]:
        """Get list of valid next states"""
        if current_state not in self.transition_rules:
            return []
        
        return [rule.to_state for rule in self.transition_rules[current_state]]
    
    def is_terminal_state(self, state: WorkflowState) -> bool:
        """Check if state is terminal (no outgoing transitions)"""
        return state in [WorkflowState.COMPLETED, WorkflowState.FAILED, WorkflowState.CANCELLED]
    
    def get_state_requirements(
        self, 
        from_state: WorkflowState, 
        to_state: WorkflowState
    ) -> Optional[StateTransitionRule]:
        """Get requirements for specific transition"""
        if from_state not in self.transition_rules:
            return None
        
        for rule in self.transition_rules[from_state]:
            if rule.to_state == to_state:
                return rule
        
        return None
    
    async def can_retry(self, execution: WorkflowExecution) -> bool:
        """Check if workflow can be retried"""
        if execution.retry_count >= execution.max_retries:
            return False
        
        if execution.current_state in [WorkflowState.COMPLETED, WorkflowState.CANCELLED]:
            return False
        
        return True
    
    async def reset_for_retry(self, execution: WorkflowExecution) -> WorkflowExecution:
        """Reset workflow for retry"""
        if not await self.can_retry(execution):
            raise StateMachineError("Workflow cannot be retried")
        
        execution.retry_count += 1
        execution.current_state = WorkflowState.IDLE
        execution.last_activity = datetime.utcnow()
        execution.error_message = None
        
        # Add retry transition to history
        retry_transition = WorkflowTransition(
            from_state=WorkflowState.FAILED,
            to_state=WorkflowState.IDLE,
            timestamp=datetime.utcnow(),
            trigger="retry",
            metadata={"retry_count": execution.retry_count}
        )
        execution.state_history.append(retry_transition)
        
        logger.info(f"Workflow {execution.id} reset for retry (attempt {execution.retry_count})")
        return execution
    
    def get_execution_summary(self, execution: WorkflowExecution) -> Dict[str, Any]:
        """Get execution summary for monitoring"""
        total_time = None
        if execution.started_at and execution.completed_at:
            total_time = (execution.completed_at - execution.started_at).total_seconds()
        elif execution.started_at:
            total_time = (datetime.utcnow() - execution.started_at).total_seconds()
        
        state_durations = {}
        for i, transition in enumerate(execution.state_history):
            if i == 0:
                continue
            
            prev_transition = execution.state_history[i-1]
            duration = (transition.timestamp - prev_transition.timestamp).total_seconds()
            state_durations[prev_transition.to_state.value] = duration
        
        return {
            "id": execution.id,
            "project_id": execution.project_id,
            "current_state": execution.current_state.value,
            "total_time_seconds": total_time,
            "state_durations": state_durations,
            "retry_count": execution.retry_count,
            "iteration": execution.metadata.current_iteration,
            "transitions_count": len(execution.state_history),
            "is_terminal": self.is_terminal_state(execution.current_state),
            "can_retry": execution.current_state == WorkflowState.FAILED and execution.retry_count < self.max_retries
        }
