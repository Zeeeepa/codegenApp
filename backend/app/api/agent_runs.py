"""
Agent run management API endpoints.

Provides REST API endpoints for managing agent runs,
their execution, and interaction within the CI/CD system.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from ..database.connection import get_db
from ..models import AgentRun, AgentRunStatus, ResponseType, Project, AuditLog, AuditAction
from ..orchestration.workflow_engine import WorkflowEngine
from ..orchestration.state_manager import StateManager


router = APIRouter(prefix="/api/v1/agent-runs", tags=["agent-runs"])
workflow_engine = WorkflowEngine()
state_manager = StateManager()


# Pydantic models for request/response
class AgentRunCreate(BaseModel):
    """Request model for creating an agent run."""
    project_id: str = Field(..., min_length=1)
    target_text: str = Field(..., min_length=1, max_length=5000)
    session_id: Optional[str] = None


class AgentRunContinue(BaseModel):
    """Request model for continuing an agent run."""
    continuation_text: str = Field(..., min_length=1, max_length=5000)


class PlanResponse(BaseModel):
    """Request model for responding to a plan."""
    action: str = Field(..., regex="^(confirm|modify)$")
    modification_text: Optional[str] = None


class AgentRunResponse(BaseModel):
    """Response model for agent run data."""
    id: str
    project_id: str
    target_text: str
    status: str
    progress_percentage: int
    current_step: Optional[str]
    response_type: Optional[str]
    response_data: Optional[dict]
    error_message: Optional[str]
    retry_count: int
    session_id: str
    parent_run_id: Optional[str]
    created_at: str
    updated_at: str
    started_at: Optional[str]
    completed_at: Optional[str]


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_agent_run(
    run_data: AgentRunCreate,
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Start a new agent run.
    
    Args:
        run_data: Agent run creation data
        background_tasks: FastAPI background tasks
        user_id: ID of the user starting the run (optional)
        db: Database session
        
    Returns:
        Agent run creation response
    """
    # Validate project exists
    project = db.query(Project).filter(Project.id == run_data.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {run_data.project_id} not found"
        )
    
    # Start agent run via workflow engine
    try:
        result = await workflow_engine.start_agent_run(
            project_id=run_data.project_id,
            target_text=run_data.target_text,
            user_id=user_id,
            session_id=run_data.session_id
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Agent run started successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start agent run: {str(e)}"
        )


