"""
Enhanced Projects API endpoints with database integration and full CI/CD automation
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
import os

from ..database.database import get_database_session
from ..database.models import Project, AgentRun, ValidationState, create_project_id, create_agent_run_id
from ..services.github_client import GitHubClient
from ..services.codegen_service import CodegenService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


# Request/Response Models
class ProjectCreateRequest(BaseModel):
    name: str
    github_url: str
    repository_rules: str = ""
    setup_commands: List[str] = []
    secrets: Dict[str, str] = {}
    planning_statement: str = ""
    auto_merge_enabled: bool = False
    auto_confirm_plans: bool = False


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    repository_rules: Optional[str] = None
    setup_commands: Optional[List[str]] = None
    secrets: Optional[Dict[str, str]] = None
    planning_statement: Optional[str] = None
    auto_merge_enabled: Optional[bool] = None
    auto_confirm_plans: Optional[bool] = None
    is_pinned: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    github_url: str
    github_owner: str
    github_repo: str
    webhook_url: Optional[str]
    webhook_id: Optional[str]
    repository_rules: str
    setup_commands: List[str]
    secrets: Dict[str, str]
    planning_statement: str
    auto_merge_enabled: bool
    auto_confirm_plans: bool
    is_pinned: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AgentRunRequest(BaseModel):
    target_text: str
    project_context: Dict[str, Any] = {}


class AgentRunResponse(BaseModel):
    id: str
    project_id: str
    target_text: str
    status: str
    response_type: Optional[str]
    plan_content: Optional[str]
    pr_number: Optional[int]
    pr_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class RepositoryInfo(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: Optional[str]
    private: bool
    default_branch: str
    updated_at: str


class BranchInfo(BaseModel):
    name: str
    commit_sha: str
    protected: bool = False


class WebhookRequest(BaseModel):
    eventType: str
    action: str
    deliveryId: str
    payload: Dict[str, Any]
    headers: Dict[str, str]


# API Endpoints
@router.get("/repositories")
async def get_repositories():
    """Get all available GitHub repositories for the authenticated user"""
    try:
        async with GitHubClient() as github:
            # Get user repositories
            user_repos = await github.get_user_repositories()
            
            repositories = []
            for repo in user_repos:
                repositories.append(RepositoryInfo(
                    id=repo["id"],
                    name=repo["name"],
                    full_name=repo["full_name"],
                    html_url=repo["html_url"],
                    description=repo.get("description"),
                    private=repo["private"],
                    default_branch=repo["default_branch"],
                    updated_at=repo["updated_at"]
                ))
            
            logger.info(f"Retrieved {len(repositories)} repositories")
            return {"repositories": repositories}
            
    except Exception as e:
        logger.error(f"Failed to get repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """Create a new project and set up GitHub webhook"""
    try:
        # Parse GitHub URL
        async with GitHubClient() as github:
            owner, repo = github.parse_repository_url(request.github_url)
            
            # Validate repository access
            has_access = await github.validate_repository_access(owner, repo)
            if not has_access:
                raise HTTPException(
                    status_code=403, 
                    detail=f"No access to repository {owner}/{repo}"
                )
        
        # Create project record
        project_id = create_project_id()
        project = Project(
            id=project_id,
            name=request.name,
            github_url=request.github_url,
            github_owner=owner,
            github_repo=repo,
            repository_rules=request.repository_rules,
            setup_commands=request.setup_commands,
            secrets=request.secrets,
            planning_statement=request.planning_statement,
            auto_merge_enabled=request.auto_merge_enabled,
            auto_confirm_plans=request.auto_confirm_plans,
            is_pinned=True  # Auto-pin when created
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Set up webhook in background
        background_tasks.add_task(setup_project_webhook, project.id, owner, repo)
        
        logger.info(f"Created project {project.name} ({project.id})")
        return ProjectResponse.from_orm(project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    pinned_only: bool = False,
    db: Session = Depends(get_database_session)
):
    """List all projects"""
    try:
        query = db.query(Project)
        if pinned_only:
            query = query.filter(Project.is_pinned == True)
        
        projects = query.order_by(Project.updated_at.desc()).all()
        
        return [ProjectResponse.from_orm(project) for project in projects]
        
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: Session = Depends(get_database_session)):
    """Get a specific project"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectResponse.from_orm(project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: ProjectUpdateRequest,
    db: Session = Depends(get_database_session)
):
    """Update a project"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update fields if provided
        update_data = request.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        
        db.commit()
        db.refresh(project)
        
        logger.info(f"Updated project {project.name} ({project.id})")
        return ProjectResponse.from_orm(project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """Delete a project and clean up webhook"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Clean up webhook in background
        if project.webhook_id:
            background_tasks.add_task(
                cleanup_project_webhook, 
                project.github_owner, 
                project.github_repo, 
                project.webhook_id
            )
        
        db.delete(project)
        db.commit()
        
        logger.info(f"Deleted project {project.name} ({project.id})")
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/branches")
async def get_project_branches(
    project_id: str,
    db: Session = Depends(get_database_session)
):
    """Get branches for a project repository"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        async with GitHubClient() as github:
            branches_data = await github.get_repository_branches(
                project.github_owner, 
                project.github_repo
            )
            
            branches = []
            for branch in branches_data:
                branches.append(BranchInfo(
                    name=branch["name"],
                    commit_sha=branch["commit"]["sha"],
                    protected=branch.get("protected", False)
                ))
        
        return {"branches": branches}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get branches for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/agent-run", response_model=AgentRunResponse)
async def create_agent_run(
    project_id: str,
    request: AgentRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """Create an agent run for a project"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Create agent run record
        agent_run_id = create_agent_run_id()
        
        # Build full prompt with project context
        full_prompt = build_agent_prompt(project, request.target_text)
        
        agent_run = AgentRun(
            id=agent_run_id,
            project_id=project_id,
            target_text=request.target_text,
            full_prompt=full_prompt,
            status="pending"
        )
        
        db.add(agent_run)
        db.commit()
        db.refresh(agent_run)
        
        # Execute agent run in background
        background_tasks.add_task(
            execute_agent_run, 
            agent_run.id, 
            full_prompt, 
            project.auto_confirm_plans
        )
        
        logger.info(f"Created agent run {agent_run.id} for project {project.name}")
        return AgentRunResponse.from_orm(agent_run)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create agent run: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/runs")
