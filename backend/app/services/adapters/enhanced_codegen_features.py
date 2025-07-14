"""
Enhanced Codegen Features

Extends the existing codegen adapter with advanced library kit features including:
- Workflow-aware agent runs
- Multi-step agent workflows  
- Shared context management
- Integration with other components
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from dataclasses import dataclass, field
import json
import uuid

from .codegen_adapter import CodegenService
from ..core.integration.event_bus import EventBus, Event, EventTypes
from ..core.orchestration.coordinator import ServiceAdapter

logger = logging.getLogger(__name__)


@dataclass
class WorkflowContext:
    """Shared context for workflow-aware agent runs"""
    
    workflow_id: str
    execution_id: str
    user_id: str
    organization_id: int
    shared_state: Dict[str, Any] = field(default_factory=dict)
    component_results: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "execution_id": self.execution_id,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "shared_state": self.shared_state,
            "component_results": self.component_results,
            "metadata": self.metadata
        }


@dataclass
class AgentStep:
    """Individual step in a multi-step agent workflow"""
    
    step_id: str
    step_name: str
    prompt: str
    context: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    timeout: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "step_name": self.step_name,
            "prompt": self.prompt,
            "context": self.context,
            "dependencies": self.dependencies,
            "timeout": self.timeout,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }


@dataclass
class MultiStepWorkflow:
    """Multi-step agent workflow definition"""
    
    workflow_id: str
    name: str
    description: str
    steps: List[AgentStep]
    parallel_execution: bool = False
    failure_strategy: str = "stop"  # stop, continue, retry
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "steps": [step.to_dict() for step in self.steps],
            "parallel_execution": self.parallel_execution,
            "failure_strategy": self.failure_strategy
        }


class EnhancedCodegenAdapter(ServiceAdapter):
    """Enhanced Codegen adapter with library kit integration"""
    
    def __init__(self, config: Dict[str, Any], event_bus: EventBus):
        self.config = config
        self.event_bus = event_bus
        
        # Initialize base codegen service
        api_token = config.get("api_token")
        api_base_url = config.get("api_base_url", "https://api.codegen.com")
        
        if not api_token:
            raise ValueError("Codegen API token is required")
        
        self.codegen_service = CodegenService(api_token, api_base_url)
        
        # Enhanced features
        self.active_workflows: Dict[str, MultiStepWorkflow] = {}
        self.workflow_contexts: Dict[str, WorkflowContext] = {}
        self.step_results: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.max_concurrent_workflows = config.get("max_concurrent_workflows", 5)
        self.default_timeout = config.get("default_timeout", 300)
        self.context_retention_hours = config.get("context_retention_hours", 24)
        
        # Workflow execution semaphore
        self.workflow_semaphore = asyncio.Semaphore(self.max_concurrent_workflows)
    
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute enhanced codegen action"""
        
        action_map = {
            # Enhanced workflow actions
            "create_workflow_run": self._create_workflow_run,
            "execute_multi_step_workflow": self._execute_multi_step_workflow,
            "get_workflow_status": self._get_workflow_status,
            "cancel_workflow": self._cancel_workflow,
            "resume_workflow_step": self._resume_workflow_step,
            
            # Context management actions
            "create_shared_context": self._create_shared_context,
            "update_shared_context": self._update_shared_context,
            "get_shared_context": self._get_shared_context,
            "merge_component_results": self._merge_component_results,
            
            # Advanced agent actions
            "create_contextual_agent_run": self._create_contextual_agent_run,
            "create_collaborative_agent_run": self._create_collaborative_agent_run,
            "chain_agent_runs": self._chain_agent_runs,
            
            # Integration actions
            "trigger_code_analysis": self._trigger_code_analysis,
            "trigger_web_evaluation": self._trigger_web_evaluation,
            "trigger_sandbox_deployment": self._trigger_sandbox_deployment,
            
            # Standard codegen actions (delegated)
            "create_agent_run": self._delegate_to_codegen,
            "get_agent_run": self._delegate_to_codegen,
            "list_agent_runs": self._delegate_to_codegen,
            "resume_agent_run": self._delegate_to_codegen,
            "get_current_user": self._delegate_to_codegen,
            "get_organizations": self._delegate_to_codegen,
            "get_agent_run_logs": self._delegate_to_codegen
        }
        
        handler = action_map.get(action)
        if not handler:
            raise Exception(f"Unknown action: {action}")
        
        return await handler(context)
    
    async def health_check(self) -> str:
        """Check enhanced codegen service health"""
        try:
            # Check base codegen service
            base_health = await self.codegen_service.health_check()
            if base_health != "healthy":
                return f"degraded: base codegen service {base_health}"
            
            # Check event bus connection
            if not self.event_bus:
                return "degraded: event bus not available"
            
            # Check workflow capacity
            active_count = len(self.active_workflows)
            if active_count >= self.max_concurrent_workflows:
                return f"degraded: workflow capacity full ({active_count}/{self.max_concurrent_workflows})"
            
            return "healthy"
            
        except Exception as e:
            return f"unhealthy: {str(e)}"
    
    async def cleanup(self):
        """Cleanup resources"""
        # Cancel active workflows
        for workflow_id in list(self.active_workflows.keys()):
            await self._cancel_workflow({"parameters": {"workflow_id": workflow_id}})
        
        # Cleanup base service
        await self.codegen_service.cleanup()
        
        logger.info("Enhanced codegen adapter cleanup completed")
    
    # ============================================================================
    # WORKFLOW-AWARE AGENT RUNS
    # ============================================================================
    
    async def _create_workflow_run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a workflow-aware agent run"""
        parameters = context.get("parameters", {})
        
        prompt = parameters.get("prompt")
        workflow_context = parameters.get("workflow_context")
        component_integration = parameters.get("component_integration", {})
        
        if not prompt:
            raise Exception("prompt parameter required")
        
        if not workflow_context:
            raise Exception("workflow_context parameter required")
        
        try:
            # Create workflow context
            wf_context = WorkflowContext(**workflow_context)
            self.workflow_contexts[wf_context.execution_id] = wf_context
            
            # Enhance prompt with workflow context
            enhanced_prompt = await self._enhance_prompt_with_context(prompt, wf_context, component_integration)
            
            # Create agent run with enhanced context
            agent_run_request = {
                "prompt": enhanced_prompt,
                "context": {
                    "workflow_id": wf_context.workflow_id,
                    "execution_id": wf_context.execution_id,
                    "shared_state": wf_context.shared_state,
                    "component_results": wf_context.component_results
                },
                "metadata": {
                    "workflow_aware": True,
                    "library_kit_integration": True,
                    **wf_context.metadata
                }
            }
            
            # Delegate to base codegen service
            result = await self.codegen_service.create_agent_run(agent_run_request)
            
            # Publish workflow event
            await self.event_bus.publish(Event(
                event_type=EventTypes.AGENT_RUN_STARTED,
                source_component="enhanced_codegen",
                payload={
                    "agent_run_id": result.get("run_id"),
                    "workflow_id": wf_context.workflow_id,
                    "execution_id": wf_context.execution_id,
                    "workflow_aware": True
                },
                workflow_id=wf_context.workflow_id
            ))
            
            return {
                **result,
                "workflow_context": wf_context.to_dict(),
                "enhanced_features": {
                    "workflow_aware": True,
                    "component_integration": bool(component_integration),
                    "shared_context": True
                }
            }
            
        except Exception as e:
            logger.error(f"Workflow-aware agent run creation failed: {e}")
            raise Exception(f"Workflow-aware agent run creation failed: {e}")
    
    async def _execute_multi_step_workflow(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a multi-step agent workflow"""
        parameters = context.get("parameters", {})
        
        workflow_definition = parameters.get("workflow")
        workflow_context = parameters.get("workflow_context")
        
        if not workflow_definition:
            raise Exception("workflow parameter required")
        
        if not workflow_context:
            raise Exception("workflow_context parameter required")
        
        async with self.workflow_semaphore:
            try:
                # Create workflow and context
                workflow = MultiStepWorkflow(**workflow_definition)
                wf_context = WorkflowContext(**workflow_context)
                
                self.active_workflows[workflow.workflow_id] = workflow
                self.workflow_contexts[wf_context.execution_id] = wf_context
                
                # Publish workflow started event
                await self.event_bus.publish(Event(
                    event_type=EventTypes.WORKFLOW_STARTED,
                    source_component="enhanced_codegen",
                    payload={
                        "workflow_id": workflow.workflow_id,
                        "execution_id": wf_context.execution_id,
                        "step_count": len(workflow.steps),
                        "parallel_execution": workflow.parallel_execution
                    },
                    workflow_id=workflow.workflow_id
                ))
                
                # Execute workflow steps
                if workflow.parallel_execution:
                    results = await self._execute_steps_parallel(workflow, wf_context)
                else:
                    results = await self._execute_steps_sequential(workflow, wf_context)
                
                # Cleanup
                del self.active_workflows[workflow.workflow_id]
                
                # Publish workflow completed event
                await self.event_bus.publish(Event(
                    event_type=EventTypes.WORKFLOW_COMPLETED,
                    source_component="enhanced_codegen",
                    payload={
                        "workflow_id": workflow.workflow_id,
                        "execution_id": wf_context.execution_id,
                        "results": results,
                        "success": True
                    },
                    workflow_id=workflow.workflow_id
                ))
                
                return {
                    "workflow_id": workflow.workflow_id,
                    "execution_id": wf_context.execution_id,
                    "status": "completed",
                    "results": results,
                    "workflow_context": wf_context.to_dict()
                }
                
            except Exception as e:
                # Cleanup on error
                if workflow.workflow_id in self.active_workflows:
                    del self.active_workflows[workflow.workflow_id]
                
                # Publish workflow failed event
                await self.event_bus.publish(Event(
                    event_type=EventTypes.WORKFLOW_FAILED,
                    source_component="enhanced_codegen",
                    payload={
                        "workflow_id": workflow.workflow_id,
                        "execution_id": wf_context.execution_id,
                        "error": str(e)
                    },
                    workflow_id=workflow.workflow_id
                ))
                
                logger.error(f"Multi-step workflow execution failed: {e}")
                raise Exception(f"Multi-step workflow execution failed: {e}")
    
    # ============================================================================
    # CONTEXT MANAGEMENT
    # ============================================================================
    
    async def _create_shared_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create shared context for workflow"""
        parameters = context.get("parameters", {})
        
        workflow_id = parameters.get("workflow_id")
        execution_id = parameters.get("execution_id") or str(uuid.uuid4())
        user_id = parameters.get("user_id")
        organization_id = parameters.get("organization_id")
        initial_state = parameters.get("initial_state", {})
        
        if not workflow_id or not user_id or organization_id is None:
            raise Exception("workflow_id, user_id, and organization_id parameters required")
        
        wf_context = WorkflowContext(
            workflow_id=workflow_id,
            execution_id=execution_id,
            user_id=user_id,
            organization_id=organization_id,
            shared_state=initial_state
        )
        
        self.workflow_contexts[execution_id] = wf_context
        
        return {
            "execution_id": execution_id,
            "workflow_context": wf_context.to_dict(),
            "created_at": datetime.utcnow().isoformat()
        }
    
    async def _update_shared_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Update shared context"""
        parameters = context.get("parameters", {})
        
        execution_id = parameters.get("execution_id")
        updates = parameters.get("updates", {})
        merge_strategy = parameters.get("merge_strategy", "update")  # update, replace, merge
        
        if not execution_id:
            raise Exception("execution_id parameter required")
        
        if execution_id not in self.workflow_contexts:
            raise Exception(f"Workflow context not found: {execution_id}")
        
        wf_context = self.workflow_contexts[execution_id]
        
        if merge_strategy == "replace":
            wf_context.shared_state = updates
        elif merge_strategy == "merge":
            wf_context.shared_state.update(updates)
        else:  # update
            for key, value in updates.items():
                if isinstance(value, dict) and key in wf_context.shared_state:
                    wf_context.shared_state[key].update(value)
                else:
                    wf_context.shared_state[key] = value
        
        return {
            "execution_id": execution_id,
            "workflow_context": wf_context.to_dict(),
            "updated_at": datetime.utcnow().isoformat()
        }
    
    async def _get_shared_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get shared context"""
        parameters = context.get("parameters", {})
        
        execution_id = parameters.get("execution_id")
        
        if not execution_id:
            raise Exception("execution_id parameter required")
        
        if execution_id not in self.workflow_contexts:
            raise Exception(f"Workflow context not found: {execution_id}")
        
        wf_context = self.workflow_contexts[execution_id]
        
        return {
            "execution_id": execution_id,
            "workflow_context": wf_context.to_dict()
        }
    
    async def _merge_component_results(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Merge results from other components into shared context"""
        parameters = context.get("parameters", {})
        
        execution_id = parameters.get("execution_id")
        component_name = parameters.get("component_name")
        results = parameters.get("results")
        
        if not execution_id or not component_name or not results:
            raise Exception("execution_id, component_name, and results parameters required")
        
        if execution_id not in self.workflow_contexts:
            raise Exception(f"Workflow context not found: {execution_id}")
        
        wf_context = self.workflow_contexts[execution_id]
        wf_context.component_results[component_name] = {
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "execution_id": execution_id,
            "component_name": component_name,
            "merged_at": datetime.utcnow().isoformat(),
            "workflow_context": wf_context.to_dict()
        }
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    async def _enhance_prompt_with_context(
        self, 
        prompt: str, 
        wf_context: WorkflowContext, 
        component_integration: Dict[str, Any]
    ) -> str:
        """Enhance prompt with workflow context and component results"""
        
        context_sections = []
        
        # Add workflow context
        if wf_context.shared_state:
            context_sections.append(f"## Workflow Context\n{json.dumps(wf_context.shared_state, indent=2)}")
        
        # Add component results
        if wf_context.component_results:
            context_sections.append("## Component Results")
            for component, result_data in wf_context.component_results.items():
                context_sections.append(f"### {component}\n{json.dumps(result_data['results'], indent=2)}")
        
        # Add component integration instructions
        if component_integration:
            context_sections.append("## Component Integration")
            for component, instructions in component_integration.items():
                context_sections.append(f"### {component}\n{instructions}")
        
        # Combine with original prompt
        if context_sections:
            enhanced_prompt = f"{prompt}\n\n" + "\n\n".join(context_sections)
        else:
            enhanced_prompt = prompt
        
        return enhanced_prompt
    
    async def _execute_steps_sequential(
        self, 
        workflow: MultiStepWorkflow, 
        wf_context: WorkflowContext
    ) -> Dict[str, Any]:
        """Execute workflow steps sequentially"""
        
        step_results = {}
        
        for step in workflow.steps:
            try:
                # Check dependencies
                if not await self._check_step_dependencies(step, step_results):
                    if workflow.failure_strategy == "stop":
                        raise Exception(f"Step dependencies not met: {step.step_id}")
                    elif workflow.failure_strategy == "continue":
                        continue
                
                # Execute step
                result = await self._execute_workflow_step(step, wf_context, step_results)
                step_results[step.step_id] = result
                
                # Publish step completed event
                await self.event_bus.publish(Event(
                    event_type=EventTypes.WORKFLOW_STEP_COMPLETED,
                    source_component="enhanced_codegen",
                    payload={
                        "workflow_id": workflow.workflow_id,
                        "step_id": step.step_id,
                        "step_name": step.step_name,
                        "result": result
                    },
                    workflow_id=workflow.workflow_id
                ))
                
            except Exception as e:
                logger.error(f"Step {step.step_id} failed: {e}")
                
                if workflow.failure_strategy == "stop":
                    raise
                elif workflow.failure_strategy == "retry" and step.retry_count < step.max_retries:
                    step.retry_count += 1
                    # Retry the step (would need to implement retry logic)
                    continue
                else:
                    step_results[step.step_id] = {"error": str(e), "failed": True}
        
        return step_results
    
    async def _execute_steps_parallel(
        self, 
        workflow: MultiStepWorkflow, 
        wf_context: WorkflowContext
    ) -> Dict[str, Any]:
        """Execute workflow steps in parallel"""
        
        # Create tasks for all steps
        tasks = []
        for step in workflow.steps:
            task = asyncio.create_task(
                self._execute_workflow_step_with_deps(step, wf_context, workflow)
            )
            tasks.append((step.step_id, task))
        
        # Wait for all tasks to complete
        step_results = {}
        for step_id, task in tasks:
            try:
                result = await task
                step_results[step_id] = result
            except Exception as e:
                logger.error(f"Parallel step {step_id} failed: {e}")
                if workflow.failure_strategy == "stop":
                    # Cancel remaining tasks
                    for _, remaining_task in tasks:
                        if not remaining_task.done():
                            remaining_task.cancel()
                    raise
                else:
                    step_results[step_id] = {"error": str(e), "failed": True}
        
        return step_results
    
    async def _execute_workflow_step(
        self, 
        step: AgentStep, 
        wf_context: WorkflowContext, 
        previous_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single workflow step"""
        
        # Enhance step prompt with context
        enhanced_prompt = await self._enhance_step_prompt(step, wf_context, previous_results)
        
        # Create agent run for this step
        agent_run_request = {
            "prompt": enhanced_prompt,
            "context": {
                "workflow_id": wf_context.workflow_id,
                "execution_id": wf_context.execution_id,
                "step_id": step.step_id,
                "step_context": step.context,
                "previous_results": previous_results
            },
            "timeout": step.timeout or self.default_timeout
        }
        
        # Execute agent run
        result = await self.codegen_service.create_agent_run(agent_run_request)
        
        return {
            "agent_run_id": result.get("run_id"),
            "step_id": step.step_id,
            "step_name": step.step_name,
            "result": result,
            "completed_at": datetime.utcnow().isoformat()
        }
    
    async def _enhance_step_prompt(
        self, 
        step: AgentStep, 
        wf_context: WorkflowContext, 
        previous_results: Dict[str, Any]
    ) -> str:
        """Enhance step prompt with context and previous results"""
        
        context_sections = [step.prompt]
        
        # Add step context
        if step.context:
            context_sections.append(f"## Step Context\n{json.dumps(step.context, indent=2)}")
        
        # Add workflow context
        if wf_context.shared_state:
            context_sections.append(f"## Workflow State\n{json.dumps(wf_context.shared_state, indent=2)}")
        
        # Add previous step results
        if previous_results:
            context_sections.append("## Previous Step Results")
            for step_id, result in previous_results.items():
                if step_id in step.dependencies:
                    context_sections.append(f"### {step_id}\n{json.dumps(result, indent=2)}")
        
        return "\n\n".join(context_sections)
    
    async def _check_step_dependencies(self, step: AgentStep, step_results: Dict[str, Any]) -> bool:
        """Check if step dependencies are satisfied"""
        for dep_step_id in step.dependencies:
            if dep_step_id not in step_results:
                return False
            if step_results[dep_step_id].get("failed", False):
                return False
        return True
    
    async def _delegate_to_codegen(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Delegate action to base codegen service"""
        action = context.get("action")
        parameters = context.get("parameters", {})
        
        # Map action to codegen service method
        method_map = {
            "create_agent_run": "create_agent_run",
            "get_agent_run": "get_agent_run", 
            "list_agent_runs": "list_agent_runs",
            "resume_agent_run": "resume_agent_run",
            "get_current_user": "get_current_user_info",
            "get_organizations": "get_organizations",
            "get_agent_run_logs": "get_agent_run_logs"
        }
        
        method_name = method_map.get(action)
        if not method_name:
            raise Exception(f"Unknown codegen action: {action}")
        
        method = getattr(self.codegen_service, method_name)
        return await method(parameters)
    
    # Additional integration methods would be implemented here...
    async def _trigger_code_analysis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger code analysis integration"""
        # Implementation would integrate with graph-sitter adapter
        pass
    
    async def _trigger_web_evaluation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger web evaluation integration"""
        # Implementation would integrate with web-eval-agent adapter
        pass
    
    async def _trigger_sandbox_deployment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger sandbox deployment integration"""
        # Implementation would integrate with grainchain adapter
        pass
