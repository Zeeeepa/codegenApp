"""
Project model for CI/CD flow management.

Defines the Project and ProjectSettings models for managing
development projects with their configurations and settings.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Project(Base):
    """
    Main project entity for CI/CD management.
    
    Represents a development project with its configuration,
    webhook settings, and deployment parameters.
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    webhook_url = Column(String(500), nullable=False)
    github_repo = Column(String(255), nullable=False)  # format: owner/repository
    status = Column(String(50), default="active")  # active, inactive, archived
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run = Column(DateTime)
    
    # Relationships
    settings = relationship("ProjectSettings", back_populates="project", uselist=False)
    agent_runs = relationship("AgentRun", back_populates="project")
    validations = relationship("ValidationPipeline", back_populates="project")
    github_integration = relationship("GitHubIntegration", back_populates="project", uselist=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert project to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "webhook_url": self.webhook_url,
            "github_repo": self.github_repo,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "deployment_settings": self.settings.deployment_settings if self.settings else {},
            "validation_settings": self.settings.validation_settings if self.settings else {},
        }


class ProjectSettings(Base):
    """
    Project configuration and settings.
    
    Stores deployment commands, validation settings,
    and other project-specific configurations.
    """
    __tablename__ = "project_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # Deployment Configuration
    deployment_settings = Column(JSON, default={
        "build_command": "npm run build",
        "deploy_command": "npm run deploy", 
        "health_check_url": "",
        "environment_variables": {}
    })
    
    # Validation Configuration
    validation_settings = Column(JSON, default={
        "auto_merge": True,
        "required_checks": ["build", "test", "security"],
        "timeout_minutes": 30,
        "max_retries": 3
    })
    
    # Notification Settings
    notification_settings = Column(JSON, default={
        "slack_webhook": "",
        "email_notifications": True,
        "github_status_updates": True
    })
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="settings")

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary representation."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "deployment_settings": self.deployment_settings,
            "validation_settings": self.validation_settings,
            "notification_settings": self.notification_settings,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
