"""
Project Management API Routes
Handles CRUD operations for projects and their configurations
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import logging
from datetime import datetime
import uuid

from app.models.api.api_models import (
    ProjectResponse, CreateProjectRequest, UpdateProjectRequest,
    ProjectAgentRunResponse, CreateAgentRunRequest, ValidationPipelineResponse
)
from app.api.v1.dependencies import get_current_user
from app.services.adapters.codegen_adapter import CodegenAdapter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# In-memory storage for demo purposes (replace with database in production)
projects_db = {}
agent_runs_db = {}
validations_db = {}


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    current_user: dict = Depends(get_current_user)
):
    """List all projects for the current user's organization"""
    try:
        # Filter projects by organization
        org_projects = [
            project for project in projects_db.values()
            if project.get("organization_id") == current_user.get("organization_id")
        ]
        
        return [ProjectResponse(**project) for project in org_projects]
        
    except Exception as e:
        logger.error(f"❌ Failed to list projects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve projects"
        )


@router.post("/", response_model=ProjectResponse)
async def create_project(
    request: CreateProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project"""
    try:
        project_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        project = {
            "id": project_id,
            "name": request.name,
            "description": request.description,
            "webhook_url": request.webhook_url,
            "github_repo": request.github_repo,
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "organization_id": current_user.get("organization_id"),
            "deployment_settings": {
                "build_command": request.deployment_settings.get("build_command", "npm run build"),
                "deploy_command": request.deployment_settings.get("deploy_command", "npm run deploy"),
                "health_check_url": request.deployment_settings.get("health_check_url", "/health"),
                "environment_variables": request.deployment_settings.get("environment_variables", {})
            },
            "validation_settings": {
                "auto_merge": request.validation_settings.get("auto_merge", False),
                "required_checks": request.validation_settings.get("required_checks", []),
                "timeout_minutes": request.validation_settings.get("timeout_minutes", 30),
                "max_retries": request.validation_settings.get("max_retries", 3)
            }
        }
        
        projects_db[project_id] = project
        
        logger.info(f"✅ Created project {project_id}: {request.name}")
        return ProjectResponse(**project)
        
    except Exception as e:
        logger.error(f"❌ Failed to create project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific project by ID"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return ProjectResponse(**project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve project"
        )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing project"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Update fields
        if request.name is not None:
            project["name"] = request.name
        if request.description is not None:
            project["description"] = request.description
        if request.webhook_url is not None:
            project["webhook_url"] = request.webhook_url
        if request.github_repo is not None:
            project["github_repo"] = request.github_repo
        if request.status is not None:
            project["status"] = request.status
        
        project["updated_at"] = datetime.utcnow().isoformat()
        
        logger.info(f"✅ Updated project {project_id}")
        return ProjectResponse(**project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a project"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        del projects_db[project_id]
        
        logger.info(f"✅ Deleted project {project_id}")
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )


@router.post("/{project_id}/agent-runs", response_model=ProjectAgentRunResponse)
async def create_agent_run(
    project_id: str,
    request: CreateAgentRunRequest,
    current_user: dict = Depends(get_current_user),
    codegen_service: CodegenAdapter = Depends()
):
    """Start a new agent run for a project"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Create agent run via Codegen service
        run_id = str(uuid.uuid4())
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        agent_run = {
            "id": run_id,
            "project_id": project_id,
            "target_text": request.target_text,
            "status": "pending",
            "progress_percentage": 0,
            "retry_count": 0,
            "session_id": session_id,
            "created_at": now,
            "updated_at": now,
            "organization_id": current_user.get("organization_id")
        }
        
        agent_runs_db[run_id] = agent_run
        
        # TODO: Actually start the agent run via Codegen API
        # For now, just return the created run
        
        logger.info(f"✅ Created agent run {run_id} for project {project_id}")
        return ProjectAgentRunResponse(**agent_run)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create agent run: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create agent run"
        )


@router.get("/{project_id}/agent-runs", response_model=List[ProjectAgentRunResponse])
async def list_agent_runs(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all agent runs for a project"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Filter agent runs by project
        project_runs = [
            run for run in agent_runs_db.values()
            if run.get("project_id") == project_id
        ]
        
        return [ProjectAgentRunResponse(**run) for run in project_runs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to list agent runs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve agent runs"
        )


@router.post("/{project_id}/validations", response_model=ValidationPipelineResponse)
async def create_validation_pipeline(
    project_id: str,
    pull_request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Create a new validation pipeline for a PR"""
    try:
        project = projects_db.get(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check organization access
        if project.get("organization_id") != current_user.get("organization_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        validation_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        validation = {
            "id": validation_id,
            "project_id": project_id,
            "pull_request_id": pull_request_id,
            "status": "pending",
            "progress_percentage": 0,
            "created_at": now,
            "organization_id": current_user.get("organization_id")
        }
        
        validations_db[validation_id] = validation
        
        logger.info(f"✅ Created validation pipeline {validation_id}")
        return ValidationPipelineResponse(**validation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create validation pipeline: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create validation pipeline"
        )
