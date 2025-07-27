"""
Agent run repository for database operations.
Handles CRUD operations for agent runs with proper error handling and logging.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc, asc

from ..database.models import AgentRun, AgentRunStatus
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class AgentRunRepository:
    """Repository for agent run database operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create(self, run_data: Dict[str, Any]) -> Optional[AgentRun]:
        """Create a new agent run"""
        try:
            with self.db_manager.session_scope() as session:
                agent_run = AgentRun(
                    id=run_data['id'],
                    project_id=run_data['project_id'],
                    target_text=run_data['target_text'],
                    status=AgentRunStatus(run_data.get('status', 'pending')),
                    session_id=run_data.get('session_id', ''),
                    response_type=run_data.get('response_type'),
                    response_data=run_data.get('response_data', {})
                )
                
                session.add(agent_run)
                session.flush()
                session.refresh(agent_run)
                
                logger.info(f"Created agent run: {agent_run.id}")
                return agent_run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create agent run: {e}")
            return None
    
    def get_by_id(self, run_id: str) -> Optional[AgentRun]:
        """Get agent run by ID"""
        try:
            with self.db_manager.session_scope() as session:
                run = session.query(AgentRun).filter(AgentRun.id == run_id).first()
                if run:
                    session.expunge(run)
                return run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get agent run {run_id}: {e}")
            return None
    
    def get_by_project(self, project_id: str, limit: int = 100) -> List[AgentRun]:
        """Get agent runs for a project"""
        try:
            with self.db_manager.session_scope() as session:
                runs = session.query(AgentRun).filter(
                    AgentRun.project_id == project_id
                ).order_by(desc(AgentRun.created_at)).limit(limit).all()
                
                for run in runs:
                    session.expunge(run)
                
                return runs
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get agent runs for project {project_id}: {e}")
            return []
    
    def update(self, run_id: str, update_data: Dict[str, Any]) -> Optional[AgentRun]:
        """Update agent run"""
        try:
            with self.db_manager.session_scope() as session:
                run = session.query(AgentRun).filter(AgentRun.id == run_id).first()
                
                if not run:
                    return None
                
                for field, value in update_data.items():
                    if hasattr(run, field):
                        if field == 'status' and isinstance(value, str):
                            setattr(run, field, AgentRunStatus(value))
                        else:
                            setattr(run, field, value)
                
                session.flush()
                session.refresh(run)
                session.expunge(run)
                
                return run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to update agent run {run_id}: {e}")
            return None
