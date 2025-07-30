"""
CI/CD Workflow Engine - Orchestrates complete continuous integration and deployment flow.
"""

import asyncio
import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path

from app.models.workflow_state import (
    WorkflowState, WorkflowExecution, WorkflowMetadata, 
    WorkflowConfig, WorkflowEvent
)
from app.core.workflow.state_machine import StateMachine, InvalidTransitionError, TimeoutError
from app.core.workflow.workflow_context import WorkflowContext
from app.services.adapters.codegen_adapter import CodegenAdapter
from app.websocket.manager import WebSocketManager
from app.services.webhook_processor import WebhookProcessor

logger = logging.getLogger(__name__)


class WorkflowEngineError(Exception):
    """Workflow engine specific errors"""
    pass


class CICDWorkflowEngine:
    """CI/CD Workflow Engine for continuous development cycles"""
    
    def __init__(
        self,
        codegen_adapter: CodegenAdapter,
        websocket_manager: WebSocketManager,
        webhook_processor: WebhookProcessor,
        config: Optional[WorkflowConfig] = None
    ):
        self.codegen_adapter = codegen_adapter
        self.websocket_manager = websocket_manager
        self.webhook_processor = webhook_processor
        self.config = config or WorkflowConfig()
        
        # Initialize state machine
        self.state_machine = StateMachine(self.config)
        
        # Active workflows
        self.active_workflows: Dict[str, WorkflowExecution] = {}
        self.workflow_contexts: Dict[str, WorkflowContext] = {}
        
        # Persistence
        self.persistence_path = Path("data/workflows")
        self.persistence_path.mkdir(parents=True, exist_ok=True)
        
        # Background tasks
        self._background_tasks: set = set()
        
    async def start_workflow(
        self,
        project_id: str,
        repository: Dict[str, Any],
        initial_requirements: str,
        planning_statement: Optional[str] = None,
        auto_confirm_plan: bool = False,
        auto_merge_pr: bool = False,
        max_iterations: int = 10
    ) -> WorkflowExecution:
        """Start a new CI/CD workflow"""
        
        # Check concurrent workflow limit
        if len(self.active_workflows) >= self.config.max_concurrent_workflows:
            raise WorkflowEngineError("Maximum concurrent workflows reached")
        
        # Create workflow execution
        workflow_id = str(uuid.uuid4())
        
        metadata = WorkflowMetadata(
            project_id=project_id,
            repository=repository,
            initial_requirements=initial_requirements,
            planning_statement=planning_statement,
            auto_confirm_plan=auto_confirm_plan,
            auto_merge_pr=auto_merge_pr,
            max_iterations=max_iterations
        )
        
        execution = WorkflowExecution(
            id=workflow_id,
            project_id=project_id,
            current_state=WorkflowState.IDLE,
            metadata=metadata,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
        
        # Create workflow context
        context = WorkflowContext(metadata)
        context.set("project_configured", True)
        context.set("initial_requirements", initial_requirements)
        
        # Store workflow
        self.active_workflows[workflow_id] = execution
        self.workflow_contexts[workflow_id] = context
        
        # Persist workflow
        await self._persist_workflow(execution, context)
        
        # Send initial event
        await self._send_workflow_event(execution, "workflow_started", {
            "requirements": initial_requirements,
            "auto_confirm_plan": auto_confirm_plan,
            "auto_merge_pr": auto_merge_pr
        })
        
        # Start workflow execution
        task = asyncio.create_task(self._execute_workflow(workflow_id))
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        
        logger.info(f"🚀 Started CI/CD workflow {workflow_id} for project {project_id}")
        return execution
    
    async def _execute_workflow(self, workflow_id: str) -> None:
        """Execute workflow state machine"""
        try:
            execution = self.active_workflows[workflow_id]
            context = self.workflow_contexts[workflow_id]
            
            # Start workflow
            await self._transition_to_planning(workflow_id)
            
            # Main workflow loop
            while not self.state_machine.is_terminal_state(execution.current_state):
                current_state = execution.current_state
                
                try:
                    if current_state == WorkflowState.PLANNING:
                        await self._handle_planning_state(workflow_id)
                    elif current_state == WorkflowState.CODING:
                        await self._handle_coding_state(workflow_id)
                    elif current_state == WorkflowState.PR_CREATED:
                        await self._handle_pr_created_state(workflow_id)
                    elif current_state == WorkflowState.VALIDATING:
                        await self._handle_validating_state(workflow_id)
                    else:
                        logger.error(f"Unhandled state: {current_state}")
                        break
                        
                except TimeoutError as e:
                    logger.error(f"Workflow {workflow_id} timed out in state {current_state}: {e}")
                    await self._handle_workflow_timeout(workflow_id, current_state)
                    break
                    
                except Exception as e:
                    logger.error(f"Error in workflow {workflow_id} state {current_state}: {e}")
                    await self._handle_workflow_error(workflow_id, str(e))
                    break
                
                # Check if we should continue or complete
                if execution.current_state == WorkflowState.VALIDATING:
                    completion = context.validate_requirements_completion()
                    if completion["completed"]:
                        await self._transition_to_completed(workflow_id)
                        break
                    elif not context.should_continue_iteration():
                        await self._transition_to_failed(workflow_id, "Maximum iterations reached or too many errors")
                        break
                    else:
                        # Continue to next iteration
                        context.prepare_next_iteration()
                        await self._transition_to_planning(workflow_id)
            
            logger.info(f"✅ Workflow {workflow_id} completed in state {execution.current_state}")
            
        except Exception as e:
            logger.error(f"❌ Fatal error in workflow {workflow_id}: {e}")
            await self._handle_workflow_error(workflow_id, f"Fatal error: {e}")
        finally:
            # Cleanup
            await self._cleanup_workflow(workflow_id)
    
    async def _handle_planning_state(self, workflow_id: str) -> None:
        """Handle planning state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        logger.info(f"🎯 Planning phase for workflow {workflow_id}")
        
        # Prepare agent run context
        agent_context = context.get_full_context_for_agent()
        
        # Create agent run
        try:
            agent_run = await self.codegen_adapter.create_agent_run(
                project_id=execution.project_id,
                target=execution.metadata.initial_requirements,
                context=agent_context
            )
            
            context.metadata.current_agent_run_id = agent_run.get("id")
            context.metadata.agent_run_history.append(agent_run.get("id"))
            
            await self._send_workflow_event(execution, "agent_run_created", {
                "agent_run_id": agent_run.get("id"),
                "iteration": context.metadata.current_iteration
            })
            
            # Wait for agent run completion
            await self._wait_for_agent_run_completion(workflow_id, agent_run.get("id"))
            
        except Exception as e:
            logger.error(f"Failed to create agent run for workflow {workflow_id}: {e}")
            context.add_error_context(f"Planning failed: {e}")
            raise
    
    async def _wait_for_agent_run_completion(self, workflow_id: str, agent_run_id: str) -> None:
        """Wait for agent run to complete and handle response"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        # Poll for completion (in real implementation, this would be event-driven)
        max_wait_time = self.config.planning_timeout
        poll_interval = 30  # seconds
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            try:
                status = await self.codegen_adapter.get_agent_run_status(agent_run_id)
                
                if status.get("status") == "completed":
                    response_type = status.get("type", "regular")
                    response_content = status.get("response", "")
                    
                    context.set("agent_response", response_content)
                    context.set("agent_response_type", response_type)
                    
                    if response_type == "plan":
                        context.set("plan_created", True)
                        
                        # Auto-confirm if enabled
                        if execution.metadata.auto_confirm_plan:
                            context.set("plan_confirmed", True)
                            await self._transition_to_coding(workflow_id)
                        else:
                            # Wait for manual confirmation
                            await self._wait_for_plan_confirmation(workflow_id)
                        
                    elif response_type == "pr":
                        # Direct PR creation
                        pr_number = self._extract_pr_number(response_content)
                        if pr_number:
                            context.metadata.current_pr_number = pr_number
                            context.metadata.pr_history.append(pr_number)
                            context.set("pr_created", True)
                            context.set("code_generated", True)
                            await self._transition_to_pr_created(workflow_id)
                        else:
                            raise WorkflowEngineError("Could not extract PR number from response")
                    
                    else:
                        # Regular response - continue planning
                        context.add_accumulated_context(response_content)
                        # This would typically trigger another planning iteration
                        
                    break
                    
                elif status.get("status") == "failed":
                    error_msg = status.get("error", "Agent run failed")
                    context.add_error_context(f"Agent run failed: {error_msg}")
                    raise WorkflowEngineError(f"Agent run failed: {error_msg}")
                
                # Continue waiting
                await asyncio.sleep(poll_interval)
                elapsed_time += poll_interval
                
            except Exception as e:
                logger.error(f"Error checking agent run status: {e}")
                context.add_error_context(f"Status check failed: {e}")
                raise
        
        # Timeout
        raise TimeoutError(f"Agent run {agent_run_id} timed out")
    
    async def _wait_for_plan_confirmation(self, workflow_id: str) -> None:
        """Wait for plan confirmation from user"""
        # This would be implemented with WebSocket communication
        # For now, we'll simulate auto-confirmation after a delay
        await asyncio.sleep(5)  # Simulate user thinking time
        
        context = self.workflow_contexts[workflow_id]
        context.set("plan_confirmed", True)
        await self._transition_to_coding(workflow_id)
    
    async def _handle_coding_state(self, workflow_id: str) -> None:
        """Handle coding state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        logger.info(f"💻 Coding phase for workflow {workflow_id}")
        
        # In this state, we wait for the agent to generate code and create PR
        # This is typically handled by the agent run that was confirmed in planning
        
        # Simulate coding completion (in real implementation, this would be event-driven)
        await asyncio.sleep(10)
        
        # Simulate PR creation
        pr_number = 123  # This would come from actual PR creation
        context.metadata.current_pr_number = pr_number
        context.metadata.pr_history.append(pr_number)
        context.set("code_generated", True)
        context.set("pr_created", True)
        
        await self._transition_to_pr_created(workflow_id)
    
    async def _handle_pr_created_state(self, workflow_id: str) -> None:
        """Handle PR created state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        logger.info(f"🔄 PR created for workflow {workflow_id}")
        
        # Wait for webhook notification (simulated)
        await asyncio.sleep(2)
        
        context.set("pr_detected", True)
        context.set("webhook_received", True)
        
        await self._transition_to_validating(workflow_id)
    
    async def _handle_validating_state(self, workflow_id: str) -> None:
        """Handle validation state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        logger.info(f"🔍 Validation phase for workflow {workflow_id}")
        
        context.metadata.validation_attempts += 1
        
        # This would integrate with Grainchain, Graph-Sitter, and Web-Eval-Agent
        # For now, simulate validation
        await asyncio.sleep(30)  # Simulate validation time
        
        # Simulate validation result
        validation_passed = context.metadata.validation_attempts <= 2  # Fail first 2 attempts
        
        if validation_passed:
            context.set("validation_passed", True)
            context.set("tests_passing", True)
            context.set("deployment_successful", True)
            
            # Check if requirements are met
            completion = context.validate_requirements_completion()
            if completion["completed"]:
                context.set("requirements_met", True)
                await self._transition_to_completed(workflow_id)
            else:
                context.set("requirements_not_met", True)
                # Continue to next iteration
                
        else:
            context.set("validation_failed", True)
            context.add_error_context(f"Validation failed on attempt {context.metadata.validation_attempts}")
            
            if context.metadata.validation_attempts >= self.config.max_validation_attempts:
                context.set("max_iterations_reached", True)
                await self._transition_to_failed(workflow_id, "Maximum validation attempts reached")
            else:
                context.set("requirements_not_met", True)
                # Will continue to next iteration in main loop
    
    # State transition methods
    async def _transition_to_planning(self, workflow_id: str) -> None:
        """Transition to planning state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        conditions = {
            "initial_requirements": True,
            "project_configured": True
        }
        
        await self.state_machine.transition(
            execution, WorkflowState.PLANNING, "start_planning", conditions
        )
        
        await self._send_workflow_event(execution, "state_changed", {
            "new_state": WorkflowState.PLANNING.value,
            "iteration": context.metadata.current_iteration
        })
    
    async def _transition_to_coding(self, workflow_id: str) -> None:
        """Transition to coding state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        conditions = {
            "plan_created": context.get("plan_created", False),
            "plan_confirmed": context.get("plan_confirmed", False)
        }
        
        await self.state_machine.transition(
            execution, WorkflowState.CODING, "start_coding", conditions
        )
        
        await self._send_workflow_event(execution, "state_changed", {
            "new_state": WorkflowState.CODING.value
        })
    
    async def _transition_to_pr_created(self, workflow_id: str) -> None:
        """Transition to PR created state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        conditions = {
            "code_generated": context.get("code_generated", False),
            "pr_created": context.get("pr_created", False)
        }
        
        await self.state_machine.transition(
            execution, WorkflowState.PR_CREATED, "pr_created", conditions
        )
        
        await self._send_workflow_event(execution, "pr_created", {
            "pr_number": context.metadata.current_pr_number
        })
    
    async def _transition_to_validating(self, workflow_id: str) -> None:
        """Transition to validating state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        conditions = {
            "pr_detected": context.get("pr_detected", False),
            "webhook_received": context.get("webhook_received", False)
        }
        
        await self.state_machine.transition(
            execution, WorkflowState.VALIDATING, "start_validation", conditions
        )
        
        await self._send_workflow_event(execution, "validation_started", {
            "pr_number": context.metadata.current_pr_number,
            "attempt": context.metadata.validation_attempts
        })
    
    async def _transition_to_completed(self, workflow_id: str) -> None:
        """Transition to completed state"""
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        conditions = {
            "validation_passed": context.get("validation_passed", False),
            "requirements_met": context.get("requirements_met", False)
        }
        
        await self.state_machine.transition(
            execution, WorkflowState.COMPLETED, "workflow_completed", conditions
        )
        
        execution.completed_at = datetime.utcnow()
        execution.final_result = {
            "success": True,
            "iterations": context.metadata.current_iteration,
            "pr_numbers": context.metadata.pr_history,
            "completion_analysis": context.validate_requirements_completion()
        }
        
        await self._send_workflow_event(execution, "workflow_completed", {
            "final_result": execution.final_result
        })
    
    async def _transition_to_failed(self, workflow_id: str, error_message: str) -> None:
        """Transition to failed state"""
        execution = self.active_workflows[workflow_id]
        
        conditions = {"error_occurred": True}
        
        await self.state_machine.transition(
            execution, WorkflowState.FAILED, "workflow_failed", conditions
        )
        
        execution.completed_at = datetime.utcnow()
        execution.error_message = error_message
        
        await self._send_workflow_event(execution, "workflow_failed", {
            "error": error_message
        })
    
    # Utility methods
    def _extract_pr_number(self, response: str) -> Optional[int]:
        """Extract PR number from agent response"""
        # Simple regex to find PR number - would be more sophisticated in real implementation
        import re
        match = re.search(r'#(\d+)', response)
        return int(match.group(1)) if match else None
    
    async def _send_workflow_event(self, execution: WorkflowExecution, event_type: str, data: Dict[str, Any]) -> None:
        """Send workflow event via WebSocket"""
        event = WorkflowEvent(
            workflow_id=execution.id,
            project_id=execution.project_id,
            event_type=event_type,
            state=execution.current_state,
            data=data
        )
        
        await self.websocket_manager.send_to_project(
            execution.project_id,
            {
                "type": "workflow_event",
                "event": event.dict()
            }
        )
    
    async def _persist_workflow(self, execution: WorkflowExecution, context: WorkflowContext) -> None:
        """Persist workflow state"""
        workflow_file = self.persistence_path / f"{execution.id}.json"
        
        data = {
            "execution": execution.dict(),
            "context": context.serialize()
        }
        
        with open(workflow_file, 'w') as f:
            json.dump(data, f, default=str, indent=2)
    
    async def _handle_workflow_timeout(self, workflow_id: str, state: WorkflowState) -> None:
        """Handle workflow timeout"""
        context = self.workflow_contexts[workflow_id]
        context.add_error_context(f"Timeout in state {state}")
        await self._transition_to_failed(workflow_id, f"Timeout in state {state}")
    
    async def _handle_workflow_error(self, workflow_id: str, error: str) -> None:
        """Handle workflow error"""
        context = self.workflow_contexts[workflow_id]
        context.add_error_context(error)
        await self._transition_to_failed(workflow_id, error)
    
    async def _cleanup_workflow(self, workflow_id: str) -> None:
        """Cleanup workflow resources"""
        if workflow_id in self.active_workflows:
            del self.active_workflows[workflow_id]
        
        if workflow_id in self.workflow_contexts:
            del self.workflow_contexts[workflow_id]
        
        # Cancel any active timeouts
        await self.state_machine._cancel_timeout(workflow_id)
    
    # Public API methods
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get workflow status"""
        if workflow_id not in self.active_workflows:
            return None
        
        execution = self.active_workflows[workflow_id]
        context = self.workflow_contexts[workflow_id]
        
        return {
            "execution": execution.dict(),
            "summary": self.state_machine.get_execution_summary(execution),
            "context_debug": context.get_debug_info()
        }
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel workflow"""
        if workflow_id not in self.active_workflows:
            return False
        
        execution = self.active_workflows[workflow_id]
        
        if self.state_machine.is_terminal_state(execution.current_state):
            return False
        
        await self.state_machine.transition(
            execution, WorkflowState.CANCELLED, "user_cancelled", {"user_action": True}
        )
        
        await self._cleanup_workflow(workflow_id)
        return True
    
    async def get_active_workflows(self) -> List[Dict[str, Any]]:
        """Get all active workflows"""
        return [
            {
                "id": execution.id,
                "project_id": execution.project_id,
                "state": execution.current_state.value,
                "created_at": execution.created_at,
                "last_activity": execution.last_activity
            }
            for execution in self.active_workflows.values()
        ]
