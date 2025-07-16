"""
Validation API Routes

Provides endpoints for managing the validation pipeline and PR validation flows.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel

from app.core.validation.validation_flow import (
    get_validation_flow_orchestrator,
    ValidationFlowContext,
    ValidationStatus
)
from app.core.validation.snapshot_manager import get_snapshot_manager
from app.api.v1.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validation", tags=["validation"])


# Request/Response Models
class StartValidationRequest(BaseModel):
    """Request to start validation flow"""
    project_name: str
    pr_number: int
    pr_url: str
    pr_branch: str
    repo_url: str
    deployment_commands: List[str]
    auto_merge_enabled: bool = False
    target_url: Optional[str] = None
    user_preferences: Optional[Dict[str, Any]] = None


class ValidationStatusResponse(BaseModel):
    """Validation status response"""
    flow_id: str
    project_name: str
    pr_number: int
    status: str
    progress_message: str
    snapshot_id: Optional[str] = None
    error_logs: List[str] = []
    retry_count: int = 0
    duration: Optional[float] = None


class ValidationResultResponse(BaseModel):
    """Validation result response"""
    success: bool
    status: str
    snapshot_id: Optional[str]
    deployment_success: bool
    web_eval_success: bool
    merge_decision: Optional[str]
    error_logs: List[str]
    duration: float
    retry_count: int
    deployment_summary: Optional[str] = None
    web_eval_summary: Optional[str] = None


# Global storage for validation status (in production, use Redis or database)
validation_statuses: Dict[str, Dict[str, Any]] = {}


@router.post("/start", response_model=Dict[str, str])
async def start_validation_flow(
    request: StartValidationRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Start a new validation flow for a PR"""
    
    try:
        flow_id = f"flow_{request.project_name}_{request.pr_number}"
        
        # Check if validation is already running
        if flow_id in validation_statuses:
            current_status = validation_statuses[flow_id]
            if current_status["status"] not in ["completed", "failed"]:
                raise HTTPException(
                    status_code=409,
                    detail=f"Validation already running for PR {request.pr_number}"
                )
        
        # Initialize status tracking
        validation_statuses[flow_id] = {
            "flow_id": flow_id,
            "project_name": request.project_name,
            "pr_number": request.pr_number,
            "status": ValidationStatus.INITIALIZING.value,
            "progress_message": "Initializing validation flow",
            "snapshot_id": None,
            "error_logs": [],
            "retry_count": 0,
            "start_time": None,
            "duration": None
        }
        
        # Create flow context
        flow_context = ValidationFlowContext(
            project_name=request.project_name,
            pr_number=request.pr_number,
            pr_url=request.pr_url,
            pr_branch=request.pr_branch,
            repo_url=request.repo_url,
            deployment_commands=request.deployment_commands,
            auto_merge_enabled=request.auto_merge_enabled,
            target_url=request.target_url,
            user_preferences=request.user_preferences or {}
        )
        
        # Start validation flow in background
        background_tasks.add_task(
            _run_validation_flow_background,
            flow_id,
            flow_context
        )
        
        logger.info(f"Started validation flow {flow_id} for PR {request.pr_number}")
        
        return {
            "flow_id": flow_id,
            "message": "Validation flow started",
            "status": "initializing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start validation flow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start validation flow: {str(e)}"
        )


