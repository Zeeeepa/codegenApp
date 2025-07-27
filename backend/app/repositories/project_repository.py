"""
Project repository for database operations.
Handles CRUD operations for projects with proper error handling and logging.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc, asc

from ..database.models import Project, ProjectStatus
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class ProjectRepository:
    """Repository for project database operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create(self, project_data: Dict[str, Any]) -> Optional[Project]:
        """
        Create a new project.
        
        Args:
            project_data: Dictionary containing project information
            
        Returns:
            Created project or None if failed
        """
        try:
            with self.db_manager.session_scope() as session:
                project = Project(
                    id=project_data['id'],
                    name=project_data['name'],
                    description=project_data.get('description'),
                    webhook_url=project_data['webhook_url'],
                    github_repo=project_data['github_repo'],
                    status=ProjectStatus(project_data.get('status', 'active')),
                    deployment_settings=project_data.get('deployment_settings', {}),
                    validation_settings=project_data.get('validation_settings', {})
                )
                
                session.add(project)
                session.flush()  # Flush to get the ID
                session.refresh(project)
                
                logger.info(f"Created project: {project.id}")
                return project
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create project: {e}")
            return None
    
    def get_by_id(self, project_id: str) -> Optional[Project]:
        """
        Get project by ID.
        
        Args:
            project_id: Project identifier
            
        Returns:
            Project or None if not found
        """
        try:
            with self.db_manager.session_scope() as session:
                project = session.query(Project).filter(Project.id == project_id).first()
                if project:
                    # Detach from session to avoid lazy loading issues
                    session.expunge(project)
                return project
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get project {project_id}: {e}")
            return None
    
    def get_all(self, 
                status: Optional[ProjectStatus] = None,
                limit: int = 100,
                offset: int = 0,
                order_by: str = 'created_at',
                order_desc: bool = True) -> List[Project]:
        """
        Get all projects with optional filtering and pagination.
        
        Args:
            status: Filter by project status
            limit: Maximum number of results
            offset: Number of results to skip
            order_by: Field to order by
            order_desc: Whether to order in descending order
            
        Returns:
            List of projects
        """
        try:
            with self.db_manager.session_scope() as session:
                query = session.query(Project)
                
                # Apply status filter
                if status:
                    query = query.filter(Project.status == status)
                
                # Apply ordering
                order_field = getattr(Project, order_by, Project.created_at)
                if order_desc:
                    query = query.order_by(desc(order_field))
                else:
                    query = query.order_by(asc(order_field))
                
                # Apply pagination
                projects = query.offset(offset).limit(limit).all()
                
                # Detach from session
                for project in projects:
                    session.expunge(project)
                
                return projects
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get projects: {e}")
            return []
    
    def update(self, project_id: str, update_data: Dict[str, Any]) -> Optional[Project]:
        """
        Update project.
        
        Args:
            project_id: Project identifier
            update_data: Dictionary containing fields to update
            
        Returns:
            Updated project or None if failed
        """
        try:
            with self.db_manager.session_scope() as session:
                project = session.query(Project).filter(Project.id == project_id).first()
                
                if not project:
                    logger.warning(f"Project not found for update: {project_id}")
                    return None
                
                # Update fields
                for field, value in update_data.items():
                    if hasattr(project, field):
                        if field == 'status' and isinstance(value, str):
                            setattr(project, field, ProjectStatus(value))
                        else:
                            setattr(project, field, value)
                
                session.flush()
                session.refresh(project)
                session.expunge(project)
                
                logger.info(f"Updated project: {project_id}")
                return project
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to update project {project_id}: {e}")
            return None
    
    def delete(self, project_id: str) -> bool:
        """
        Delete project.
        
        Args:
            project_id: Project identifier
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            with self.db_manager.session_scope() as session:
                project = session.query(Project).filter(Project.id == project_id).first()
                
                if not project:
                    logger.warning(f"Project not found for deletion: {project_id}")
                    return False
                
                session.delete(project)
                logger.info(f"Deleted project: {project_id}")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to delete project {project_id}: {e}")
            return False
    
    def get_by_github_repo(self, github_repo: str) -> Optional[Project]:
        """
        Get project by GitHub repository.
        
        Args:
            github_repo: GitHub repository identifier
            
        Returns:
            Project or None if not found
        """
        try:
            with self.db_manager.session_scope() as session:
                project = session.query(Project).filter(
                    Project.github_repo == github_repo
                ).first()
                
                if project:
                    session.expunge(project)
                return project
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get project by GitHub repo {github_repo}: {e}")
            return None
    
    def search(self, query: str, limit: int = 50) -> List[Project]:
        """
        Search projects by name or description.
        
        Args:
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of matching projects
        """
        try:
            with self.db_manager.session_scope() as session:
                search_pattern = f"%{query}%"
                projects = session.query(Project).filter(
                    (Project.name.ilike(search_pattern)) |
                    (Project.description.ilike(search_pattern))
                ).limit(limit).all()
                
                # Detach from session
                for project in projects:
                    session.expunge(project)
                
                return projects
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to search projects: {e}")
            return []
    
    def count(self, status: Optional[ProjectStatus] = None) -> int:
        """
        Count projects with optional status filter.
        
        Args:
            status: Filter by project status
            
        Returns:
            Number of projects
        """
        try:
            with self.db_manager.session_scope() as session:
                query = session.query(Project)
                
                if status:
                    query = query.filter(Project.status == status)
                
                return query.count()
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to count projects: {e}")
            return 0
