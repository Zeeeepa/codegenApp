"""
Validation repository for database operations.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database.models import ValidationPipeline, ValidationStatus
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class ValidationRepository:
    """Repository for validation pipeline database operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create(self, validation_data: Dict[str, Any]) -> Optional[ValidationPipeline]:
        """Create a new validation pipeline"""
        try:
            with self.db_manager.session_scope() as session:
                validation = ValidationPipeline(
                    id=validation_data['id'],
                    project_id=validation_data['project_id'],
                    agent_run_id=validation_data.get('agent_run_id'),
                    name=validation_data['name'],
                    description=validation_data.get('description'),
                    config=validation_data.get('config', {}),
                    status=ValidationStatus(validation_data.get('status', 'pending'))
                )
                
                session.add(validation)
                session.flush()
                session.refresh(validation)
                
                return validation
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create validation: {e}")
            return None
    
    def get_by_id(self, validation_id: str) -> Optional[ValidationPipeline]:
        """Get validation by ID"""
        try:
            with self.db_manager.session_scope() as session:
                validation = session.query(ValidationPipeline).filter(
                    ValidationPipeline.id == validation_id
                ).first()
                if validation:
                    session.expunge(validation)
                return validation
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get validation {validation_id}: {e}")
            return None
