"""
Workflow management API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.workflow.cicd_engine import CICDWorkflowEngine, WorkflowEngineError
from app.models.workflow_state import WorkflowState, WorkflowConfig
from app.services.adapters.codegen_adapter import CodegenAdapter
from app.websocket.manager import WebSocketManager
from app.services.webhook_processor import WebhookProcessor

router = APIRouter(prefix="/workflows", tags=["workflows"])


# Request/Response Models
class StartWorkflowRequest(BaseModel):
    """Request to start a new workflow"""
    project_id: str = Field(..., description="Project identifier")
    repository: Dict[str, Any] = Field(..., description="Repository information")
    initial_requirements: str = Field(..., description="Initial requirements text")
    planning_statement: Optional[str] = Field(None, description="Custom planning statement")
    auto_confirm_plan: bool = Field(False, description="Auto-confirm generated plans")
    auto_merge_pr: bool = Field(False, description="Auto-merge validated PRs")
    max_iterations: int = Field(10, ge=1, le=50, description="Maximum workflow iterations")


class WorkflowResponse(BaseModel):
    """Workflow execution response"""
    id: str
    project_id: str
    current_state: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_activity: datetime
    metadata: Dict[str, Any]
    retry_count: int = 0
    error_message: Optional[str] = None


class WorkflowStatusResponse(BaseModel):
    """Detailed workflow status response"""
    execution: WorkflowResponse
    summary: Dict[str, Any]
    context_debug: Optional[Dict[str, Any]] = None


class WorkflowListResponse(BaseModel):
    """List of active workflows"""
    workflows: List[Dict[str, Any]]
    total_count: int
    active_count: int


# Dependency injection
async def get_workflow_engine() -> CICDWorkflowEngine:
    """Get workflow engine instance"""
    # In a real application, this would be injected via dependency injection
    # For now, we'll create a mock instance
    from app.services.adapters.codegen_adapter import CodegenAdapter
    from app.websocket.manager import WebSocketManager
    from app.services.webhook_processor import WebhookProcessor
    
    codegen_adapter = CodegenAdapter()
    websocket_manager = WebSocketManager()
    webhook_processor = WebhookProcessor()
    
    return CICDWorkflowEngine(
        codegen_adapter=codegen_adapter,
        websocket_manager=websocket_manager,
        webhook_processor=webhook_processor
    )


@router.post("/start", response_model=WorkflowResponse)
async def start_workflow(
    request: StartWorkflowRequest,
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> WorkflowResponse:
    """
    Start a new CI/CD workflow.
    
    This endpoint initiates a complete CI/CD workflow that will:
    1. Create a plan based on requirements
    2. Generate code and create PR
    3. Validate the implementation
    4. Continue iterations until requirements are met
    
    The workflow runs asynchronously and sends real-time updates via WebSocket.
    """
    try:
        execution = await engine.start_workflow(
            project_id=request.project_id,
            repository=request.repository,
            initial_requirements=request.initial_requirements,
            planning_statement=request.planning_statement,
            auto_confirm_plan=request.auto_confirm_plan,
            auto_merge_pr=request.auto_merge_pr,
            max_iterations=request.max_iterations
        )
        
        return WorkflowResponse(
            id=execution.id,
            project_id=execution.project_id,
            current_state=execution.current_state.value,
            created_at=execution.created_at,
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            last_activity=execution.last_activity,
            metadata=execution.metadata.dict(),
            retry_count=execution.retry_count,
            error_message=execution.error_message
        )
        
    except WorkflowEngineError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")


@router.get("/{workflow_id}/status", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    workflow_id: str,
    include_debug: bool = False,
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> WorkflowStatusResponse:
    """
    Get detailed status of a workflow.
    
    Returns current state, execution summary, and optionally debug information.
    """
    try:
        status = await engine.get_workflow_status(workflow_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        execution_data = status["execution"]
        workflow_response = WorkflowResponse(
            id=execution_data["id"],
            project_id=execution_data["project_id"],
            current_state=execution_data["current_state"],
            created_at=execution_data["created_at"],
            started_at=execution_data.get("started_at"),
            completed_at=execution_data.get("completed_at"),
            last_activity=execution_data["last_activity"],
            metadata=execution_data["metadata"],
            retry_count=execution_data.get("retry_count", 0),
            error_message=execution_data.get("error_message")
        )
        
        return WorkflowStatusResponse(
            execution=workflow_response,
            summary=status["summary"],
            context_debug=status["context_debug"] if include_debug else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")


@router.post("/{workflow_id}/cancel")
async def cancel_workflow(
    workflow_id: str,
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> Dict[str, Any]:
    """
    Cancel a running workflow.
    
    This will stop the workflow execution and clean up resources.
    """
    try:
        success = await engine.cancel_workflow(workflow_id)
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail="Workflow not found or already completed"
            )
        
        return {
            "success": True,
            "message": f"Workflow {workflow_id} cancelled successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel workflow: {str(e)}")


@router.get("/active", response_model=WorkflowListResponse)
async def get_active_workflows(
    project_id: Optional[str] = None,
    state: Optional[WorkflowState] = None,
    limit: int = 50,
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> WorkflowListResponse:
    """
    Get list of active workflows.
    
    Optionally filter by project_id or state.
    """
    try:
        workflows = await engine.get_active_workflows()
        
        # Apply filters
        if project_id:
            workflows = [w for w in workflows if w["project_id"] == project_id]
        
        if state:
            workflows = [w for w in workflows if w["state"] == state.value]
        
        # Apply limit
        workflows = workflows[:limit]
        
        return WorkflowListResponse(
            workflows=workflows,
            total_count=len(workflows),
            active_count=len([w for w in workflows if w["state"] not in ["completed", "failed", "cancelled"]])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflows: {str(e)}")


@router.post("/{workflow_id}/confirm-plan")
async def confirm_plan(
    workflow_id: str,
    confirmed: bool = True,
    modifications: Optional[str] = None,
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> Dict[str, Any]:
    """
    Confirm or modify a generated plan.
    
    This endpoint is used when auto_confirm_plan is False and manual
    confirmation is required.
    """
    try:
        # This would integrate with the workflow engine to handle plan confirmation
        # For now, return a placeholder response
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "confirmed": confirmed,
            "modifications": modifications,
            "message": "Plan confirmation processed"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm plan: {str(e)}")


@router.post("/{workflow_id}/webhook")
async def handle_workflow_webhook(
    workflow_id: str,
    payload: Dict[str, Any],
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> Dict[str, Any]:
    """
    Handle webhook events for a specific workflow.
    
    This endpoint receives GitHub webhook events related to PRs
    and triggers appropriate workflow state transitions.
    """
    try:
        # This would integrate with the webhook processor
        # to handle PR events and trigger workflow transitions
        
        event_type = payload.get("action", "unknown")
        pr_number = payload.get("pull_request", {}).get("number")
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "event_type": event_type,
            "pr_number": pr_number,
            "message": "Webhook processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {str(e)}")


@router.get("/config", response_model=Dict[str, Any])
async def get_workflow_config() -> Dict[str, Any]:
    """
    Get current workflow configuration.
    
    Returns timeout settings, retry limits, and other configuration values.
    """
    config = WorkflowConfig()
    return {
        "timeouts": {
            "planning_timeout": config.planning_timeout,
            "coding_timeout": config.coding_timeout,
            "validation_timeout": config.validation_timeout
        },
        "limits": {
            "max_retries_per_state": config.max_retries_per_state,
            "max_concurrent_workflows": config.max_concurrent_workflows,
            "max_validation_attempts": config.max_validation_attempts
        },
        "delays": {
            "retry_delay": config.retry_delay,
            "validation_retry_delay": config.validation_retry_delay
        }
    }


@router.get("/states", response_model=List[Dict[str, str]])
async def get_workflow_states() -> List[Dict[str, str]]:
    """
    Get list of all possible workflow states.
    
    Returns state names and descriptions for UI display.
    """
    states = [
        {"name": WorkflowState.IDLE.value, "description": "Workflow initialized but not started"},
        {"name": WorkflowState.PLANNING.value, "description": "Creating implementation plan"},
        {"name": WorkflowState.CODING.value, "description": "Generating code and creating PR"},
        {"name": WorkflowState.PR_CREATED.value, "description": "PR created, waiting for validation"},
        {"name": WorkflowState.VALIDATING.value, "description": "Validating implementation"},
        {"name": WorkflowState.COMPLETED.value, "description": "Requirements fully satisfied"},
        {"name": WorkflowState.FAILED.value, "description": "Workflow failed with errors"},
        {"name": WorkflowState.CANCELLED.value, "description": "Workflow cancelled by user"}
    ]
    
    return states


@router.get("/metrics", response_model=Dict[str, Any])
async def get_workflow_metrics(
    engine: CICDWorkflowEngine = Depends(get_workflow_engine)
) -> Dict[str, Any]:
    """
    Get workflow execution metrics.
    
    Returns statistics about workflow performance and success rates.
    """
    try:
        workflows = await engine.get_active_workflows()
        
        # Calculate basic metrics
        total_workflows = len(workflows)
        state_counts = {}
        
        for workflow in workflows:
            state = workflow["state"]
            state_counts[state] = state_counts.get(state, 0) + 1
        
        return {
            "total_workflows": total_workflows,
            "state_distribution": state_counts,
            "active_workflows": len([w for w in workflows if w["state"] not in ["completed", "failed", "cancelled"]]),
            "success_rate": 0.0,  # Would be calculated from historical data
            "average_duration": 0.0,  # Would be calculated from completed workflows
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


# Health check endpoint
@router.get("/health")
async def workflow_health_check() -> Dict[str, str]:
    """
    Health check for workflow system.
    """
    return {
        "status": "healthy",
        "service": "workflow-engine",
        "timestamp": datetime.utcnow().isoformat()
    }
