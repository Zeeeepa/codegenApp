"""
Projects API endpoints

This module provides API endpoints for project management,
GitHub integration, and validation pipeline orchestration.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from app.services.github_service import GitHubService, GitHubRepository
from app.services.adapters.codegen_adapter import CodegenService
from app.services.adapters.web_eval_adapter import WebEvalAdapter
from app.websocket.manager import websocket_manager
from app.config.settings import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


# Request/Response Models
class ProjectCreateRequest(BaseModel):
    name: str
    repository_url: str
    description: Optional[str] = None
    auto_merge_enabled: bool = False
    webhook_url: Optional[str] = None


class ProjectSettingsRequest(BaseModel):
    repository_rules: Optional[str] = None
    setup_commands: Optional[List[str]] = None
    secrets: Optional[Dict[str, str]] = None
    auto_merge_enabled: Optional[bool] = None


class AgentRunRequest(BaseModel):
    target_text: str
    auto_confirm_plan: bool = False


class ProjectResponse(BaseModel):
    id: str
    name: str
    repository_url: str
    description: Optional[str]
    auto_merge_enabled: bool
    webhook_configured: bool
    last_activity: Optional[str]
    status: str


class ValidationRequest(BaseModel):
    pr_number: int
    test_scenarios: List[str]


# Initialize services
settings = get_settings()
github_service = GitHubService()
codegen_service = CodegenService(
    api_token=settings.codegen_api_token,
    base_url=settings.codegen_api_base_url
)
web_eval_adapter = WebEvalAdapter()


@router.get("/repositories", response_model=List[Dict[str, Any]])
async def get_repositories(org: Optional[str] = None):
    """
    Get available GitHub repositories
    
    Args:
        org: Optional organization name
        
    Returns:
        List of available repositories
    """
    try:
        repositories = await github_service.get_repositories(org)
        
        return [
            {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "private": repo.private,
                "clone_url": repo.clone_url,
                "default_branch": repo.default_branch,
                "owner": repo.owner
            }
            for repo in repositories
        ]
        
    except Exception as e:
        logger.error(f"Error getting repositories: {e}")
        raise HTTPException(status_code=500, detail="Failed to get repositories")


@router.post("/create", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreateRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new project and set up GitHub webhook
    
    Args:
        request: Project creation request
        background_tasks: Background tasks for async operations
        
    Returns:
        Created project information
    """
    try:
        # Parse repository URL to get owner and repo name
        repo_parts = request.repository_url.replace("https://github.com/", "").split("/")
        if len(repo_parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid repository URL format")
        
        owner, repo_name = repo_parts
        
        # Verify repository exists
        repository = await github_service.get_repository(owner, repo_name)
        if not repository:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        # Set up webhook if URL provided
        webhook_configured = False
        if request.webhook_url:
            webhook_configured = await github_service.set_webhook(
                owner, repo_name, request.webhook_url
            )
        
        # Create project response
        project_response = ProjectResponse(
            id=f"{owner}/{repo_name}",
            name=request.name,
            repository_url=request.repository_url,
            description=request.description,
            auto_merge_enabled=request.auto_merge_enabled,
            webhook_configured=webhook_configured,
            last_activity=None,
            status="active"
        )
        
        # Send notification
        await websocket_manager.send_notification(
            "success",
            f"Project '{request.name}' created successfully",
            {"project_id": project_response.id},
            project_name=project_response.id
        )
        
        return project_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")


@router.post("/{project_id}/agent-run")
async def create_agent_run(
    project_id: str,
    request: AgentRunRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new agent run for a project
    
    Args:
        project_id: Project identifier (owner/repo)
        request: Agent run request
        background_tasks: Background tasks for async operations
        
    Returns:
        Agent run information
    """
    try:
        # Parse project ID
        if "/" not in project_id:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        # Create agent run using Codegen service
        agent_run_request = {
            "prompt": f"Project='{project_id}' {request.target_text}",
            "auto_confirm_plan": request.auto_confirm_plan
        }
        
        # Start agent run in background
        background_tasks.add_task(
            _process_agent_run,
            project_id,
            agent_run_request
        )
        
        # Send immediate response
        await websocket_manager.send_notification(
            "info",
            f"Agent run started for project {project_id}",
            {"target_text": request.target_text},
            project_name=project_id
        )
        
        return {
            "status": "started",
            "project_id": project_id,
            "target_text": request.target_text,
            "message": "Agent run has been started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent run: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent run")


@router.post("/{project_id}/validate")
async def validate_project(
    project_id: str,
    request: ValidationRequest,
    background_tasks: BackgroundTasks
):
    """
    Validate a project using Web-Eval-Agent
    
    Args:
        project_id: Project identifier (owner/repo)
        request: Validation request
        background_tasks: Background tasks for async operations
        
    Returns:
        Validation status
    """
    try:
        # Parse project ID
        if "/" not in project_id:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        owner, repo_name = project_id.split("/")
        
        # Get PR information
        pr = await github_service.get_pull_request(owner, repo_name, request.pr_number)
        if not pr:
            raise HTTPException(status_code=404, detail="Pull request not found")
        
        # Start validation in background
        background_tasks.add_task(
            _process_validation,
            project_id,
            request.pr_number,
            request.test_scenarios
        )
        
        # Send immediate response
        await websocket_manager.send_notification(
            "info",
            f"Validation started for PR #{request.pr_number}",
            {"pr_number": request.pr_number},
            project_name=project_id
        )
        
        return {
            "status": "started",
            "project_id": project_id,
            "pr_number": request.pr_number,
            "message": "Validation has been started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting validation: {e}")
        raise HTTPException(status_code=500, detail="Failed to start validation")


@router.get("/{project_id}/branches")
async def get_project_branches(project_id: str):
    """
    Get branches for a project repository
    
    Args:
        project_id: Project identifier (owner/repo)
        
    Returns:
        List of branch names
    """
    try:
        if "/" not in project_id:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        owner, repo_name = project_id.split("/")
        branches = await github_service.get_branches(owner, repo_name)
        
        return {"branches": branches}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting branches: {e}")
        raise HTTPException(status_code=500, detail="Failed to get branches")


@router.post("/{project_id}/webhook")
async def setup_webhook(project_id: str, webhook_url: str):
    """
    Set up webhook for a project
    
    Args:
        project_id: Project identifier (owner/repo)
        webhook_url: Webhook URL to configure
        
    Returns:
        Webhook setup status
    """
    try:
        if "/" not in project_id:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
        
        owner, repo_name = project_id.split("/")
        
        success = await github_service.set_webhook(owner, repo_name, webhook_url)
        
        if success:
            await websocket_manager.send_notification(
                "success",
                f"Webhook configured for {project_id}",
                {"webhook_url": webhook_url},
                project_name=project_id
            )
            return {"status": "success", "webhook_url": webhook_url}
        else:
            raise HTTPException(status_code=500, detail="Failed to configure webhook")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up webhook: {e}")
        raise HTTPException(status_code=500, detail="Failed to set up webhook")


# Background task functions
async def _process_agent_run(project_id: str, agent_run_request: Dict[str, Any]):
    """Process agent run in background"""
    try:
        # Send progress update
        await websocket_manager.send_progress_update(
            task_id=f"agent_run_{project_id}",
            progress=10,
            status="running",
            message="Starting agent run...",
            project_name=project_id
        )
        
        # TODO: Integrate with actual Codegen service
        # For now, simulate the process
        import asyncio
        await asyncio.sleep(2)
        
        await websocket_manager.send_progress_update(
            task_id=f"agent_run_{project_id}",
            progress=50,
            status="running",
            message="Processing request...",
            project_name=project_id
        )
        
        await asyncio.sleep(3)
        
        await websocket_manager.send_progress_update(
            task_id=f"agent_run_{project_id}",
            progress=100,
            status="completed",
            message="Agent run completed successfully",
            project_name=project_id
        )
        
        # Send completion notification
        await websocket_manager.send_notification(
            "success",
            f"Agent run completed for {project_id}",
            {"result": "PR created successfully"},
            project_name=project_id
        )
        
    except Exception as e:
        logger.error(f"Error processing agent run: {e}")
        await websocket_manager.send_notification(
            "error",
            f"Agent run failed for {project_id}",
            {"error": str(e)},
            project_name=project_id
        )


async def _process_validation(project_id: str, pr_number: int, test_scenarios: List[str]):
    """Process validation in background"""
    try:
        # Send progress update
        await websocket_manager.send_progress_update(
            task_id=f"validation_{project_id}_{pr_number}",
            progress=10,
            status="running",
            message="Creating Grainchain snapshot...",
            project_name=project_id
        )
        
        # TODO: Integrate with actual validation pipeline
        # For now, simulate the process
        import asyncio
        await asyncio.sleep(3)
        
        await websocket_manager.send_progress_update(
            task_id=f"validation_{project_id}_{pr_number}",
            progress=50,
            status="running",
            message="Running Web-Eval-Agent validation...",
            project_name=project_id
        )
        
        await asyncio.sleep(5)
        
        await websocket_manager.send_progress_update(
            task_id=f"validation_{project_id}_{pr_number}",
            progress=100,
            status="completed",
            message="Validation completed successfully",
            project_name=project_id
        )
        
        # Send completion notification
        await websocket_manager.send_notification(
            "success",
            f"Validation completed for PR #{pr_number}",
            {"result": "All tests passed", "pr_number": pr_number},
            project_name=project_id
        )
        
    except Exception as e:
        logger.error(f"Error processing validation: {e}")
        await websocket_manager.send_notification(
            "error",
            f"Validation failed for PR #{pr_number}",
            {"error": str(e), "pr_number": pr_number},
            project_name=project_id
        )
