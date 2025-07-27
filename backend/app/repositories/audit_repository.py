"""
Audit repository for database operations.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..database.models import AuditLog
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class AuditRepository:
    """Repository for audit log database operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create(self, audit_data: Dict[str, Any]) -> Optional[AuditLog]:
        """Create a new audit log entry"""
        try:
            with self.db_manager.session_scope() as session:
                audit_log = AuditLog(
                    entity_type=audit_data['entity_type'],
                    entity_id=audit_data['entity_id'],
                    action=audit_data['action'],
                    old_values=audit_data.get('old_values'),
                    new_values=audit_data.get('new_values'),
                    user_id=audit_data.get('user_id'),
                    user_email=audit_data.get('user_email'),
                    ip_address=audit_data.get('ip_address'),
                    user_agent=audit_data.get('user_agent')
                )
                
                session.add(audit_log)
                session.flush()
                session.refresh(audit_log)
                
                return audit_log
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to create audit log: {e}")
            return None
