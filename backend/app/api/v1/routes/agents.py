"""
Agent Management API Routes - Single User, No Authentication
Direct integration with Codegen Agent API for personal use.
"""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from app.services.codegen_client import (
    CodegenAgentClient, CodegenAgentRequest, AgentResponse, StreamingUpdate,
    TaskType, AgentStatus, get_global_client,
    create_code_generation_task, create_code_review_task, create_bug_fix_task
)
from app.database.models import AgentRun, AgentRunStatus
from app.repositories.agent_run_repository import AgentRunRepository
from app.websocket.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agents"])


# Request/Response Models
class CreateAgentRequest(BaseModel):
    task_type: str = Field(..., description="Type of task (code_generation, code_review, bug_fix, etc.)")
    description: str = Field(..., description="Detailed description of the task")
    repository_url: Optional[str] = Field(None, description="GitHub repository URL")
    branch: Optional[str] = Field("main", description="Git branch to work on")
    files: Optional[List[str]] = Field(None, description="Specific files to focus on")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the task")
    priority: int = Field(5, ge=1, le=10, description="Task priority (1-10)")
    timeout_minutes: int = Field(30, ge=5, le=120, description="Task timeout in minutes")
    streaming: bool = Field(True, description="Enable real-time streaming updates")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AgentRunResponse(BaseModel):
    id: str
    agent_id: str
    task_type: str
    description: str
    status: str
    progress: float
    created_at: datetime
    updated_at: datetime
    repository_url: Optional[str] = None
    branch: Optional[str] = None
    files: Optional[List[str]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    logs: Optional[List[str]] = None
    artifacts: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, Any]] = None


class QuickTaskRequest(BaseModel):
    description: str = Field(..., description="What you want the agent to do")
    repository_url: str = Field(..., description="GitHub repository URL")
    branch: Optional[str] = Field("main", description="Git branch")
    files: Optional[List[str]] = Field(None, description="Specific files to work on")


# Initialize repositories and services
agent_run_repo = AgentRunRepository()
notification_service = NotificationService()


