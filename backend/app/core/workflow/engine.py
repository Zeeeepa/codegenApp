"""
Core Workflow Execution Engine
Handles workflow orchestration, step execution, and state management
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Set
from enum import Enum

from app.models.domain.workflow import (
    WorkflowDefinition, WorkflowExecution, WorkflowStep, 
    WorkflowStatus, WorkflowStepStatus
)
from app.core.orchestration.coordinator import ServiceCoordinator
from app.core.orchestration.state_manager import WorkflowStateManager
from app.utils.exceptions import WorkflowExecutionError, StepExecutionError

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Core workflow execution engine"""
    
    def __init__(
        self, 
        coordinator: ServiceCoordinator,
        state_manager: WorkflowStateManager
    ):
        self.coordinator = coordinator
        self.state_manager = state_manager
        self.active_executions: Dict[str, WorkflowExecution] = {}
        
    async def start_workflow(
        self,
        workflow: WorkflowDefinition,
        parameters: Dict[str, Any],
        organization_id: int,
        user_id: int
    ) -> WorkflowExecution:
        """Start workflow execution"""
        execution_id = str(uuid.uuid4())
        
        execution = WorkflowExecution(
            id=execution_id,
            workflow_id=workflow.id,
            status=WorkflowStatus.PENDING,
            started_at=datetime.utcnow(),
            organization_id=organization_id,
            user_id=user_id,
            parameters=parameters
        )
        
        # Store execution
        self.active_executions[execution_id] = execution
        await self.state_manager.save_execution(execution)
        
        # Start execution in background
        asyncio.create_task(self._execute_workflow(execution, workflow))
        
        logger.info(f"🚀 Started workflow execution {execution_id}")
        return execution
    
    async def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID"""
        # Try memory first
        if execution_id in self.active_executions:
            return self.active_executions[execution_id]
        
        # Try persistent storage
        return await self.state_manager.get_execution(execution_id)
    
    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel workflow execution"""
        execution = await self.get_execution(execution_id)
        if not execution:
            return False
        
        if execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
            return False
        
        execution.status = WorkflowStatus.CANCELLED
        execution.completed_at = datetime.utcnow()
        
        await self.state_manager.save_execution(execution)
        
        logger.info(f"🛑 Cancelled workflow execution {execution_id}")
        return True
    
    async def _execute_workflow(
        self, 
        execution: WorkflowExecution, 
        workflow: WorkflowDefinition
    ):
        """Execute workflow steps"""
        try:
            execution.status = WorkflowStatus.RUNNING
            await self.state_manager.save_execution(execution)
            
            logger.info(f"🔄 Executing workflow {workflow.id}")
            
            # Build execution plan
            execution_plan = self._build_execution_plan(workflow.steps)
            
            # Execute steps in dependency order
            completed_steps: Set[str] = set()
            failed_steps: Set[str] = set()
            
            for step_batch in execution_plan:
                # Execute steps in current batch concurrently
                batch_tasks = []
                
                for step in step_batch:
                    if step.id in failed_steps:
                        continue
                        
                    # Check if all dependencies are completed
                    if not all(dep in completed_steps for dep in step.depends_on):
                        logger.warning(f"⚠️ Step {step.id} dependencies not met")
                        continue
                    
                    task = asyncio.create_task(
                        self._execute_step(execution, step)
                    )
                    batch_tasks.append((step, task))
                
                # Wait for batch completion
                for step, task in batch_tasks:
                    try:
                        result = await task
                        execution.step_results[step.id] = result
                        completed_steps.add(step.id)
                        
                        logger.info(f"✅ Completed step {step.id}")
                        
                    except Exception as e:
                        logger.error(f"❌ Step {step.id} failed: {e}")
                        
                        execution.step_results[step.id] = {
                            "status": "failed",
                            "error": str(e),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
                        failed_steps.add(step.id)
                        
                        # Check if this is a critical step
                        if not self._is_step_optional(step):
                            raise StepExecutionError(f"Critical step {step.id} failed: {e}")
                
                # Update execution state
                await self.state_manager.save_execution(execution)
            
            # Check final status
            if failed_steps and not self._can_complete_with_failures(workflow, failed_steps):
                raise WorkflowExecutionError("Workflow failed due to critical step failures")
            
            # Workflow completed
            execution.status = WorkflowStatus.COMPLETED
            execution.completed_at = datetime.utcnow()
            
            logger.info(f"🎉 Workflow execution {execution.id} completed successfully")
            
        except Exception as e:
            execution.status = WorkflowStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            
            logger.error(f"💥 Workflow execution {execution.id} failed: {e}")
            
        finally:
            await self.state_manager.save_execution(execution)
            
            # Remove from active executions after delay
            asyncio.create_task(self._cleanup_execution(execution.id))
    
    async def _execute_step(
        self, 
        execution: WorkflowExecution, 
        step: WorkflowStep
    ) -> Dict[str, Any]:
        """Execute individual workflow step"""
        logger.info(f"🔄 Executing step {step.id}: {step.name}")
        
        execution.current_step = step.id
        
        # Prepare step context
        step_context = {
            "execution_id": execution.id,
            "workflow_id": execution.workflow_id,
            "organization_id": execution.organization_id,
            "user_id": execution.user_id,
            "parameters": {**execution.parameters, **step.parameters}
        }
        
        # Add results from dependency steps
        for dep_step_id in step.depends_on:
            if dep_step_id in execution.step_results:
                dep_result = execution.step_results[dep_step_id]
                if dep_result.get("status") == "completed":
                    step_context["parameters"][f"{dep_step_id}_result"] = dep_result.get("result")
        
        # Execute step through coordinator
        try:
            if step.timeout:
                result = await asyncio.wait_for(
                    self.coordinator.execute_step(step, step_context),
                    timeout=step.timeout
                )
            else:
                result = await self.coordinator.execute_step(step, step_context)
            
            return {
                "status": "completed",
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except asyncio.TimeoutError:
            raise StepExecutionError(f"Step {step.id} timed out after {step.timeout} seconds")
        except Exception as e:
            # Retry logic
            if step.retry_count > 0:
                logger.warning(f"⚠️ Step {step.id} failed, retrying...")
                await asyncio.sleep(2)  # Brief delay before retry
                step.retry_count -= 1
                return await self._execute_step(execution, step)
            else:
                raise StepExecutionError(f"Step {step.id} failed: {e}")
    
    def _build_execution_plan(self, steps: List[WorkflowStep]) -> List[List[WorkflowStep]]:
        """Build execution plan with dependency ordering"""
        # Create dependency graph
        step_map = {step.id: step for step in steps}
        dependency_graph = {step.id: set(step.depends_on) for step in steps}
        
        # Topological sort to create execution batches
        execution_plan = []
        remaining_steps = set(step.id for step in steps)
        
        while remaining_steps:
            # Find steps with no remaining dependencies
            ready_steps = []
            for step_id in remaining_steps:
                if not dependency_graph[step_id] & remaining_steps:
                    ready_steps.append(step_map[step_id])
            
            if not ready_steps:
                raise WorkflowExecutionError("Circular dependency detected in workflow")
            
            execution_plan.append(ready_steps)
            
            # Remove completed steps from remaining
            for step in ready_steps:
                remaining_steps.remove(step.id)
        
        return execution_plan
    
    def _is_step_optional(self, step: WorkflowStep) -> bool:
        """Check if step is optional"""
        return step.parameters.get("optional", False)
    
    def _can_complete_with_failures(
        self, 
        workflow: WorkflowDefinition, 
        failed_steps: Set[str]
    ) -> bool:
        """Check if workflow can complete despite step failures"""
        # Check if all failed steps are optional
        for step in workflow.steps:
            if step.id in failed_steps and not self._is_step_optional(step):
                return False
        return True
    
    async def _cleanup_execution(self, execution_id: str, delay: int = 300):
        """Cleanup execution from memory after delay"""
        await asyncio.sleep(delay)
        if execution_id in self.active_executions:
            del self.active_executions[execution_id]
            logger.debug(f"🧹 Cleaned up execution {execution_id} from memory")


class WorkflowEngineFactory:
    """Factory for creating workflow engine instances"""
    
    @staticmethod
    def create_engine(
        coordinator: ServiceCoordinator,
        state_manager: WorkflowStateManager
    ) -> WorkflowEngine:
        """Create workflow engine instance"""
        return WorkflowEngine(coordinator, state_manager)
