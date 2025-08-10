"""
Workflow API Routes - HTTP endpoints for workflow orchestration
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import logging

from codegenapp.models.api.api_models import (
    CreateWorkflowRequest, WorkflowExecutionResponse, 
    WorkflowDefinition, WorkflowExecution, WorkflowStatus
)
from codegenapp.core.workflow.engine import WorkflowEngine
from codegenapp.core.orchestration.state_manager import WorkflowStateManager
from codegenapp.utils.exceptions import WorkflowExecutionError
from codegenapp.api.v1.dependencies import get_current_user, get_workflow_engine, get_state_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("/", response_model=WorkflowExecutionResponse)
async def create_workflow_execution(
    request: CreateWorkflowRequest,
    current_user: dict = Depends(get_current_user),
    engine: WorkflowEngine = Depends(get_workflow_engine)
):
    """Create and start a new workflow execution"""
    try:
        execution = await engine.start_workflow(
            workflow=request.workflow,
            parameters=request.parameters,
            organization_id=current_user["organization_id"],
            user_id=current_user["user_id"]
        )
        
        return WorkflowExecutionResponse(
            execution=execution,
            step_statuses={}
        )
        
    except WorkflowExecutionError as e:
        logger.error(f"❌ Failed to create workflow execution: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Unexpected error creating workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_workflow_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user),
    engine: WorkflowEngine = Depends(get_workflow_engine)
):
    """Get workflow execution by ID"""
    try:
        execution = await engine.get_execution(execution_id)
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow execution {execution_id} not found"
            )
        
        # Check if user has access to this execution
        if execution.organization_id != current_user["organization_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow execution"
            )
        
        # Calculate step statuses
        step_statuses = {}
        for step_id, result in execution.step_results.items():
            if result.get("status") == "completed":
                step_statuses[step_id] = "COMPLETED"
            elif result.get("status") == "failed":
                step_statuses[step_id] = "FAILED"
            else:
                step_statuses[step_id] = "PENDING"
        
        return WorkflowExecutionResponse(
            execution=execution,
            step_statuses=step_statuses
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting workflow execution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/", response_model=List[WorkflowExecution])
async def list_workflow_executions(
    status: Optional[WorkflowStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    state_manager: WorkflowStateManager = Depends(get_state_manager)
):
    """List workflow executions for the current organization"""
    try:
        executions = await state_manager.list_executions(
            organization_id=current_user["organization_id"],
            status=status,
            limit=min(limit, 100),  # Cap at 100
            offset=offset
        )
        
        return executions
        
    except Exception as e:
        logger.error(f"❌ Error listing workflow executions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/{execution_id}/cancel")
async def cancel_workflow_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user),
    engine: WorkflowEngine = Depends(get_workflow_engine)
):
    """Cancel a running workflow execution"""
    try:
        # Check if execution exists and user has access
        execution = await engine.get_execution(execution_id)
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow execution {execution_id} not found"
            )
        
        if execution.organization_id != current_user["organization_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow execution"
            )
        
        # Cancel the execution
        success = await engine.cancel_execution(execution_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel this workflow execution"
            )
        
        return {"message": "Workflow execution cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error cancelling workflow execution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/{execution_id}")
async def delete_workflow_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user),
    state_manager: WorkflowStateManager = Depends(get_state_manager)
):
    """Delete a workflow execution"""
    try:
        # Check if execution exists and user has access
        execution = await state_manager.get_execution(execution_id)
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow execution {execution_id} not found"
            )
        
        if execution.organization_id != current_user["organization_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this workflow execution"
            )
        
        # Delete the execution
        success = await state_manager.delete_execution(execution_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete workflow execution"
            )
        
        return {"message": "Workflow execution deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting workflow execution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/metrics/summary")
async def get_workflow_metrics(
    current_user: dict = Depends(get_current_user),
    state_manager: WorkflowStateManager = Depends(get_state_manager)
):
    """Get workflow execution metrics for the organization"""
    try:
        metrics = await state_manager.get_execution_metrics(
            organization_id=current_user["organization_id"]
        )
        
        return metrics
        
    except Exception as e:
        logger.error(f"❌ Error getting workflow metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