@router.get("/", response_model=List[AgentRunResponse])
async def list_agent_runs(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List agent runs with optional filtering.
    
    Args:
        project_id: Filter by project ID (optional)
        status_filter: Filter by status (optional)
        limit: Maximum number of results
        offset: Number of results to skip
        db: Database session
        
    Returns:
        List of agent runs
    """
    query = db.query(AgentRun)
    
    if project_id:
        query = query.filter(AgentRun.project_id == project_id)
    
    if status_filter:
        try:
            status_enum = AgentRunStatus(status_filter)
            query = query.filter(AgentRun.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Order by creation time (newest first)
    query = query.order_by(AgentRun.created_at.desc())
    
    agent_runs = query.offset(offset).limit(limit).all()
    
    return [
        AgentRunResponse(
            id=run.id,
            project_id=run.project_id,
            target_text=run.target_text,
            status=run.status.value if run.status else "unknown",
            progress_percentage=run.progress_percentage or 0,
            current_step=run.current_step,
            response_type=run.response_type.value if run.response_type else None,
            response_data=run.response_data,
            error_message=run.error_message,
            retry_count=run.retry_count or 0,
            session_id=run.session_id or "",
            parent_run_id=run.parent_run_id,
            created_at=run.created_at.isoformat() if run.created_at else "",
            updated_at=run.updated_at.isoformat() if run.updated_at else "",
            started_at=run.started_at.isoformat() if run.started_at else None,
            completed_at=run.completed_at.isoformat() if run.completed_at else None
        )
        for run in agent_runs
    ]


@router.get("/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(run_id: str, db: Session = Depends(get_db)):
    """
    Get a specific agent run by ID.
    
    Args:
        run_id: ID of the agent run to retrieve
        db: Database session
        
    Returns:
        Agent run data
    """
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    return AgentRunResponse(
        id=agent_run.id,
        project_id=agent_run.project_id,
        target_text=agent_run.target_text,
        status=agent_run.status.value if agent_run.status else "unknown",
        progress_percentage=agent_run.progress_percentage or 0,
        current_step=agent_run.current_step,
        response_type=agent_run.response_type.value if agent_run.response_type else None,
        response_data=agent_run.response_data,
        error_message=agent_run.error_message,
        retry_count=agent_run.retry_count or 0,
        session_id=agent_run.session_id or "",
        parent_run_id=agent_run.parent_run_id,
        created_at=agent_run.created_at.isoformat() if agent_run.created_at else "",
        updated_at=agent_run.updated_at.isoformat() if agent_run.updated_at else "",
        started_at=agent_run.started_at.isoformat() if agent_run.started_at else None,
        completed_at=agent_run.completed_at.isoformat() if agent_run.completed_at else None
    )


@router.post("/{run_id}/continue", response_model=dict)
async def continue_agent_run(
    run_id: str,
    continue_data: AgentRunContinue,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Continue an existing agent run with additional input.
    
    Args:
        run_id: ID of the agent run to continue
        continue_data: Continuation data
        user_id: ID of the user continuing the run (optional)
        db: Database session
        
    Returns:
        Continuation response
    """
    # Validate agent run exists
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    # Continue agent run via workflow engine
    try:
        result = await workflow_engine.continue_agent_run(
            run_id=run_id,
            continuation_text=continue_data.continuation_text,
            user_id=user_id
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Agent run continued successfully"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to continue agent run: {str(e)}"
        )


@router.post("/{run_id}/plan-response", response_model=dict)
async def handle_plan_response(
    run_id: str,
    plan_data: PlanResponse,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle user response to a plan-type agent response.
    
    Args:
        run_id: ID of the agent run
        plan_data: Plan response data
        user_id: ID of the user responding (optional)
        db: Database session
        
    Returns:
        Plan response handling result
    """
    # Validate agent run exists
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    # Handle plan response via workflow engine
    try:
        result = await workflow_engine.handle_plan_response(
            run_id=run_id,
            action=plan_data.action,
            modification_text=plan_data.modification_text,
            user_id=user_id
        )
        
        return {
            "success": True,
            "data": result,
            "message": f"Plan {plan_data.action} processed successfully"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to handle plan response: {str(e)}"
        )


@router.post("/{run_id}/cancel", response_model=dict)
async def cancel_agent_run(
    run_id: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Cancel a running agent run.
    
    Args:
        run_id: ID of the agent run to cancel
        user_id: ID of the user cancelling the run (optional)
        db: Database session
        
    Returns:
        Cancellation response
    """
    # Validate agent run exists
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    # Cancel via workflow engine
    try:
        cancelled = await workflow_engine.cancel_workflow(run_id)
        
        if cancelled:
            # Create audit log
            audit_log = AuditLog.create_log(
                action=AuditAction.AGENT_RUN_CANCELLED,
                description=f"Cancelled agent run",
                entity_type="agent_run",
                entity_id=run_id,
                project_id=agent_run.project_id,
                user_id=user_id
            )
            db.add(audit_log)
            db.commit()
            
            return {
                "success": True,
                "message": "Agent run cancelled successfully"
            }
        else:
            return {
                "success": False,
                "message": "Agent run was not running or could not be cancelled"
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel agent run: {str(e)}"
        )


@router.post("/{run_id}/retry", response_model=dict)
async def retry_agent_run(
    run_id: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retry a failed agent run.
    
    Args:
        run_id: ID of the agent run to retry
        user_id: ID of the user retrying the run (optional)
        db: Database session
        
    Returns:
        Retry response
    """
    # Validate agent run exists and can be retried
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    if not agent_run.can_retry():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent run cannot be retried (max retries reached or not in failed state)"
        )
    
    # Create new agent run for retry
    try:
        result = await workflow_engine.start_agent_run(
            project_id=agent_run.project_id,
            target_text=agent_run.target_text,
            user_id=user_id,
            session_id=agent_run.session_id
        )
        
        # Update original run to reference the retry
        agent_run.continuation_context = agent_run.continuation_context or {}
        agent_run.continuation_context["retried_as"] = result["run_id"]
        db.commit()
        
        return {
            "success": True,
            "data": result,
            "message": "Agent run retried successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry agent run: {str(e)}"
        )


@router.get("/{run_id}/status", response_model=dict)
async def get_agent_run_status(run_id: str, db: Session = Depends(get_db)):
    """
    Get current status of an agent run.
    
    Args:
        run_id: ID of the agent run
        db: Database session
        
    Returns:
        Current agent run status
    """
    try:
        status_info = await workflow_engine.get_workflow_status(run_id)
        return {
            "success": True,
            "data": status_info
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent run status: {str(e)}"
        )


@router.get("/{run_id}/logs", response_model=dict)
async def get_agent_run_logs(
    run_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get logs for an agent run.
    
    Args:
        run_id: ID of the agent run
        limit: Maximum number of log entries
        db: Database session
        
    Returns:
        Agent run logs
    """
    # Validate agent run exists
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run {run_id} not found"
        )
    
    # Get audit logs for this agent run
    logs = db.query(AuditLog).filter(
        AuditLog.entity_id == run_id,
        AuditLog.entity_type == "agent_run"
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "logs": [log.to_dict() for log in logs]
        }
    }

