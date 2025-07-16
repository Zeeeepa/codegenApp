"""
Project management API endpoints.

Provides REST API endpoints for managing projects,
their settings, and configurations in the CI/CD system.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from ..database.connection import get_db
from ..models import Project, ProjectSettings, AuditLog, AuditAction
from ..orchestration.state_manager import StateManager


router = APIRouter(prefix="/api/v1/projects", tags=["projects"])
state_manager = StateManager()


# Pydantic models for request/response
class ProjectCreate(BaseModel):
    """Request model for creating a project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    webhook_url: str = Field(..., min_length=1, max_length=500)
    github_repo: str = Field(..., min_length=1, max_length=255)
    deployment_settings: Optional[dict] = None
    validation_settings: Optional[dict] = None
    notification_settings: Optional[dict] = None


class ProjectUpdate(BaseModel):
    """Request model for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    webhook_url: Optional[str] = Field(None, min_length=1, max_length=500)
    github_repo: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = Field(None, regex="^(active|inactive|archived)$")


class ProjectSettingsUpdate(BaseModel):
    """Request model for updating project settings."""
    deployment_settings: Optional[dict] = None
    validation_settings: Optional[dict] = None
    notification_settings: Optional[dict] = None


class ProjectResponse(BaseModel):
    """Response model for project data."""
    id: str
    name: str
    description: Optional[str]
    webhook_url: str
    github_repo: str
    status: str
    created_at: str
    updated_at: str
    last_run: Optional[str]
    deployment_settings: dict
    validation_settings: dict


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List all projects with optional filtering.
    
    Args:
        status: Filter by project status (optional)
        limit: Maximum number of results
        offset: Number of results to skip
        db: Database session
        
    Returns:
        List of projects
    """
    query = db.query(Project)
    
    if status:
        query = query.filter(Project.status == status)
    
    projects = query.offset(offset).limit(limit).all()
    
    return [
        ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            webhook_url=project.webhook_url,
            github_repo=project.github_repo,
            status=project.status,
            created_at=project.created_at.isoformat() if project.created_at else "",
            updated_at=project.updated_at.isoformat() if project.updated_at else "",
            last_run=project.last_run.isoformat() if project.last_run else None,
            deployment_settings=project.settings.deployment_settings if project.settings else {},
            validation_settings=project.settings.validation_settings if project.settings else {}
        )
        for project in projects
    ]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Create a new project.
    
    Args:
        project_data: Project creation data
        user_id: ID of the user creating the project (optional)
        db: Database session
        
    Returns:
        Created project data
    """
    # Generate project ID
    project_id = str(uuid.uuid4())
    
    # Create project
    project = Project(
        id=project_id,
        name=project_data.name,
        description=project_data.description,
        webhook_url=project_data.webhook_url,
        github_repo=project_data.github_repo,
        status="active"
    )
    
    db.add(project)
    db.flush()  # Get the project ID
    
    # Create project settings
    settings = ProjectSettings(
        project_id=project_id,
        deployment_settings=project_data.deployment_settings or {
            "build_command": "npm run build",
            "deploy_command": "npm run deploy",
            "health_check_url": "",
            "environment_variables": {}
        },
        validation_settings=project_data.validation_settings or {
            "auto_merge": True,
            "required_checks": ["build", "test", "security"],
            "timeout_minutes": 30,
            "max_retries": 3
        },
        notification_settings=project_data.notification_settings or {
            "slack_webhook": "",
            "email_notifications": True,
            "github_status_updates": True
        }
    )
    
    db.add(settings)
    
    # Create audit log
    audit_log = AuditLog.create_log(
        action=AuditAction.PROJECT_CREATED,
        description=f"Created project '{project_data.name}'",
        entity_type="project",
        entity_id=project_id,
        project_id=project_id,
        user_id=user_id,
        metadata={
            "name": project_data.name,
            "github_repo": project_data.github_repo
        }
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(project)
    db.refresh(settings)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        webhook_url=project.webhook_url,
        github_repo=project.github_repo,
        status=project.status,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        last_run=None,
        deployment_settings=settings.deployment_settings,
        validation_settings=settings.validation_settings
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: Session = Depends(get_db)):
    """
    Get a specific project by ID.
    
    Args:
        project_id: ID of the project to retrieve
        db: Database session
        
    Returns:
        Project data
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        webhook_url=project.webhook_url,
        github_repo=project.github_repo,
        status=project.status,
        created_at=project.created_at.isoformat() if project.created_at else "",
        updated_at=project.updated_at.isoformat() if project.updated_at else "",
        last_run=project.last_run.isoformat() if project.last_run else None,
        deployment_settings=project.settings.deployment_settings if project.settings else {},
        validation_settings=project.settings.validation_settings if project.settings else {}
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update a project.
    
    Args:
        project_id: ID of the project to update
        project_data: Project update data
        user_id: ID of the user updating the project (optional)
        db: Database session
        
    Returns:
        Updated project data
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    # Store old values for audit
    old_values = project.to_dict()
    
    # Update fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.webhook_url is not None:
        project.webhook_url = project_data.webhook_url
    if project_data.github_repo is not None:
        project.github_repo = project_data.github_repo
    if project_data.status is not None:
        project.status = project_data.status
    
    # Create audit log
    audit_log = AuditLog.create_log(
        action=AuditAction.PROJECT_UPDATED,
        description=f"Updated project '{project.name}'",
        entity_type="project",
        entity_id=project_id,
        project_id=project_id,
        user_id=user_id,
        old_values=old_values,
        new_values=project.to_dict()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        webhook_url=project.webhook_url,
        github_repo=project.github_repo,
        status=project.status,
        created_at=project.created_at.isoformat() if project.created_at else "",
        updated_at=project.updated_at.isoformat() if project.updated_at else "",
        last_run=project.last_run.isoformat() if project.last_run else None,
        deployment_settings=project.settings.deployment_settings if project.settings else {},
        validation_settings=project.settings.validation_settings if project.settings else {}
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Delete a project.
    
    Args:
        project_id: ID of the project to delete
        user_id: ID of the user deleting the project (optional)
        db: Database session
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    # Create audit log before deletion
    audit_log = AuditLog.create_log(
        action=AuditAction.PROJECT_DELETED,
        description=f"Deleted project '{project.name}'",
        entity_type="project",
        entity_id=project_id,
        project_id=project_id,
        user_id=user_id,
        old_values=project.to_dict()
    )
    db.add(audit_log)
    
    # Delete project (cascade will handle related records)
    db.delete(project)
    db.commit()


@router.put("/{project_id}/settings")
async def update_project_settings(
    project_id: str,
    settings_data: ProjectSettingsUpdate,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update project settings.
    
    Args:
        project_id: ID of the project
        settings_data: Settings update data
        user_id: ID of the user updating settings (optional)
        db: Database session
        
    Returns:
        Updated settings data
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    # Get or create settings
    settings = project.settings
    if not settings:
        settings = ProjectSettings(project_id=project_id)
        db.add(settings)
    
    # Store old values for audit
    old_values = settings.to_dict()
    
    # Update settings
    if settings_data.deployment_settings is not None:
        settings.deployment_settings = settings_data.deployment_settings
    if settings_data.validation_settings is not None:
        settings.validation_settings = settings_data.validation_settings
    if settings_data.notification_settings is not None:
        settings.notification_settings = settings_data.notification_settings
    
    # Create audit log
    audit_log = AuditLog.create_log(
        action=AuditAction.PROJECT_SETTINGS_UPDATED,
        description=f"Updated settings for project '{project.name}'",
        entity_type="project_settings",
        entity_id=str(settings.id),
        project_id=project_id,
        user_id=user_id,
        old_values=old_values,
        new_values=settings.to_dict()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(settings)
    
    return settings.to_dict()


@router.get("/{project_id}/status")
async def get_project_status(project_id: str, db: Session = Depends(get_db)):
    """
    Get current project status and workflow state.
    
    Args:
        project_id: ID of the project
        db: Database session
        
    Returns:
        Project status and workflow state
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    # Get workflow state from state manager
    workflow_state = state_manager.get_project_state(project_id)
    
    return {
        "project_id": project_id,
        "project_status": project.status,
        "workflow_state": workflow_state["workflow_state"],
        "active_runs": workflow_state["active_runs"],
        "active_validations": workflow_state["active_validations"],
        "last_activity": workflow_state["last_activity"],
        "last_run": project.last_run.isoformat() if project.last_run else None
    }

