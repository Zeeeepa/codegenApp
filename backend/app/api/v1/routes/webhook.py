"""
Webhook API Routes - Handle webhook validation requests and status updates
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.grainchain_webhook_service import GrainchainWebhookService, ValidationResult
from app.api.v1.dependencies import get_grainchain_webhook_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


# Request/Response Models
class WebhookValidationRequest(BaseModel):
    """Request model for webhook validation"""
    project_id: str = Field(..., description="GitHub repository full name (owner/repo)")
    pr_number: int = Field(..., description="Pull request number")
    pr_url: str = Field(..., description="Pull request URL")
    head_sha: str = Field(..., description="Head commit SHA")
    base_sha: str = Field(..., description="Base commit SHA")
    webhook_url: str = Field(..., description="Webhook URL for status updates")


class WebhookValidationResponse(BaseModel):
    """Response model for webhook validation"""
    success: bool
    message: str
    validation_id: str
    status: str


class ValidationStatusResponse(BaseModel):
    """Response model for validation status"""
    validation_id: str
    project_id: str
    pr_number: int
    status: str
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    sandbox_id: Optional[str] = None


class ProjectValidationsResponse(BaseModel):
    """Response model for project validations list"""
    project_id: str
    validations: List[ValidationStatusResponse]
    total: int


# Dependency to get webhook service
async def get_webhook_service() -> GrainchainWebhookService:
    """Get webhook service instance"""
    # In a real implementation, this would be injected from the main app
    config = {
        "max_concurrent_validations": 5,
        "validation_timeout": 600,
        "cleanup_interval": 3600
    }
    return GrainchainWebhookService(config)


@router.post("/validation/trigger", response_model=WebhookValidationResponse)
async def trigger_validation(
    request: WebhookValidationRequest,
    background_tasks: BackgroundTasks,
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Trigger grainchain validation for a PR
    
    This endpoint is called by Cloudflare Workers when a PR event occurs.
    It starts a validation process in the background and returns immediately.
    """
    try:
        logger.info(f"🚀 Triggering validation for PR #{request.pr_number} in {request.project_id}")
        
        # Convert request to dict for service
        request_data = request.dict()
        
        # Trigger validation
        result = await webhook_service.trigger_validation(request_data)
        
        return WebhookValidationResponse(
            success=True,
            message=f"Validation triggered for PR #{request.pr_number}",
            validation_id=result.validation_id,
            status=result.status
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to trigger validation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger validation: {str(e)}")


@router.get("/validation/{validation_id}/status", response_model=ValidationStatusResponse)
async def get_validation_status(
    validation_id: str,
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Get validation status by ID
    
    Returns the current status and results of a validation process.
    """
    try:
        result = await webhook_service.get_validation_status(validation_id)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Validation {validation_id} not found")
        
        return ValidationStatusResponse(
            validation_id=result.validation_id,
            project_id=result.project_id,
            pr_number=result.pr_number,
            status=result.status,
            results=result.results,
            error=result.error,
            started_at=result.started_at.isoformat() if result.started_at else None,
            completed_at=result.completed_at.isoformat() if result.completed_at else None,
            sandbox_id=result.sandbox_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get validation status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get validation status: {str(e)}")


@router.get("/validation/project/{project_id}", response_model=ProjectValidationsResponse)
async def get_project_validations(
    project_id: str,
    limit: int = 10,
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Get validation history for a project
    
    Returns recent validations for the specified project.
    """
    try:
        # URL decode project_id (owner/repo format)
        project_id = project_id.replace("%2F", "/")
        
        validations = await webhook_service.list_project_validations(project_id, limit)
        
        validation_responses = []
        for validation in validations:
            validation_responses.append(ValidationStatusResponse(
                validation_id=validation.validation_id,
                project_id=validation.project_id,
                pr_number=validation.pr_number,
                status=validation.status,
                results=validation.results,
                error=validation.error,
                started_at=validation.started_at.isoformat() if validation.started_at else None,
                completed_at=validation.completed_at.isoformat() if validation.completed_at else None,
                sandbox_id=validation.sandbox_id
            ))
        
        return ProjectValidationsResponse(
            project_id=project_id,
            validations=validation_responses,
            total=len(validation_responses)
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to get project validations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project validations: {str(e)}")


@router.delete("/validation/{validation_id}/cancel")
async def cancel_validation(
    validation_id: str,
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Cancel a running validation
    
    Stops a validation process and cleans up resources.
    """
    try:
        success = await webhook_service.cancel_validation(validation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Validation {validation_id} not found or cannot be cancelled")
        
        return {
            "success": True,
            "message": f"Validation {validation_id} cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to cancel validation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel validation: {str(e)}")


@router.post("/status")
async def receive_status_update(
    status_data: Dict[str, Any],
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Receive status updates from external services
    
    This endpoint can be used by external services to send status updates
    about validation processes.
    """
    try:
        logger.info(f"📡 Received status update: {status_data}")
        
        # Log the status update (in production, you might want to process this further)
        validation_id = status_data.get("validation_id")
        status = status_data.get("status")
        
        if validation_id and status:
            logger.info(f"Status update for {validation_id}: {status}")
        
        return {
            "success": True,
            "message": "Status update received"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to process status update: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process status update: {str(e)}")


@router.get("/health")
async def webhook_health_check(
    webhook_service: GrainchainWebhookService = Depends(get_webhook_service)
):
    """
    Health check for webhook service
    
    Returns the health status of the webhook validation system.
    """
    try:
        # Get service statistics
        active_validations = len(webhook_service.active_validations)
        max_concurrent = webhook_service.max_concurrent_validations
        
        return {
            "status": "healthy",
            "service": "webhook-validation",
            "active_validations": active_validations,
            "max_concurrent_validations": max_concurrent,
            "capacity_usage": f"{active_validations}/{max_concurrent}",
            "timestamp": "2024-07-15T06:46:14Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Webhook health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-07-15T06:46:14Z"
        }