async def list_agent_runs(
    project_id: str,
    limit: int = 10,
    db: Session = Depends(get_database_session)
):
    """List agent runs for a project"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        runs = db.query(AgentRun)\
            .filter(AgentRun.project_id == project_id)\
            .order_by(AgentRun.created_at.desc())\
            .limit(limit)\
            .all()
        
        return {"runs": [AgentRunResponse.from_orm(run) for run in runs]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list agent runs for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/validate")
async def validate_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """Validate a project's current state and configuration"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        validation_result = {
            "project_id": project_id,
            "status": "running",
            "checks": []
        }
        
        # Validate GitHub repository access
        try:
            async with GitHubClient() as github:
                has_access = await github.validate_repository_access(
                    project.github_owner, 
                    project.github_repo
                )
                validation_result["checks"].append({
                    "name": "repository_access",
                    "status": "passed" if has_access else "failed",
                    "message": "Repository access validated" if has_access else "No access to repository"
                })
        except Exception as e:
            validation_result["checks"].append({
                "name": "repository_access",
                "status": "failed",
                "message": str(e)
            })
        
        # Validate webhook configuration
        webhook_status = "passed" if project.webhook_id else "warning"
        webhook_message = "Webhook configured" if project.webhook_id else "No webhook configured"
        validation_result["checks"].append({
            "name": "webhook_configuration",
            "status": webhook_status,
            "message": webhook_message
        })
        
        # Validate setup commands
        commands_status = "passed" if project.setup_commands else "warning"
        commands_message = f"{len(project.setup_commands)} setup commands configured" if project.setup_commands else "No setup commands configured"
        validation_result["checks"].append({
            "name": "setup_commands",
            "status": commands_status,
            "message": commands_message
        })
        
        # Overall status
        failed_checks = [c for c in validation_result["checks"] if c["status"] == "failed"]
        if failed_checks:
            validation_result["status"] = "failed"
        else:
            validation_result["status"] = "passed"
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Webhook handler
@router.post("/webhooks/github")
async def handle_github_webhook(
    webhook_data: WebhookRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database_session)
):
    """Handle GitHub webhook events"""
    try:
        logger.info(f"Received GitHub webhook: {webhook_data.eventType} - {webhook_data.action}")
        
        # Process webhook based on event type
        if webhook_data.eventType == "pull_request":
            background_tasks.add_task(handle_pull_request_webhook, webhook_data, db)
        elif webhook_data.eventType == "push":
            background_tasks.add_task(handle_push_webhook, webhook_data, db)
        
        return {"status": "received", "event": webhook_data.eventType}
        
    except Exception as e:
        logger.error(f"Failed to handle webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background task functions
async def setup_project_webhook(project_id: str, owner: str, repo: str):
    """Set up GitHub webhook for a project"""
    try:
        cloudflare_url = os.getenv("CLOUDFLARE_WORKER_URL")
        if not cloudflare_url:
            logger.error("CLOUDFLARE_WORKER_URL not configured")
            return
        
        async with GitHubClient() as github:
            webhook = await github.create_webhook(
                owner, 
                repo, 
                cloudflare_url,
                events=["pull_request", "push", "pull_request_review"]
            )
            
            # Update project with webhook info
            from ..database.database import SessionLocal
            db = SessionLocal()
            try:
                project = db.query(Project).filter(Project.id == project_id).first()
                if project:
                    project.webhook_url = webhook["config"]["url"]
                    project.webhook_id = str(webhook["id"])
                    db.commit()
                    logger.info(f"Set up webhook {webhook['id']} for project {project_id}")
            finally:
                db.close()
                
    except Exception as e:
        logger.error(f"Failed to set up webhook for project {project_id}: {e}")


async def cleanup_project_webhook(owner: str, repo: str, webhook_id: str):
    """Clean up GitHub webhook for a project"""
    try:
        async with GitHubClient() as github:
            success = await github.delete_webhook(owner, repo, webhook_id)
            if success:
                logger.info(f"Cleaned up webhook {webhook_id} for {owner}/{repo}")
            else:
                logger.warning(f"Failed to clean up webhook {webhook_id} for {owner}/{repo}")
                
    except Exception as e:
        logger.error(f"Failed to clean up webhook {webhook_id}: {e}")


async def execute_agent_run(agent_run_id: str, prompt: str, auto_confirm: bool):
    """Execute an agent run in the background"""
    try:
        from ..database.database import SessionLocal
        db = SessionLocal()
        
        try:
            agent_run = db.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
            if not agent_run:
                logger.error(f"Agent run {agent_run_id} not found")
                return
            
            # Update status to running
            agent_run.status = "running"
            agent_run.started_at = func.now()
            db.commit()
            
            # Execute with Codegen service
            codegen_service = CodegenService()
            result = await codegen_service.create_agent_run(
                prompt=prompt,
                context={"project_id": agent_run.project_id}
            )
            
            # Update agent run with results
            agent_run.codegen_run_id = result.get("id")
            agent_run.status = "completed"
            agent_run.completed_at = func.now()
            
            # Handle different response types
            if "plan" in result:
                agent_run.response_type = "plan"
                agent_run.plan_content = result["plan"]
                agent_run.plan_generated = True
                
                # Auto-confirm if enabled
                if auto_confirm:
                    # TODO: Implement plan confirmation
                    pass
                    
            elif "pr_url" in result:
                agent_run.response_type = "pr"
                agent_run.pr_url = result["pr_url"]
                agent_run.pr_created = True
                
            else:
                agent_run.response_type = "regular"
            
            db.commit()
            logger.info(f"Completed agent run {agent_run_id}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Failed to execute agent run {agent_run_id}: {e}")
        
        # Update status to failed
        from ..database.database import SessionLocal
        db = SessionLocal()
        try:
            agent_run = db.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
            if agent_run:
                agent_run.status = "failed"
                agent_run.error_message = str(e)
                agent_run.completed_at = func.now()
                db.commit()
        finally:
            db.close()


async def handle_pull_request_webhook(webhook_data: WebhookRequest, db: Session):
    """Handle pull request webhook events"""
    try:
        payload = webhook_data.payload
        pr = payload.get("pull_request", {})
        repository = payload.get("repository", {})
        
        # Find project by repository
        project = db.query(Project).filter(
            Project.github_owner == repository.get("owner", {}).get("login"),
            Project.github_repo == repository.get("name")
        ).first()
        
        if not project:
            logger.warning(f"No project found for repository {repository.get('full_name')}")
            return
        
        # Handle different PR actions
        action = webhook_data.action
        if action in ["opened", "synchronize"]:
            # Start validation pipeline
            logger.info(f"Starting validation for PR #{pr.get('number')} in project {project.name}")
            # TODO: Implement validation pipeline
            
        elif action == "closed" and pr.get("merged"):
            logger.info(f"PR #{pr.get('number')} merged in project {project.name}")
            
    except Exception as e:
        logger.error(f"Failed to handle pull request webhook: {e}")


async def handle_push_webhook(webhook_data: WebhookRequest, db: Session):
    """Handle push webhook events"""
    try:
        payload = webhook_data.payload
        repository = payload.get("repository", {})
        ref = payload.get("ref", "")
        
        # Only handle pushes to main branches
        if not ref.endswith(("/main", "/master", "/develop")):
            return
        
        # Find project by repository
        project = db.query(Project).filter(
            Project.github_owner == repository.get("owner", {}).get("login"),
            Project.github_repo == repository.get("name")
        ).first()
        
        if not project:
            logger.warning(f"No project found for repository {repository.get('full_name')}")
            return
        
        logger.info(f"Push to {ref} in project {project.name}")
        
    except Exception as e:
        logger.error(f"Failed to handle push webhook: {e}")


def build_agent_prompt(project: Project, target_text: str) -> str:
    """Build complete prompt for agent run with project context"""
    prompt_parts = []
    
    # Add planning statement if configured
    if project.planning_statement:
        prompt_parts.append(f"Planning Statement: {project.planning_statement}")
    
    # Add project context
    prompt_parts.append(f"Project: {project.name}")
    prompt_parts.append(f"Repository: {project.github_url}")
    
    # Add repository rules if configured
    if project.repository_rules:
        prompt_parts.append(f"Repository Rules: {project.repository_rules}")
    
    # Add target text
    prompt_parts.append(f"Target/Goal: {target_text}")
    
    return "\n\n".join(prompt_parts)

