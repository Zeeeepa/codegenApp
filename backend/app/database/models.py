"""
Database models for the Agent Run Manager.
Defines SQLAlchemy models for projects, agent runs, and validation pipelines.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    JSON, ForeignKey, Enum, Float, Index
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class ProjectStatus(enum.Enum):
    """Project status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class AgentRunStatus(enum.Enum):
    """Agent run status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_INPUT = "waiting_input"


class ValidationStatus(enum.Enum):
    """Validation pipeline status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Project(Base):
    """Project model for storing project information"""
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    webhook_url = Column(String(500), nullable=False)
    github_repo = Column(String(255), nullable=False, index=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE, index=True)
    
    # Deployment settings stored as JSON
    deployment_settings = Column(JSON, default=dict)
    
    # Validation settings stored as JSON
    validation_settings = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_run = Column(DateTime(timezone=True))
    
    # Relationships
    agent_runs = relationship("AgentRun", back_populates="project", cascade="all, delete-orphan")
    validation_pipelines = relationship("ValidationPipeline", back_populates="project", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_project_status_created', 'status', 'created_at'),
        Index('idx_project_github_repo', 'github_repo'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert project to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'webhook_url': self.webhook_url,
            'github_repo': self.github_repo,
            'status': self.status.value if self.status else None,
            'deployment_settings': self.deployment_settings or {},
            'validation_settings': self.validation_settings or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_run': self.last_run.isoformat() if self.last_run else None,
        }


class AgentRun(Base):
    """Agent run model for storing agent execution information"""
    __tablename__ = "agent_runs"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    target_text = Column(Text, nullable=False)
    status = Column(Enum(AgentRunStatus), default=AgentRunStatus.PENDING, index=True)
    progress_percentage = Column(Float, default=0.0)
    current_step = Column(String(255))
    
    # Response data
    response_type = Column(String(50))  # 'regular', 'plan', 'pr'
    response_data = Column(JSON)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Session information
    session_id = Column(String(255), index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    project = relationship("Project", back_populates="agent_runs")
    validation_pipelines = relationship("ValidationPipeline", back_populates="agent_run", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_agent_run_status_created', 'status', 'created_at'),
        Index('idx_agent_run_project_status', 'project_id', 'status'),
        Index('idx_agent_run_session', 'session_id'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent run to dictionary"""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'target_text': self.target_text,
            'status': self.status.value if self.status else None,
            'progress_percentage': self.progress_percentage,
            'current_step': self.current_step,
            'response_type': self.response_type,
            'response_data': self.response_data,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class ValidationPipeline(Base):
    """Validation pipeline model for storing validation information"""
    __tablename__ = "validation_pipelines"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    agent_run_id = Column(String, ForeignKey("agent_runs.id"), nullable=True, index=True)
    
    # Pipeline information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(ValidationStatus), default=ValidationStatus.PENDING, index=True)
    
    # Configuration
    config = Column(JSON, default=dict)
    
    # Results
    results = Column(JSON, default=dict)
    error_message = Column(Text)
    
    # Timing
    duration_seconds = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    project = relationship("Project", back_populates="validation_pipelines")
    agent_run = relationship("AgentRun", back_populates="validation_pipelines")
    
    # Indexes
    __table_args__ = (
        Index('idx_validation_status_created', 'status', 'created_at'),
        Index('idx_validation_project_status', 'project_id', 'status'),
        Index('idx_validation_agent_run', 'agent_run_id'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert validation pipeline to dictionary"""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'agent_run_id': self.agent_run_id,
            'name': self.name,
            'description': self.description,
            'status': self.status.value if self.status else None,
            'config': self.config or {},
            'results': self.results or {},
            'error_message': self.error_message,
            'duration_seconds': self.duration_seconds,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class AuditLog(Base):
    """Audit log model for tracking system events"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False, index=True)  # 'project', 'agent_run', etc.
    entity_id = Column(String, nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)  # 'create', 'update', 'delete'
    
    # Change details
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # User information
    user_id = Column(String(255))
    user_email = Column(String(255))
    
    # Request information
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_audit_entity_action', 'entity_type', 'action'),
        Index('idx_audit_entity_id', 'entity_id'),
        Index('idx_audit_created', 'created_at'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'action': self.action,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
