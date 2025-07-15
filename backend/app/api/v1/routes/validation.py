"""
CodegenApp Validation API Routes
Comprehensive validation pipeline endpoints with SWE-bench integration
"""

import asyncio
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.core.monitoring import get_metrics_collector
from app.core.validation.validation_flow import ValidationFlowOrchestrator
from app.core.validation.snapshot_manager import SnapshotManager
from app.models.validation import (
    ValidationRequest,
    ValidationResponse,
    ValidationStatus,
    ValidationResult,
    SnapshotInfo
)
from app.utils.exceptions import ValidationException, ValidationTimeoutException

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()
metrics = get_metrics_collector()

# Global validation orchestrator
validation_orchestrator = ValidationFlowOrchestrator()
snapshot_manager = SnapshotManager()


class ValidationStartRequest(BaseModel):
    """Request model for starting validation"""
    project_name: str = Field(..., description="Name of the project")
    pr_number: int = Field(..., description="Pull request number")
    pr_url: str = Field(..., description="Pull request URL")
    base_branch: str = Field("main", description="Base branch for comparison")
    deployment_commands: List[str] = Field(..., description="Deployment commands to execute")
    auto_merge_enabled: bool = Field(False, description="Enable auto-merge on success")
    validation_config: Optional[Dict] = Field(None, description="Custom validation configuration")


class ValidationStatusResponse(BaseModel):
    """Response model for validation status"""
    flow_id: str
    status: str
    stage: str
    progress: float
    started_at: datetime
    updated_at: datetime
    estimated_completion: Optional[datetime]
    logs: List[str]
    error_message: Optional[str]


class ValidationResultResponse(BaseModel):
    """Response model for validation results"""
    flow_id: str
    project_name: str
    pr_number: int
    status: str
    confidence_score: float
    deployment_success: bool
    web_eval_success: bool
    auto_merge_decision: Optional[str]
    error_count: int
    total_duration: float
    stages: Dict[str, Dict]
    recommendations: List[str]