@router.post("/runs", response_model=AgentRunResponse)
async def create_agent_run(request: CreateAgentRequest, background_tasks: BackgroundTasks):
    """Create a new agent run with full Codegen API integration"""
    try:
        # Validate task type
        try:
            task_type = TaskType(request.task_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task_type. Must be one of: {[t.value for t in TaskType]}"
            )
        
        # Create Codegen agent request
        codegen_request = CodegenAgentRequest(
            task_type=task_type,
            description=request.description,
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            context=request.context,
            priority=request.priority,
            timeout_minutes=request.timeout_minutes,
            streaming=request.streaming,
            metadata=request.metadata
        )
        
        # Get Codegen client and create agent run
        client = await get_global_client()
        codegen_response = await client.create_agent_run(codegen_request)
        
        # Store in local database
        agent_run = AgentRun(
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=AgentRunStatus(codegen_response.status.value),
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            context=request.context,
            task_metadata=request.metadata,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at
        )
        
        saved_run = await agent_run_repo.create(agent_run)
        
        # Start background monitoring if streaming is enabled
        if request.streaming:
            background_tasks.add_task(monitor_agent_run, codegen_response.agent_id)
        
        # Send notification
        await notification_service.send_notification({
            "type": "agent_run_created",
            "agent_id": codegen_response.agent_id,
            "task_type": task_type.value,
            "description": request.description[:100] + "..." if len(request.description) > 100 else request.description,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        logger.info(f"Created agent run: {codegen_response.agent_id} - {task_type.value}")
        
        return AgentRunResponse(
            id=saved_run.id,
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=codegen_response.status.value,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at,
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            result=codegen_response.result,
            error=codegen_response.error,
            logs=codegen_response.logs,
            artifacts=codegen_response.artifacts,
            metrics=codegen_response.metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent run: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent run: {str(e)}"
        )


@router.get("/runs", response_model=List[AgentRunResponse])
async def list_agent_runs(
    status_filter: Optional[str] = None,
    task_type_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List all agent runs with optional filtering"""
    try:
        # Get from local database first
        runs = await agent_run_repo.list_runs(
            status=status_filter,
            task_type=task_type_filter,
            limit=limit,
            offset=offset
        )
        
        # Convert to response format
        response_runs = []
        for run in runs:
            response_runs.append(AgentRunResponse(
                id=run.id,
                agent_id=run.agent_id,
                task_type=run.task_type,
                description=run.description,
                status=run.status.value,
                progress=run.progress or 0.0,
                created_at=run.created_at,
                updated_at=run.updated_at,
                repository_url=run.repository_url,
                branch=run.branch,
                files=run.files,
                result=run.result,
                error=run.error,
                logs=run.logs,
                artifacts=run.artifacts,
                metrics=run.metrics
            ))
        
        return response_runs
        
    except Exception as e:
        logger.error(f"Error listing agent runs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list agent runs: {str(e)}"
        )


@router.get("/runs/{agent_id}", response_model=AgentRunResponse)
async def get_agent_run(agent_id: str):
    """Get details of a specific agent run"""
    try:
        # Get from local database
        run = await agent_run_repo.get_by_agent_id(agent_id)
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent run not found: {agent_id}"
            )
        
        # Get latest status from Codegen API
        client = await get_global_client()
        try:
            codegen_response = await client.get_agent_run(agent_id)
            
            # Update local database with latest info
            run.status = AgentRunStatus(codegen_response.status.value)
            run.progress = codegen_response.progress
            run.updated_at = codegen_response.updated_at
            run.result = codegen_response.result
            run.error = codegen_response.error
            run.logs = codegen_response.logs
            run.artifacts = codegen_response.artifacts
            run.metrics = codegen_response.metrics
            
            await agent_run_repo.update(run)
            
        except Exception as e:
            logger.warning(f"Failed to get latest status from Codegen API: {e}")
        
        return AgentRunResponse(
            id=run.id,
            agent_id=run.agent_id,
            task_type=run.task_type,
            description=run.description,
            status=run.status.value,
            progress=run.progress or 0.0,
            created_at=run.created_at,
            updated_at=run.updated_at,
            repository_url=run.repository_url,
            branch=run.branch,
            files=run.files,
            result=run.result,
            error=run.error,
            logs=run.logs,
            artifacts=run.artifacts,
            metrics=run.metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent run: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent run: {str(e)}"
        )


@router.post("/runs/{agent_id}/cancel")
async def cancel_agent_run(agent_id: str):
    """Cancel a running agent"""
    try:
        # Cancel via Codegen API
        client = await get_global_client()
        success = await client.cancel_agent_run(agent_id)
        
        if success:
            # Update local database
            run = await agent_run_repo.get_by_agent_id(agent_id)
            if run:
                run.status = AgentRunStatus.CANCELLED
                run.updated_at = datetime.utcnow()
                await agent_run_repo.update(run)
            
            # Send notification
            await notification_service.send_notification({
                "type": "agent_run_cancelled",
                "agent_id": agent_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Cancelled agent run: {agent_id}")
            return {"message": "Agent run cancelled successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel agent run"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling agent run: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel agent run: {str(e)}"
        )


@router.get("/runs/{agent_id}/logs")
async def get_agent_logs(agent_id: str, limit: int = 100):
    """Get logs from an agent run"""
    try:
        client = await get_global_client()
        logs = await client.get_agent_logs(agent_id, limit)
        
        return {"logs": logs}
        
    except Exception as e:
        logger.error(f"Error getting agent logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent logs: {str(e)}"
        )


@router.get("/runs/{agent_id}/artifacts")
async def get_agent_artifacts(agent_id: str):
    """Get artifacts created by an agent run"""
    try:
        client = await get_global_client()
        artifacts = await client.get_agent_artifacts(agent_id)
        
        return {"artifacts": artifacts}
        
    except Exception as e:
        logger.error(f"Error getting agent artifacts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent artifacts: {str(e)}"
        )


@router.get("/runs/{agent_id}/metrics")
async def get_agent_metrics(agent_id: str):
    """Get performance metrics from an agent run"""
    try:
        client = await get_global_client()
        metrics = await client.get_agent_metrics(agent_id)
        
        return {"metrics": metrics}
        
    except Exception as e:
        logger.error(f"Error getting agent metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent metrics: {str(e)}"
        )


# Quick task endpoints for common operations
@router.post("/quick/code-generation", response_model=AgentRunResponse)
async def quick_code_generation(request: QuickTaskRequest, background_tasks: BackgroundTasks):
    """Quick code generation task"""
    try:
        codegen_response = await create_code_generation_task(
            description=request.description,
            repository_url=request.repository_url,
            branch=request.branch or "main",
            files=request.files
        )
        
        # Store in database
        agent_run = AgentRun(
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=AgentRunStatus(codegen_response.status.value),
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at
        )
        
        saved_run = await agent_run_repo.create(agent_run)
        
        # Start monitoring
        background_tasks.add_task(monitor_agent_run, codegen_response.agent_id)
        
        return AgentRunResponse(
            id=saved_run.id,
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=codegen_response.status.value,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at,
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files
        )
        
    except Exception as e:
        logger.error(f"Error creating quick code generation task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create code generation task: {str(e)}"
        )


@router.post("/quick/code-review", response_model=AgentRunResponse)
async def quick_code_review(request: QuickTaskRequest, background_tasks: BackgroundTasks):
    """Quick code review task"""
    try:
        codegen_response = await create_code_review_task(
            description=request.description,
            repository_url=request.repository_url,
            branch=request.branch or "main",
            files=request.files
        )
        
        # Store in database
        agent_run = AgentRun(
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=AgentRunStatus(codegen_response.status.value),
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at
        )
        
        saved_run = await agent_run_repo.create(agent_run)
        
        # Start monitoring
        background_tasks.add_task(monitor_agent_run, codegen_response.agent_id)
        
        return AgentRunResponse(
            id=saved_run.id,
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=codegen_response.status.value,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at,
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files
        )
        
    except Exception as e:
        logger.error(f"Error creating quick code review task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create code review task: {str(e)}"
        )


@router.post("/quick/bug-fix", response_model=AgentRunResponse)
async def quick_bug_fix(request: QuickTaskRequest, background_tasks: BackgroundTasks):
    """Quick bug fix task"""
    try:
        codegen_response = await create_bug_fix_task(
            description=request.description,
            repository_url=request.repository_url,
            branch=request.branch or "main"
        )
        
        # Store in database
        agent_run = AgentRun(
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=AgentRunStatus(codegen_response.status.value),
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at
        )
        
        saved_run = await agent_run_repo.create(agent_run)
        
        # Start monitoring
        background_tasks.add_task(monitor_agent_run, codegen_response.agent_id)
        
        return AgentRunResponse(
            id=saved_run.id,
            agent_id=codegen_response.agent_id,
            task_type=codegen_response.task_type.value,
            description=codegen_response.description,
            status=codegen_response.status.value,
            progress=codegen_response.progress,
            created_at=codegen_response.created_at,
            updated_at=codegen_response.updated_at,
            repository_url=request.repository_url,
            branch=request.branch,
            files=request.files
        )
        
    except Exception as e:
        logger.error(f"Error creating quick bug fix task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bug fix task: {str(e)}"
        )


@router.get("/status")
async def get_agent_status():
    """Get overall agent system status"""
    try:
        client = await get_global_client()
        api_healthy = await client.health_check()
        
        # Get recent runs
        recent_runs = await agent_run_repo.list_runs(limit=10)
        
        # Calculate stats
        total_runs = len(recent_runs)
        running_runs = len([r for r in recent_runs if r.status == AgentRunStatus.RUNNING])
        completed_runs = len([r for r in recent_runs if r.status == AgentRunStatus.COMPLETED])
        failed_runs = len([r for r in recent_runs if r.status == AgentRunStatus.FAILED])
        
        return {
            "codegen_api_healthy": api_healthy,
            "total_runs": total_runs,
            "running_runs": running_runs,
            "completed_runs": completed_runs,
            "failed_runs": failed_runs,
            "success_rate": (completed_runs / max(total_runs, 1)) * 100,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent status: {str(e)}"
        )


async def monitor_agent_run(agent_id: str):
    """Background task to monitor agent run progress"""
    try:
        client = await get_global_client()
        
        async for update in client.stream_agent_updates(agent_id):
            # Update local database
            run = await agent_run_repo.get_by_agent_id(agent_id)
            if run:
                if update.event_type == "progress":
                    run.progress = update.data.get("progress", run.progress)
                elif update.event_type == "completion":
                    run.status = AgentRunStatus.COMPLETED
                    run.result = update.data.get("result")
                    run.progress = 1.0
                elif update.event_type == "error":
                    run.status = AgentRunStatus.FAILED
                    run.error = update.data.get("error")
                
                run.updated_at = update.timestamp
                await agent_run_repo.update(run)
            
            # Send real-time notification
            await notification_service.send_notification({
                "type": "agent_update",
                "agent_id": agent_id,
                "event_type": update.event_type,
                "data": update.data,
                "timestamp": update.timestamp.isoformat()
            })
            
            # Stop monitoring if completed or failed
            if update.event_type in ["completion", "error"]:
                break
                
    except Exception as e:
        logger.error(f"Error monitoring agent run {agent_id}: {e}")
        
        # Mark as failed if monitoring fails
        try:
            run = await agent_run_repo.get_by_agent_id(agent_id)
            if run and run.status == AgentRunStatus.RUNNING:
                run.status = AgentRunStatus.FAILED
                run.error = f"Monitoring failed: {str(e)}"
                run.updated_at = datetime.utcnow()
                await agent_run_repo.update(run)
        except Exception as update_error:
            logger.error(f"Failed to update failed agent run: {update_error}")
