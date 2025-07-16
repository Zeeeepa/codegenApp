"""
Workflow orchestration engine for CI/CD flow management.

Coordinates agent runs, validation pipelines, and external service
integrations within the CI/CD workflow system.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models import (
    Project, AgentRun, AgentRunStatus, ResponseType, ValidationPipeline,
    ValidationStatus, AuditLog, AuditAction
)
from ..database.connection import get_database_session
from ..services.codegen_service import CodegenService
from ..services.github_service import GitHubService
from .state_manager import StateManager
from ..websocket.connection_manager import ConnectionManager


class WorkflowEngine:
    """
    Main workflow orchestration engine.
    
    Manages the complete CI/CD workflow from agent runs through
    validation pipelines to deployment and merge decisions.
    """
    
    def __init__(self):
        self.codegen_service = CodegenService()
        self.github_service = GitHubService()
        self.state_manager = StateManager()
        self.connection_manager = ConnectionManager()
        self._running_workflows: Dict[str, asyncio.Task] = {}
    
    async def start_agent_run(
        self,
        project_id: str,
        target_text: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start a new agent run workflow.
        
        Args:
            project_id: ID of the project
            target_text: User's target/goal input
            user_id: ID of the user starting the run (optional)
            session_id: Session ID for tracking (optional)
            
        Returns:
            dict: Agent run details and status
        """
        run_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            # Validate project exists
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # Create agent run record
            agent_run = AgentRun(
                id=run_id,
                project_id=project_id,
                target_text=target_text,
                context_prompt=f"<Project='{project.name}'> {target_text}",
                status=AgentRunStatus.PENDING,
                session_id=session_id or str(uuid.uuid4()),
                created_at=datetime.utcnow()
            )
            
            db.add(agent_run)
            db.commit()
            
            # Create audit log
            audit_log = AuditLog.create_log(
                action=AuditAction.AGENT_RUN_STARTED,
                description=f"Started agent run for project {project.name}",
                entity_type="agent_run",
                entity_id=run_id,
                project_id=project_id,
                user_id=user_id,
                metadata={"target_text": target_text}
            )
            db.add(audit_log)
            db.commit()
        
        # Start async workflow
        task = asyncio.create_task(self._execute_agent_run(run_id))
        self._running_workflows[run_id] = task
        
        # Notify connected clients
        await self.connection_manager.broadcast_to_project(
            project_id,
            {
                "type": "agent_run_started",
                "run_id": run_id,
                "status": "pending",
                "target_text": target_text
            }
        )
        
        return {
            "run_id": run_id,
            "project_id": project_id,
            "status": "pending",
            "target_text": target_text,
            "created_at": datetime.utcnow().isoformat()
        }
    
    async def continue_agent_run(
        self,
        run_id: str,
        continuation_text: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Continue an existing agent run with additional input.
        
        Args:
            run_id: ID of the agent run to continue
            continuation_text: Additional user input
            user_id: ID of the user continuing the run (optional)
            
        Returns:
            dict: Updated agent run status
        """
        with next(get_database_session()) as db:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                raise ValueError(f"Agent run {run_id} not found")
            
            if agent_run.status != AgentRunStatus.WAITING_INPUT:
                raise ValueError(f"Agent run {run_id} is not waiting for input")
            
            # Update agent run with continuation
            agent_run.status = AgentRunStatus.RUNNING
            agent_run.updated_at = datetime.utcnow()
            
            # Add continuation context
            if not agent_run.continuation_context:
                agent_run.continuation_context = {}
            agent_run.continuation_context["continuation_text"] = continuation_text
            agent_run.continuation_context["continued_at"] = datetime.utcnow().isoformat()
            
            db.commit()
            
            # Create audit log
            audit_log = AuditLog.create_log(
                action=AuditAction.AGENT_RUN_CONTINUED,
                description=f"Continued agent run with additional input",
                entity_type="agent_run",
                entity_id=run_id,
                project_id=agent_run.project_id,
                user_id=user_id,
                metadata={"continuation_text": continuation_text}
            )
            db.add(audit_log)
            db.commit()
        
        # Resume workflow execution
        if run_id in self._running_workflows:
            # Cancel existing task and start new one
            self._running_workflows[run_id].cancel()
        
        task = asyncio.create_task(self._continue_agent_execution(run_id, continuation_text))
        self._running_workflows[run_id] = task
        
        return {"run_id": run_id, "status": "running", "continued": True}
    
    async def handle_plan_response(
        self,
        run_id: str,
        action: str,  # "confirm" or "modify"
        modification_text: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle user response to a plan-type agent response.
        
        Args:
            run_id: ID of the agent run
            action: User action ("confirm" or "modify")
            modification_text: Modification text if action is "modify"
            user_id: ID of the user responding (optional)
            
        Returns:
            dict: Updated agent run status
        """
        with next(get_database_session()) as db:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                raise ValueError(f"Agent run {run_id} not found")
            
            if agent_run.response_type != ResponseType.PLAN:
                raise ValueError(f"Agent run {run_id} is not a plan response")
            
            # Prepare response based on action
            if action == "confirm":
                response_text = "Proceed"
            elif action == "modify":
                if not modification_text:
                    raise ValueError("Modification text required for modify action")
                response_text = modification_text
            else:
                raise ValueError(f"Invalid action: {action}")
            
            # Update agent run status
            agent_run.status = AgentRunStatus.RUNNING
            agent_run.updated_at = datetime.utcnow()
            
            # Store plan response context
            if not agent_run.continuation_context:
                agent_run.continuation_context = {}
            agent_run.continuation_context["plan_action"] = action
            agent_run.continuation_context["plan_response"] = response_text
            agent_run.continuation_context["responded_at"] = datetime.utcnow().isoformat()
            
            db.commit()
        
        # Continue execution with plan response
        task = asyncio.create_task(self._continue_agent_execution(run_id, response_text))
        self._running_workflows[run_id] = task
        
        return {"run_id": run_id, "status": "running", "plan_action": action}
    
    async def trigger_validation_pipeline(
        self,
        project_id: str,
        pull_request_id: str,
        agent_run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trigger validation pipeline for a pull request.
        
        Args:
            project_id: ID of the project
            pull_request_id: ID of the pull request
            agent_run_id: ID of the associated agent run (optional)
            
        Returns:
            dict: Validation pipeline details
        """
        from ..validation.pipeline_coordinator import PipelineCoordinator
        
        pipeline_id = str(uuid.uuid4())
        coordinator = PipelineCoordinator()
        
        # Start validation pipeline
        result = await coordinator.start_validation(
            pipeline_id=pipeline_id,
            project_id=project_id,
            pull_request_id=pull_request_id,
            agent_run_id=agent_run_id
        )
        
        # Notify connected clients
        await self.connection_manager.broadcast_to_project(
            project_id,
            {
                "type": "validation_started",
                "pipeline_id": pipeline_id,
                "pull_request_id": pull_request_id,
                "status": "running"
            }
        )
        
        return result
    
    async def _execute_agent_run(self, run_id: str):
        """
        Execute agent run workflow.
        
        Args:
            run_id: ID of the agent run to execute
        """
        try:
            with next(get_database_session()) as db:
                agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
                if not agent_run:
                    return
                
                # Update status to running
                agent_run.status = AgentRunStatus.RUNNING
                agent_run.started_at = datetime.utcnow()
                agent_run.progress_percentage = 10
                db.commit()
                
                # Notify progress
                await self.connection_manager.broadcast_to_project(
                    agent_run.project_id,
                    {
                        "type": "agent_run_progress",
                        "run_id": run_id,
                        "status": "running",
                        "progress": 10
                    }
                )
            
            # Execute agent run via Codegen service
            response = await self.codegen_service.execute_agent_run(
                context_prompt=agent_run.context_prompt,
                project_id=agent_run.project_id,
                run_id=run_id
            )
            
            # Process response
            await self._process_agent_response(run_id, response)
            
        except Exception as e:
            await self._handle_agent_run_error(run_id, str(e))
        finally:
            # Clean up workflow tracking
            if run_id in self._running_workflows:
                del self._running_workflows[run_id]
    
    async def _continue_agent_execution(self, run_id: str, continuation_text: str):
        """
        Continue agent execution with additional input.
        
        Args:
            run_id: ID of the agent run
            continuation_text: Additional input text
        """
        try:
            # Continue execution via Codegen service
            response = await self.codegen_service.continue_agent_run(
                run_id=run_id,
                continuation_text=continuation_text
            )
            
            # Process response
            await self._process_agent_response(run_id, response)
            
        except Exception as e:
            await self._handle_agent_run_error(run_id, str(e))
        finally:
            # Clean up workflow tracking
            if run_id in self._running_workflows:
                del self._running_workflows[run_id]
    
    async def _process_agent_response(self, run_id: str, response: Dict[str, Any]):
        """
        Process agent response and determine next actions.
        
        Args:
            run_id: ID of the agent run
            response: Agent response data
        """
        with next(get_database_session()) as db:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                return
            
            # Determine response type
            response_type = self._determine_response_type(response)
            
            # Update agent run with response
            agent_run.response_type = response_type
            agent_run.response_data = response
            agent_run.progress_percentage = 90
            agent_run.updated_at = datetime.utcnow()
            
            if response_type == ResponseType.PR:
                # PR created - trigger validation
                agent_run.status = AgentRunStatus.COMPLETED
                agent_run.completed_at = datetime.utcnow()
                
                # Extract PR information and trigger validation
                pr_url = response.get("pr_url")
                if pr_url:
                    await self._handle_pr_created(agent_run.project_id, pr_url, run_id)
                
            elif response_type == ResponseType.PLAN:
                # Plan response - wait for user input
                agent_run.status = AgentRunStatus.WAITING_INPUT
                
            else:
                # Regular response - completed
                agent_run.status = AgentRunStatus.COMPLETED
                agent_run.completed_at = datetime.utcnow()
            
            agent_run.progress_percentage = 100
            db.commit()
            
            # Notify connected clients
            await self.connection_manager.broadcast_to_project(
                agent_run.project_id,
                {
                    "type": "agent_run_completed",
                    "run_id": run_id,
                    "status": agent_run.status.value,
                    "response_type": response_type.value,
                    "response_data": response
                }
            )
    
    async def _handle_agent_run_error(self, run_id: str, error_message: str):
        """
        Handle agent run errors.
        
        Args:
            run_id: ID of the failed agent run
            error_message: Error message
        """
        with next(get_database_session()) as db:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                return
            
            agent_run.status = AgentRunStatus.FAILED
            agent_run.error_message = error_message
            agent_run.completed_at = datetime.utcnow()
            agent_run.retry_count += 1
            
            db.commit()
            
            # Create audit log
            audit_log = AuditLog.create_log(
                action=AuditAction.AGENT_RUN_FAILED,
                description=f"Agent run failed: {error_message}",
                entity_type="agent_run",
                entity_id=run_id,
                project_id=agent_run.project_id,
                error_message=error_message
            )
            db.add(audit_log)
            db.commit()
            
            # Notify connected clients
            await self.connection_manager.broadcast_to_project(
                agent_run.project_id,
                {
                    "type": "agent_run_failed",
                    "run_id": run_id,
                    "error_message": error_message,
                    "can_retry": agent_run.can_retry()
                }
            )
    
    def _determine_response_type(self, response: Dict[str, Any]) -> ResponseType:
        """
        Determine the type of agent response.
        
        Args:
            response: Agent response data
            
        Returns:
            ResponseType: Determined response type
        """
        # Check for PR creation indicators
        if "pr_url" in response or "pull_request" in response:
            return ResponseType.PR
        
        # Check for plan indicators
        if "plan" in response or "confirm" in response.get("actions", []):
            return ResponseType.PLAN
        
        # Default to regular response
        return ResponseType.REGULAR
    
    async def _handle_pr_created(self, project_id: str, pr_url: str, agent_run_id: str):
        """
        Handle PR creation and trigger validation.
        
        Args:
            project_id: ID of the project
            pr_url: URL of the created PR
            agent_run_id: ID of the agent run that created the PR
        """
        # Extract PR ID from URL and trigger validation
        pr_id = self.github_service.extract_pr_id_from_url(pr_url)
        if pr_id:
            await self.trigger_validation_pipeline(
                project_id=project_id,
                pull_request_id=pr_id,
                agent_run_id=agent_run_id
            )
    
    async def get_workflow_status(self, run_id: str) -> Dict[str, Any]:
        """
        Get current workflow status.
        
        Args:
            run_id: ID of the workflow/agent run
            
        Returns:
            dict: Current workflow status
        """
        with next(get_database_session()) as db:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                raise ValueError(f"Agent run {run_id} not found")
            
            return {
                "run_id": run_id,
                "status": agent_run.status.value,
                "progress": agent_run.progress_percentage,
                "response_type": agent_run.response_type.value if agent_run.response_type else None,
                "error_message": agent_run.error_message,
                "can_retry": agent_run.can_retry(),
                "is_running": run_id in self._running_workflows
            }
    
    async def cancel_workflow(self, run_id: str) -> bool:
        """
        Cancel a running workflow.
        
        Args:
            run_id: ID of the workflow to cancel
            
        Returns:
            bool: True if cancelled successfully
        """
        if run_id in self._running_workflows:
            self._running_workflows[run_id].cancel()
            del self._running_workflows[run_id]
            
            # Update database
            with next(get_database_session()) as db:
                agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
                if agent_run:
                    agent_run.status = AgentRunStatus.CANCELLED
                    agent_run.completed_at = datetime.utcnow()
                    db.commit()
            
            return True
        
        return False