@router.post("/start", response_model=Dict[str, str])
async def start_validation(
    request: ValidationStartRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new validation flow for a PR
    
    This endpoint initiates the complete validation pipeline:
    1. Creates isolated snapshot environment
    2. Clones PR codebase
    3. Executes deployment commands
    4. Runs Gemini validation analysis
    5. Executes Web-Eval-Agent testing
    6. Makes auto-merge decision
    """
    try:
        # Generate unique flow ID
        flow_id = str(uuid.uuid4())
        
        logger.info(
            "Starting validation flow",
            flow_id=flow_id,
            project=request.project_name,
            pr_number=request.pr_number
        )
        
        # Record metrics
        metrics.record_validation_start(request.project_name)
        
        # Start validation in background
        background_tasks.add_task(
            _run_validation_flow,
            flow_id=flow_id,
            request=request
        )
        
        return {
            "flow_id": flow_id,
            "status": "started",
            "message": "Validation flow initiated successfully"
        }
        
    except Exception as e:
        logger.error("Failed to start validation", error=str(e))
        metrics.record_error("validation_start_failed", "validation_api")
        raise HTTPException(status_code=500, detail=f"Failed to start validation: {str(e)}")


@router.get("/status/{flow_id}", response_model=ValidationStatusResponse)
async def get_validation_status(flow_id: str):
    """
    Get real-time status of a validation flow
    
    Returns current status, progress, logs, and estimated completion time
    """
    try:
        status = await validation_orchestrator.get_status(flow_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Validation flow not found")
        
        return ValidationStatusResponse(
            flow_id=flow_id,
            status=status.status,
            stage=status.current_stage,
            progress=status.progress,
            started_at=status.started_at,
            updated_at=status.updated_at,
            estimated_completion=status.estimated_completion,
            logs=status.logs[-50:],  # Return last 50 log entries
            error_message=status.error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get validation status", flow_id=flow_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.get("/result/{flow_id}", response_model=ValidationResultResponse)
async def get_validation_result(flow_id: str):
    """
    Get final validation results
    
    Returns comprehensive results including confidence scores, 
    stage details, and auto-merge decisions
    """
    try:
        result = await validation_orchestrator.get_result(flow_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Validation result not found")
        
        if result.status == "running":
            raise HTTPException(status_code=202, detail="Validation still in progress")
        
        return ValidationResultResponse(
            flow_id=flow_id,
            project_name=result.project_name,
            pr_number=result.pr_number,
            status=result.status,
            confidence_score=result.confidence_score,
            deployment_success=result.deployment_success,
            web_eval_success=result.web_eval_success,
            auto_merge_decision=result.auto_merge_decision,
            error_count=result.error_count,
            total_duration=result.total_duration,
            stages=result.stages,
            recommendations=result.recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get validation result", flow_id=flow_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get result: {str(e)}")


@router.post("/retry/{flow_id}")
async def retry_validation(
    flow_id: str,
    background_tasks: BackgroundTasks,
    stage: Optional[str] = None
):
    """
    Retry a failed validation flow
    
    Can retry from a specific stage or restart the entire flow
    """
    try:
        logger.info("Retrying validation flow", flow_id=flow_id, stage=stage)
        
        # Start retry in background
        background_tasks.add_task(
            validation_orchestrator.retry_flow,
            flow_id=flow_id,
            from_stage=stage
        )
        
        return {
            "flow_id": flow_id,
            "status": "retry_started",
            "message": f"Validation retry initiated{f' from stage {stage}' if stage else ''}"
        }
        
    except Exception as e:
        logger.error("Failed to retry validation", flow_id=flow_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to retry validation: {str(e)}")


@router.delete("/cancel/{flow_id}")
async def cancel_validation(flow_id: str):
    """
    Cancel a running validation flow
    
    Stops the validation and cleans up resources
    """
    try:
        success = await validation_orchestrator.cancel_flow(flow_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Validation flow not found or already completed")
        
        logger.info("Validation flow cancelled", flow_id=flow_id)
        
        return {
            "flow_id": flow_id,
            "status": "cancelled",
            "message": "Validation flow cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel validation", flow_id=flow_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to cancel validation: {str(e)}")


@router.get("/active", response_model=List[Dict])
async def get_active_validations():
    """
    Get list of all active validation flows
    
    Returns summary information for all currently running validations
    """
    try:
        active_flows = await validation_orchestrator.get_active_flows()
        
        return [
            {
                "flow_id": flow.flow_id,
                "project_name": flow.project_name,
                "pr_number": flow.pr_number,
                "status": flow.status,
                "stage": flow.current_stage,
                "progress": flow.progress,
                "started_at": flow.started_at,
                "duration": (datetime.utcnow() - flow.started_at).total_seconds()
            }
            for flow in active_flows
        ]
        
    except Exception as e:
        logger.error("Failed to get active validations", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get active validations: {str(e)}")


@router.get("/snapshots", response_model=List[SnapshotInfo])
async def get_validation_snapshots():
    """
    Get list of available validation snapshots
    
    Returns information about cached validation environments
    """
    try:
        snapshots = await snapshot_manager.list_snapshots()
        
        return [
            SnapshotInfo(
                snapshot_id=snapshot.snapshot_id,
                project_name=snapshot.project_name,
                created_at=snapshot.created_at,
                size_mb=snapshot.size_mb,
                status=snapshot.status,
                tools_installed=snapshot.tools_installed
            )
            for snapshot in snapshots
        ]
        
    except Exception as e:
        logger.error("Failed to get snapshots", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get snapshots: {str(e)}")


@router.delete("/snapshots/{snapshot_id}")
async def delete_validation_snapshot(snapshot_id: str):
    """
    Delete a validation snapshot
    
    Removes cached validation environment to free up resources
    """
    try:
        success = await snapshot_manager.delete_snapshot(snapshot_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        logger.info("Snapshot deleted", snapshot_id=snapshot_id)
        
        return {
            "snapshot_id": snapshot_id,
            "status": "deleted",
            "message": "Snapshot deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete snapshot", snapshot_id=snapshot_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete snapshot: {str(e)}")


async def _run_validation_flow(flow_id: str, request: ValidationStartRequest):
    """
    Background task to run the complete validation flow
    
    Integrates SWE-bench validation patterns with our custom pipeline
    """
    start_time = datetime.utcnow()
    
    try:
        # Create validation request
        validation_request = ValidationRequest(
            flow_id=flow_id,
            project_name=request.project_name,
            pr_number=request.pr_number,
            pr_url=request.pr_url,
            base_branch=request.base_branch,
            deployment_commands=request.deployment_commands,
            auto_merge_enabled=request.auto_merge_enabled,
            validation_config=request.validation_config or {}
        )
        
        # Run validation flow
        result = await validation_orchestrator.run_validation(validation_request)
        
        # Record metrics
        duration = (datetime.utcnow() - start_time).total_seconds()
        metrics.record_validation_complete(
            project=request.project_name,
            status=result.status,
            duration=duration,
            stage="complete"
        )
        
        logger.info(
            "Validation flow completed",
            flow_id=flow_id,
            status=result.status,
            duration=duration
        )
        
    except ValidationTimeoutException as e:
        logger.error("Validation flow timed out", flow_id=flow_id, error=str(e))
        metrics.record_error("validation_timeout", "validation_flow")
        
    except Exception as e:
        logger.error("Validation flow failed", flow_id=flow_id, error=str(e))
        metrics.record_error("validation_failed", "validation_flow")
        
        # Update flow status to failed
        await validation_orchestrator.update_flow_status(
            flow_id=flow_id,
            status="failed",
            error_message=str(e)
        )

