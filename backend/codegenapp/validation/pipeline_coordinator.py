"""
Validation pipeline coordinator.

Orchestrates the complete validation pipeline from snapshot creation
through deployment testing and final approval decisions.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from ..models import (
    ValidationPipeline, ValidationStep, ValidationStatus, ValidationStepType,
    ValidationResult, Project, PullRequest, AuditLog, AuditAction
)
from ..database.connection import get_database_session
from ..orchestration.state_manager import StateManager
from ..websocket.connection_manager import ConnectionManager
from .snapshot_manager import SnapshotManager
from .deployment_orchestrator import DeploymentOrchestrator
from ..services.web_eval_service import WebEvalService


class PipelineCoordinator:
    """
    Coordinates validation pipeline execution.
    
    Manages the complete validation workflow including snapshot creation,
    deployment, testing, and cleanup operations.
    """
    
    def __init__(self):
        self.state_manager = StateManager()
        self.connection_manager = ConnectionManager()
        self.snapshot_manager = SnapshotManager()
        self.deployment_orchestrator = DeploymentOrchestrator()
        self.web_eval_service = WebEvalService()
        self._running_pipelines: Dict[str, asyncio.Task] = {}
    
    async def start_validation(
        self,
        pipeline_id: str,
        project_id: str,
        pull_request_id: str,
        agent_run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start a new validation pipeline.
        
        Args:
            pipeline_id: ID of the validation pipeline
            project_id: ID of the project
            pull_request_id: ID of the pull request
            agent_run_id: ID of the associated agent run (optional)
            
        Returns:
            dict: Validation pipeline details
        """
        with next(get_database_session()) as db:
            # Validate project exists
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # Create validation pipeline record
            pipeline = ValidationPipeline(
                id=pipeline_id,
                project_id=project_id,
                agent_run_id=agent_run_id,
                pull_request_id=pull_request_id,
                status=ValidationStatus.PENDING,
                pipeline_config={
                    "timeout_minutes": project.settings.validation_settings.get("timeout_minutes", 30) if project.settings else 30,
                    "max_retries": project.settings.validation_settings.get("max_retries", 3) if project.settings else 3,
                    "required_steps": ["snapshot_creation", "codebase_clone", "deployment", "health_check", "web_evaluation"],
                    "optional_steps": ["code_analysis", "security_scan"]
                },
                created_at=datetime.utcnow()
            )
            
            db.add(pipeline)
            db.commit()
            
            # Create audit log
            audit_log = AuditLog.create_log(
                action=AuditAction.VALIDATION_STARTED,
                description=f"Started validation pipeline for PR {pull_request_id}",
                entity_type="validation_pipeline",
                entity_id=pipeline_id,
                project_id=project_id,
                metadata={
                    "pull_request_id": pull_request_id,
                    "agent_run_id": agent_run_id
                }
            )
            db.add(audit_log)
            db.commit()
        
        # Update state manager
        self.state_manager.add_active_validation(project_id, pipeline_id)
        
        # Start async pipeline execution
        task = asyncio.create_task(self._execute_pipeline(pipeline_id))
        self._running_pipelines[pipeline_id] = task
        
        return {
            "pipeline_id": pipeline_id,
            "project_id": project_id,
            "pull_request_id": pull_request_id,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
    
    async def _execute_pipeline(self, pipeline_id: str):
        """
        Execute the complete validation pipeline.
        
        Args:
            pipeline_id: ID of the validation pipeline
        """
        try:
            with next(get_database_session()) as db:
                pipeline = db.query(ValidationPipeline).filter(
                    ValidationPipeline.id == pipeline_id
                ).first()
                
                if not pipeline:
                    return
                
                # Update status to running
                pipeline.status = ValidationStatus.RUNNING
                pipeline.started_at = datetime.utcnow()
                db.commit()
                
                # Notify progress
                await self.connection_manager.broadcast_to_project(
                    pipeline.project_id,
                    {
                        "type": "validation_progress",
                        "pipeline_id": pipeline_id,
                        "status": "running",
                        "progress": 5
                    }
                )
            
            # Execute pipeline steps
            steps = [
                ("snapshot_creation", self._create_snapshot),
                ("codebase_clone", self._clone_codebase),
                ("deployment", self._deploy_application),
                ("health_check", self._check_deployment_health),
                ("web_evaluation", self._run_web_evaluation),
                ("cleanup", self._cleanup_resources)
            ]
            
            total_steps = len(steps)
            completed_steps = 0
            
            for step_name, step_function in steps:
                try:
                    # Execute step
                    step_result = await step_function(pipeline_id)
                    completed_steps += 1
                    
                    # Update progress
                    progress = int((completed_steps / total_steps) * 100)
                    await self._update_pipeline_progress(pipeline_id, progress, step_name)
                    
                    # Check if step failed
                    if not step_result.get("success", False):
                        await self._handle_step_failure(pipeline_id, step_name, step_result)
                        return
                        
                except Exception as e:
                    await self._handle_step_error(pipeline_id, step_name, str(e))
                    return
            
            # Pipeline completed successfully
            await self._complete_pipeline(pipeline_id, ValidationResult.SUCCESS)
            
        except Exception as e:
            await self._handle_pipeline_error(pipeline_id, str(e))
        finally:
            # Clean up pipeline tracking
            if pipeline_id in self._running_pipelines:
                del self._running_pipelines[pipeline_id]
    
    async def _create_snapshot(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Create isolated snapshot environment.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Snapshot creation result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.SNAPSHOT_CREATION,
                step_name="Create Snapshot Environment",
                execution_order=1,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Create snapshot via snapshot manager
            snapshot_result = await self.snapshot_manager.create_snapshot(
                pipeline_id=pipeline_id,
                project_id=pipeline.project_id
            )
            
            # Update step with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS
                step.completed_at = datetime.utcnow()
                step.artifacts = snapshot_result
                
                # Update pipeline with snapshot ID
                pipeline = db.query(ValidationPipeline).filter(
                    ValidationPipeline.id == pipeline_id
                ).first()
                pipeline.snapshot_id = snapshot_result.get("snapshot_id")
                
                db.commit()
            
            return {"success": True, "snapshot_id": snapshot_result.get("snapshot_id")}
            
        except Exception as e:
            # Update step with error
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.FAILURE
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def _clone_codebase(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Clone PR codebase into snapshot environment.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Codebase cloning result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.CODEBASE_CLONE,
                step_name="Clone PR Codebase",
                execution_order=2,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Clone codebase via snapshot manager
            clone_result = await self.snapshot_manager.clone_pr_codebase(
                snapshot_id=pipeline.snapshot_id,
                pull_request_id=pipeline.pull_request_id
            )
            
            # Update step with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS
                step.completed_at = datetime.utcnow()
                step.artifacts = clone_result
                db.commit()
            
            return {"success": True, "clone_path": clone_result.get("clone_path")}
            
        except Exception as e:
            # Update step with error
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.FAILURE
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def _deploy_application(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Deploy application using configured deployment commands.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Deployment result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.DEPLOYMENT,
                step_name="Deploy Application",
                execution_order=3,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Deploy via deployment orchestrator
            deploy_result = await self.deployment_orchestrator.deploy_application(
                snapshot_id=pipeline.snapshot_id,
                project_id=pipeline.project_id
            )
            
            # Update step and pipeline with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS
                step.completed_at = datetime.utcnow()
                step.artifacts = deploy_result
                step.command_executed = deploy_result.get("commands_executed", [])
                
                # Update pipeline with deployment URL
                pipeline = db.query(ValidationPipeline).filter(
                    ValidationPipeline.id == pipeline_id
                ).first()
                pipeline.deployment_url = deploy_result.get("deployment_url")
                
                db.commit()
            
            return {"success": True, "deployment_url": deploy_result.get("deployment_url")}
            
        except Exception as e:
            # Update step with error
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.FAILURE
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def _check_deployment_health(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Check deployment health and validate successful deployment.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Health check result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.HEALTH_CHECK,
                step_name="Health Check",
                execution_order=4,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Perform health check
            health_result = await self.deployment_orchestrator.check_deployment_health(
                deployment_url=pipeline.deployment_url
            )
            
            # Update step with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS if health_result.get("healthy") else ValidationResult.FAILURE
                step.completed_at = datetime.utcnow()
                step.artifacts = health_result
                db.commit()
            
            return {"success": health_result.get("healthy", False), "health_data": health_result}
            
        except Exception as e:
            # Update step with error
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.FAILURE
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def _run_web_evaluation(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Run comprehensive web evaluation tests.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Web evaluation result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.WEB_EVALUATION,
                step_name="Web Evaluation Testing",
                execution_order=5,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Run web evaluation
            eval_result = await self.web_eval_service.evaluate_deployment(
                deployment_url=pipeline.deployment_url,
                project_id=pipeline.project_id
            )
            
            # Update step with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS if eval_result.get("passed") else ValidationResult.FAILURE
                step.completed_at = datetime.utcnow()
                step.artifacts = eval_result
                db.commit()
            
            return {"success": eval_result.get("passed", False), "evaluation_data": eval_result}
            
        except Exception as e:
            # Update step with error
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.FAILURE
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def _cleanup_resources(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Clean up validation resources.
        
        Args:
            pipeline_id: ID of the validation pipeline
            
        Returns:
            dict: Cleanup result
        """
        step_id = str(uuid.uuid4())
        
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            # Create step record
            step = ValidationStep(
                id=step_id,
                pipeline_id=pipeline_id,
                step_type=ValidationStepType.CLEANUP,
                step_name="Resource Cleanup",
                execution_order=6,
                status=ValidationStatus.RUNNING,
                started_at=datetime.utcnow()
            )
            db.add(step)
            db.commit()
        
        try:
            # Cleanup via snapshot manager
            cleanup_result = await self.snapshot_manager.cleanup_snapshot(
                snapshot_id=pipeline.snapshot_id
            )
            
            # Update step with results
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.COMPLETED
                step.result = ValidationResult.SUCCESS
                step.completed_at = datetime.utcnow()
                step.artifacts = cleanup_result
                db.commit()
            
            return {"success": True, "cleanup_data": cleanup_result}
            
        except Exception as e:
            # Update step with error (but don't fail pipeline)
            with next(get_database_session()) as db:
                step = db.query(ValidationStep).filter(ValidationStep.id == step_id).first()
                step.status = ValidationStatus.FAILED
                step.result = ValidationResult.WARNING  # Warning, not failure
                step.error_logs = str(e)
                step.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": True, "warning": str(e)}  # Don't fail pipeline for cleanup issues
    
    async def _update_pipeline_progress(self, pipeline_id: str, progress: int, current_step: str):
        """Update pipeline progress and notify clients."""
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            if pipeline:
                pipeline.progress_percentage = progress
                pipeline.current_step = current_step
                db.commit()
                
                # Notify connected clients
                await self.connection_manager.broadcast_to_project(
                    pipeline.project_id,
                    {
                        "type": "validation_progress",
                        "pipeline_id": pipeline_id,
                        "progress": progress,
                        "current_step": current_step
                    }
                )
    
    async def _complete_pipeline(self, pipeline_id: str, result: ValidationResult):
        """Complete the validation pipeline."""
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            if pipeline:
                pipeline.status = ValidationStatus.COMPLETED
                pipeline.overall_result = result
                pipeline.completed_at = datetime.utcnow()
                pipeline.progress_percentage = 100
                db.commit()
                
                # Update state manager
                self.state_manager.remove_active_validation(pipeline.project_id, pipeline_id)
                
                # Notify connected clients
                await self.connection_manager.broadcast_to_project(
                    pipeline.project_id,
                    {
                        "type": "validation_completed",
                        "pipeline_id": pipeline_id,
                        "result": result.value,
                        "deployment_url": pipeline.deployment_url
                    }
                )
    
    async def _handle_step_failure(self, pipeline_id: str, step_name: str, step_result: Dict[str, Any]):
        """Handle step failure and potentially retry or fail pipeline."""
        # Implementation for step failure handling
        await self._complete_pipeline(pipeline_id, ValidationResult.FAILURE)
    
    async def _handle_step_error(self, pipeline_id: str, step_name: str, error: str):
        """Handle step error."""
        await self._complete_pipeline(pipeline_id, ValidationResult.FAILURE)
    
    async def _handle_pipeline_error(self, pipeline_id: str, error: str):
        """Handle pipeline-level error."""
        with next(get_database_session()) as db:
            pipeline = db.query(ValidationPipeline).filter(
                ValidationPipeline.id == pipeline_id
            ).first()
            
            if pipeline:
                pipeline.status = ValidationStatus.FAILED
                pipeline.overall_result = ValidationResult.FAILURE
                pipeline.error_message = error
                pipeline.completed_at = datetime.utcnow()
                db.commit()
                
                # Update state manager
                self.state_manager.remove_active_validation(pipeline.project_id, pipeline_id)

