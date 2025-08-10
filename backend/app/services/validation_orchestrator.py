"""
Validation orchestrator for PR validation pipeline
"""
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ..database.database import SessionLocal
from ..database.models import Project, ValidationState, create_validation_id

logger = logging.getLogger(__name__)


class ValidationOrchestrator:
    """Orchestrates the complete PR validation pipeline"""
    
    def __init__(self):
        pass
    
    async def start_validation(
        self, 
        project_id: str, 
        pr_number: int, 
        pr_url: str, 
        pr_branch: str, 
        commit_sha: str,
        agent_run_id: Optional[str] = None
    ) -> str:
        """Start the validation pipeline for a PR"""
        try:
            validation_id = create_validation_id()
            
            db = SessionLocal()
            try:
                project = db.query(Project).filter(Project.id == project_id).first()
                if not project:
                    raise ValueError(f"Project {project_id} not found")
                
                validation_state = ValidationState(
                    id=validation_id,
                    project_id=project_id,
                    agent_run_id=agent_run_id,
                    pr_number=pr_number,
                    pr_url=pr_url,
                    pr_branch=pr_branch,
                    pr_commit_sha=commit_sha,
                    status="pending"
                )
                
                db.add(validation_state)
                db.commit()
                db.refresh(validation_state)
                
                logger.info(f"Started validation {validation_id} for PR #{pr_number}")
                
            finally:
                db.close()
            
            # Start validation pipeline in background
            asyncio.create_task(self._run_validation_pipeline(validation_id))
            
            return validation_id
            
        except Exception as e:
            logger.error(f"Failed to start validation: {e}")
            raise
    
    async def _run_validation_pipeline(self, validation_id: str):
        """Run the complete validation pipeline"""
        db = SessionLocal()
        try:
            validation = db.query(ValidationState).filter(ValidationState.id == validation_id).first()
            if not validation:
                logger.error(f"Validation {validation_id} not found")
                return
            
            project = db.query(Project).filter(Project.id == validation.project_id).first()
            if not project:
                logger.error(f"Project {validation.project_id} not found")
                return
            
            # Update status to running
            validation.status = "running"
            validation.started_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Running validation pipeline for {validation_id}")
            
            # Validation steps would go here
            # For now, just mark as completed
            validation.status = "completed"
            validation.completed_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Validation pipeline completed for {validation_id}")
            
        except Exception as e:
            logger.error(f"Validation pipeline failed for {validation_id}: {e}")
            validation.status = "failed"
            validation.error_message = str(e)
            validation.completed_at = datetime.utcnow()
            db.commit()
                
        finally:
            db.close()
    
    async def get_validation_status(self, validation_id: str) -> Optional[Dict[str, Any]]:
        """Get current validation status"""
        try:
            db = SessionLocal()
            try:
                validation = db.query(ValidationState).filter(ValidationState.id == validation_id).first()
                if not validation:
                    return None
                
                return {
                    "id": validation.id,
                    "project_id": validation.project_id,
                    "pr_number": validation.pr_number,
                    "pr_url": validation.pr_url,
                    "status": validation.status,
                    "error_message": validation.error_message,
                    "created_at": validation.created_at.isoformat() if validation.created_at else None,
                    "started_at": validation.started_at.isoformat() if validation.started_at else None,
                    "completed_at": validation.completed_at.isoformat() if validation.completed_at else None
                }
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Failed to get validation status for {validation_id}: {e}")
            return None