@router.get("/status/{flow_id}", response_model=ValidationStatusResponse)
async def get_validation_status(
    flow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get validation flow status"""
    
    if flow_id not in validation_statuses:
        raise HTTPException(
            status_code=404,
            detail=f"Validation flow {flow_id} not found"
        )
    
    status_data = validation_statuses[flow_id]
    
    return ValidationStatusResponse(
        flow_id=status_data["flow_id"],
        project_name=status_data["project_name"],
        pr_number=status_data["pr_number"],
        status=status_data["status"],
        progress_message=status_data["progress_message"],
        snapshot_id=status_data.get("snapshot_id"),
        error_logs=status_data.get("error_logs", []),
        retry_count=status_data.get("retry_count", 0),
        duration=status_data.get("duration")
    )


@router.get("/result/{flow_id}", response_model=ValidationResultResponse)
async def get_validation_result(
    flow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get validation flow result"""
    
    if flow_id not in validation_statuses:
        raise HTTPException(
            status_code=404,
            detail=f"Validation flow {flow_id} not found"
        )
    
    status_data = validation_statuses[flow_id]
    
    if status_data["status"] not in ["completed", "failed"]:
        raise HTTPException(
            status_code=409,
            detail=f"Validation flow {flow_id} is still running"
        )
    
    result_data = status_data.get("result", {})
    
    return ValidationResultResponse(
        success=result_data.get("success", False),
        status=status_data["status"],
        snapshot_id=result_data.get("snapshot_id"),
        deployment_success=result_data.get("deployment_success", False),
        web_eval_success=result_data.get("web_eval_success", False),
        merge_decision=result_data.get("merge_decision"),
        error_logs=status_data.get("error_logs", []),
        duration=status_data.get("duration", 0.0),
        retry_count=status_data.get("retry_count", 0),
        deployment_summary=result_data.get("deployment_summary"),
        web_eval_summary=result_data.get("web_eval_summary")
    )


@router.post("/retry/{flow_id}")
async def retry_validation_flow(
    flow_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retry a failed validation flow"""
    
    if flow_id not in validation_statuses:
        raise HTTPException(
            status_code=404,
            detail=f"Validation flow {flow_id} not found"
        )
    
    status_data = validation_statuses[flow_id]
    
    if status_data["status"] not in ["failed", "retrying"]:
        raise HTTPException(
            status_code=409,
            detail=f"Validation flow {flow_id} cannot be retried (status: {status_data['status']})"
        )
    
    try:
        # Get original flow context
        original_context = status_data.get("original_context")
        if not original_context:
            raise HTTPException(
                status_code=400,
                detail="Original flow context not found"
            )
        
        # Increment retry count
        original_context.retry_count += 1
        
        # Reset status
        validation_statuses[flow_id].update({
            "status": ValidationStatus.INITIALIZING.value,
            "progress_message": f"Retrying validation flow (attempt {original_context.retry_count})",
            "error_logs": [],
            "start_time": None,
            "duration": None
        })
        
        # Start retry in background
        background_tasks.add_task(
            _run_validation_flow_background,
            flow_id,
            original_context
        )
        
        logger.info(f"Retrying validation flow {flow_id} (attempt {original_context.retry_count})")
        
        return {
            "flow_id": flow_id,
            "message": f"Validation flow retry started (attempt {original_context.retry_count})",
            "status": "retrying"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry validation flow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retry validation flow: {str(e)}"
        )


@router.delete("/cancel/{flow_id}")
async def cancel_validation_flow(
    flow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cancel a running validation flow"""
    
    if flow_id not in validation_statuses:
        raise HTTPException(
            status_code=404,
            detail=f"Validation flow {flow_id} not found"
        )
    
    status_data = validation_statuses[flow_id]
    
    if status_data["status"] in ["completed", "failed"]:
        raise HTTPException(
            status_code=409,
            detail=f"Validation flow {flow_id} is already finished"
        )
    
    try:
        # Cancel the flow
        orchestrator = get_validation_flow_orchestrator()
        orchestrator.cancel_flow(
            status_data["project_name"],
            status_data["pr_number"]
        )
        
        # Update status
        validation_statuses[flow_id].update({
            "status": "cancelled",
            "progress_message": "Validation flow cancelled by user"
        })
        
        logger.info(f"Cancelled validation flow {flow_id}")
        
        return {
            "flow_id": flow_id,
            "message": "Validation flow cancelled",
            "status": "cancelled"
        }
        
    except Exception as e:
        logger.error(f"Failed to cancel validation flow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel validation flow: {str(e)}"
        )


@router.get("/active", response_model=List[ValidationStatusResponse])
async def list_active_validations(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all active validation flows"""
    
    active_flows = []
    
    for flow_id, status_data in validation_statuses.items():
        if status_data["status"] not in ["completed", "failed", "cancelled"]:
            active_flows.append(ValidationStatusResponse(
                flow_id=status_data["flow_id"],
                project_name=status_data["project_name"],
                pr_number=status_data["pr_number"],
                status=status_data["status"],
                progress_message=status_data["progress_message"],
                snapshot_id=status_data.get("snapshot_id"),
                error_logs=status_data.get("error_logs", []),
                retry_count=status_data.get("retry_count", 0),
                duration=status_data.get("duration")
            ))
    
    return active_flows


@router.get("/snapshots", response_model=List[Dict[str, Any]])
async def list_validation_snapshots(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all active validation snapshots"""
    
    try:
        snapshot_manager = get_snapshot_manager()
        snapshots = snapshot_manager.list_active_snapshots()
        
        snapshot_list = []
        for snapshot in snapshots:
            snapshot_list.append({
                "snapshot_id": snapshot.snapshot_id,
                "project_name": snapshot.project_name,
                "pr_number": snapshot.pr_number,
                "status": snapshot.status,
                "created_at": snapshot.created_at,
                "workspace_path": str(snapshot.workspace_path) if snapshot.workspace_path else None,
                "log_count": len(snapshot.logs)
            })
        
        return snapshot_list
        
    except Exception as e:
        logger.error(f"Failed to list snapshots: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list snapshots: {str(e)}"
        )


@router.delete("/snapshots/{snapshot_id}")
async def cleanup_validation_snapshot(
    snapshot_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Clean up a validation snapshot"""
    
    try:
        snapshot_manager = get_snapshot_manager()
        await snapshot_manager.cleanup_snapshot(snapshot_id)
        
        logger.info(f"Cleaned up validation snapshot {snapshot_id}")
        
        return {
            "snapshot_id": snapshot_id,
            "message": "Snapshot cleaned up successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup snapshot: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup snapshot: {str(e)}"
        )


# Background task function
async def _run_validation_flow_background(
    flow_id: str,
    flow_context: ValidationFlowContext
):
    """Run validation flow in background"""
    
    import time
    
    start_time = time.time()
    
    # Store original context for retries
    validation_statuses[flow_id]["original_context"] = flow_context
    validation_statuses[flow_id]["start_time"] = start_time
    
    def progress_callback(status: ValidationStatus, message: str):
        """Update validation status"""
        validation_statuses[flow_id].update({
            "status": status.value,
            "progress_message": message,
            "duration": time.time() - start_time
        })
        
        logger.info(f"Validation {flow_id} - {status.value}: {message}")
    
    try:
        # Run validation flow
        orchestrator = get_validation_flow_orchestrator()
        result = await orchestrator.start_validation_flow(
            flow_context,
            progress_callback
        )
        
        # Update final status
        validation_statuses[flow_id].update({
            "status": result.status.value,
            "progress_message": "Validation flow completed" if result.success else "Validation flow failed",
            "snapshot_id": result.snapshot_id,
            "error_logs": result.error_logs,
            "retry_count": result.retry_count,
            "duration": result.duration,
            "result": {
                "success": result.success,
                "snapshot_id": result.snapshot_id,
                "deployment_success": result.deployment_analysis.success if result.deployment_analysis else False,
                "web_eval_success": result.web_eval_analysis.success if result.web_eval_analysis else False,
                "merge_decision": result.merge_decision.value if result.merge_decision else None,
                "deployment_summary": result.deployment_analysis.summary if result.deployment_analysis else None,
                "web_eval_summary": result.web_eval_analysis.summary if result.web_eval_analysis else None
            }
        })
        
        logger.info(f"Validation flow {flow_id} completed with success: {result.success}")
        
    except Exception as e:
        # Update error status
        validation_statuses[flow_id].update({
            "status": "failed",
            "progress_message": f"Validation flow failed: {str(e)}",
            "error_logs": validation_statuses[flow_id].get("error_logs", []) + [str(e)],
            "duration": time.time() - start_time
        })
        
        logger.error(f"Validation flow {flow_id} failed: {e}")

