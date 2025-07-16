"""
Audit log model for CI/CD flow management.

Defines models for comprehensive audit logging and tracking
of all actions within the CI/CD workflow system.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class AuditAction(Enum):
    """Action enumeration for audit logging."""
    # Project Actions
    PROJECT_CREATED = "project.created"
    PROJECT_UPDATED = "project.updated"
    PROJECT_DELETED = "project.deleted"
    PROJECT_SETTINGS_UPDATED = "project.settings_updated"
    
    # Agent Run Actions
    AGENT_RUN_STARTED = "agent_run.started"
    AGENT_RUN_COMPLETED = "agent_run.completed"
    AGENT_RUN_FAILED = "agent_run.failed"
    AGENT_RUN_CANCELLED = "agent_run.cancelled"
    AGENT_RUN_CONTINUED = "agent_run.continued"
    
    # Validation Actions
    VALIDATION_STARTED = "validation.started"
    VALIDATION_STEP_COMPLETED = "validation.step_completed"
    VALIDATION_COMPLETED = "validation.completed"
    VALIDATION_FAILED = "validation.failed"
    VALIDATION_RETRIED = "validation.retried"
    
    # GitHub Actions
    WEBHOOK_RECEIVED = "github.webhook_received"
    PR_CREATED = "github.pr_created"
    PR_UPDATED = "github.pr_updated"
    PR_MERGED = "github.pr_merged"
    AUTO_MERGE_TRIGGERED = "github.auto_merge_triggered"
    
    # System Actions
    SYSTEM_ERROR = "system.error"
    SYSTEM_WARNING = "system.warning"
    SYSTEM_INFO = "system.info"
    
    # User Actions
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    USER_ACTION = "user.action"


class AuditLog(Base):
    """
    Audit log entity for comprehensive system tracking.
    
    Records all significant actions, changes, and events
    within the CI/CD system for compliance and debugging.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Action Information
    action = Column(SQLEnum(AuditAction), nullable=False)
    action_description = Column(String(500))
    
    # Context Information
    entity_type = Column(String(100))  # project, agent_run, validation, etc.
    entity_id = Column(String(255))    # ID of the affected entity
    project_id = Column(String(255))   # Associated project (if applicable)
    
    # User Information
    user_id = Column(String(255))
    user_email = Column(String(255))
    user_agent = Column(String(500))
    ip_address = Column(String(45))  # IPv6 compatible
    
    # Request Information
    request_id = Column(String(255))  # Correlation ID for request tracking
    session_id = Column(String(255))
    
    # Change Details
    old_values = Column(JSON)  # Previous state (for updates)
    new_values = Column(JSON)  # New state (for updates)
    metadata = Column(JSON)    # Additional context data
    
    # Error Information (if applicable)
    error_message = Column(Text)
    error_stack_trace = Column(Text)
    
    # Timing Information
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_ms = Column(Integer)  # Action duration in milliseconds
    
    # Source Information
    source_service = Column(String(100))  # Which service generated the log
    source_version = Column(String(50))   # Service version
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary representation."""
        return {
            "id": self.id,
            "action": self.action.value if self.action else None,
            "action_description": self.action_description,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "request_id": self.request_id,
            "session_id": self.session_id,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "metadata": self.metadata,
            "error_message": self.error_message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "duration_ms": self.duration_ms,
            "source_service": self.source_service,
            "source_version": self.source_version,
        }

    @classmethod
    def create_log(
        cls,
        action: AuditAction,
        description: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        source_service: str = "orchestration-engine"
    ) -> "AuditLog":
        """
        Create a new audit log entry.
        
        Args:
            action: The action being logged
            description: Human-readable description of the action
            entity_type: Type of entity affected (optional)
            entity_id: ID of the entity affected (optional)
            project_id: Associated project ID (optional)
            user_id: User who performed the action (optional)
            user_email: Email of the user (optional)
            request_id: Request correlation ID (optional)
            metadata: Additional context data (optional)
            error_message: Error message if applicable (optional)
            source_service: Service that generated the log
            
        Returns:
            AuditLog: New audit log instance
        """
        return cls(
            action=action,
            action_description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            project_id=project_id,
            user_id=user_id,
            user_email=user_email,
            request_id=request_id,
            metadata=metadata or {},
            error_message=error_message,
            source_service=source_service,
            timestamp=datetime.utcnow()
        )

