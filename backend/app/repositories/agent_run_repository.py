"""
Repository for Agent Run database operations.
Handles CRUD operations for agent runs with Codegen integration.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc, and_, or_
from datetime import datetime
import uuid

from ..database.models import AgentRun, AgentRunStatus
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class AgentRunRepository:
    """Repository for agent run database operations"""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db_manager = db_manager or DatabaseManager()
    
    async def create(self, agent_run: AgentRun) -> AgentRun:
        """Create a new agent run"""
        try:
            with self.db_manager.session_scope() as session:
                # Generate ID if not provided
                if not agent_run.id:
                    agent_run.id = str(uuid.uuid4())
                
                # Set timestamps
                now = datetime.utcnow()
                agent_run.created_at = now
                agent_run.updated_at = now
                
                session.add(agent_run)
                session.flush()
                session.refresh(agent_run)
                session.expunge(agent_run)
                
                logger.info(f"Created agent run: {agent_run.id}")
                return agent_run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create agent run: {e}")
            raise Exception(f"Failed to create agent run: {str(e)}")
    
    async def get_by_id(self, agent_run_id: str) -> Optional[AgentRun]:
        """Get agent run by ID"""
        try:
            with self.db_manager.session_scope() as session:
                run = session.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
                if run:
                    session.expunge(run)
                return run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get agent run by ID: {e}")
            return None
    
    async def get_by_agent_id(self, agent_id: str) -> Optional[AgentRun]:
        """Get agent run by Codegen agent ID"""
        try:
            with self.db_manager.session_scope() as session:
                run = session.query(AgentRun).filter(AgentRun.agent_id == agent_id).first()
                if run:
                    session.expunge(run)
                return run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get agent run by agent ID: {e}")
            return None
    
    async def list_runs(
        self,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AgentRun]:
        """List agent runs with optional filtering"""
        try:
            with self.db_manager.session_scope() as session:
                query = session.query(AgentRun)
                
                # Apply filters
                if status:
                    try:
                        status_enum = AgentRunStatus(status)
                        query = query.filter(AgentRun.status == status_enum)
                    except ValueError:
                        # Invalid status, return empty list
                        return []
                
                if task_type:
                    query = query.filter(AgentRun.task_type == task_type)
                
                # Order by creation date (newest first)
                query = query.order_by(desc(AgentRun.created_at))
                
                # Apply pagination
                query = query.offset(offset).limit(limit)
                
                runs = query.all()
                
                # Expunge all runs from session
                for run in runs:
                    session.expunge(run)
                
                return runs
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to list agent runs: {e}")
            return []
    
    async def update(self, agent_run: AgentRun) -> AgentRun:
        """Update an existing agent run"""
        try:
            with self.db_manager.session_scope() as session:
                # Update timestamp
                agent_run.updated_at = datetime.utcnow()
                
                # Merge the changes
                updated_run = session.merge(agent_run)
                session.flush()
                session.refresh(updated_run)
                session.expunge(updated_run)
                
                logger.info(f"Updated agent run: {updated_run.id}")
                return updated_run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to update agent run: {e}")
            raise Exception(f"Failed to update agent run: {str(e)}")
    
    # Legacy methods for backward compatibility
    def create_legacy(self, run_data: Dict[str, Any]) -> Optional[AgentRun]:
        """Create a new agent run (legacy method)"""
        try:
            with self.db_manager.session_scope() as session:
                agent_run = AgentRun(
                    id=run_data['id'],
                    project_id=run_data.get('project_id'),
                    target_text=run_data.get('target_text'),
                    status=AgentRunStatus(run_data.get('status', 'pending')),
                    session_id=run_data.get('session_id', ''),
                    response_type=run_data.get('response_type'),
                    response_data=run_data.get('response_data', {})
                )
                
                session.add(agent_run)
                session.flush()
                session.refresh(agent_run)
                session.expunge(agent_run)
                
                logger.info(f"Created agent run (legacy): {agent_run.id}")
                return agent_run
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create agent run (legacy): {e}")
            return None
    
    def get_by_project(self, project_id: str, limit: int = 100) -> List[AgentRun]:
        """Get agent runs for a project (legacy method)"""
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
    
    def update_legacy(self, run_id: str, update_data: Dict[str, Any]) -> Optional[AgentRun]:
        """Update agent run (legacy method)"""
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
