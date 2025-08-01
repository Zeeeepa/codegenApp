"""
Database models for CodegenApp
"""
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Project(Base):
    """GitHub project configuration and settings"""
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    github_url = Column(String, nullable=False)
    github_owner = Column(String, nullable=False)
    github_repo = Column(String, nullable=False)
    webhook_url = Column(String)
    webhook_id = Column(String)  # GitHub webhook ID
    
    # Configuration
    repository_rules = Column(Text, default="")
    setup_commands = Column(JSON, default=list)  # List of commands
    secrets = Column(JSON, default=dict)  # Environment variables
    planning_statement = Column(Text, default="")
    
    # Settings
    auto_merge_enabled = Column(Boolean, default=False)
    auto_confirm_plans = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    agent_runs = relationship("AgentRun", back_populates="project", cascade="all, delete-orphan")
    validations = relationship("ValidationState", back_populates="project", cascade="all, delete-orphan")


class AgentRun(Base):
    """Agent execution runs and their status"""
    __tablename__ = "agent_runs"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # Input
    target_text = Column(Text, nullable=False)
    full_prompt = Column(Text)  # Complete prompt sent to Codegen
    
    # Status
    status = Column(String, default="pending")  # pending, running, completed, failed, cancelled
    codegen_run_id = Column(String)  # Codegen API run ID
    
    # Results
    response_type = Column(String)  # regular, plan, pr
    plan_content = Column(Text)
    pr_number = Column(Integer)
    pr_url = Column(String)
    
    # Flags
    plan_generated = Column(Boolean, default=False)
    plan_confirmed = Column(Boolean, default=False)
    pr_created = Column(Boolean, default=False)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="agent_runs")
    validations = relationship("ValidationState", back_populates="agent_run", cascade="all, delete-orphan")


class ValidationState(Base):
    """PR validation pipeline state and results"""
    __tablename__ = "validation_states"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    agent_run_id = Column(String, ForeignKey("agent_runs.id"), nullable=False)
    
    # PR Information
    pr_number = Column(Integer, nullable=False)
    pr_url = Column(String, nullable=False)
    pr_branch = Column(String, nullable=False)
    pr_commit_sha = Column(String, nullable=False)
    
    # Validation Pipeline Status
    status = Column(String, default="pending")  # pending, running, completed, failed, cancelled
    
    # Pipeline Steps
    snapshot_created = Column(Boolean, default=False)
    snapshot_id = Column(String)
    code_cloned = Column(Boolean, default=False)
    deployment_completed = Column(Boolean, default=False)
    tests_completed = Column(Boolean, default=False)
    
    # Results
    deployment_status = Column(String)  # success, failed, timeout
    deployment_logs = Column(Text)
    test_results = Column(JSON, default=dict)
    web_eval_results = Column(JSON, default=dict)
    
    # Auto-merge
    auto_merge_eligible = Column(Boolean, default=False)
    auto_merge_completed = Column(Boolean, default=False)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="validations")
    agent_run = relationship("AgentRun", back_populates="validations")


class WebhookEvent(Base):
    """GitHub webhook events log"""
    __tablename__ = "webhook_events"
    
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    
    # Event details
    event_type = Column(String, nullable=False)  # pull_request, push, etc.
    action = Column(String)  # opened, closed, synchronize, etc.
    
    # GitHub data
    github_delivery_id = Column(String)
    pr_number = Column(Integer)
    pr_action = Column(String)
    repository_full_name = Column(String)
    
    # Processing
    processed = Column(Boolean, default=False)
    processing_status = Column(String)  # pending, completed, failed
    processing_error = Column(Text)
    
    # Raw data
    payload = Column(JSON)
    headers = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project")


class UserSettings(Base):
    """User-specific settings and preferences"""
    __tablename__ = "user_settings"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    
    # GitHub integration
    github_token = Column(String)
    github_username = Column(String)
    
    # Preferences
    default_planning_statement = Column(Text, default="")
    auto_confirm_plans_default = Column(Boolean, default=False)
    auto_merge_default = Column(Boolean, default=False)
    
    # Notification settings
    email_notifications = Column(Boolean, default=True)
    webhook_notifications = Column(Boolean, default=True)
    
    # UI preferences
    dashboard_layout = Column(JSON, default=dict)
    theme = Column(String, default="light")
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SystemLog(Base):
    """System-wide logging and audit trail"""
    __tablename__ = "system_logs"
    
    id = Column(String, primary_key=True)
    
    # Log details
    level = Column(String, nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    component = Column(String)  # api, validation, webhook, etc.
    
    # Context
    project_id = Column(String, ForeignKey("projects.id"))
    agent_run_id = Column(String, ForeignKey("agent_runs.id"))
    validation_id = Column(String, ForeignKey("validation_states.id"))
    
    # Additional data
    metadata = Column(JSON, default=dict)
    stack_trace = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    project = relationship("Project")
    agent_run = relationship("AgentRun")
    validation = relationship("ValidationState")


# Utility functions for model operations
def create_project_id() -> str:
    """Generate unique project ID"""
    import uuid
    return f"proj_{uuid.uuid4().hex[:12]}"


def create_agent_run_id() -> str:
    """Generate unique agent run ID"""
    import uuid
    return f"run_{uuid.uuid4().hex[:12]}"


def create_validation_id() -> str:
    """Generate unique validation ID"""
    import uuid
    return f"val_{uuid.uuid4().hex[:12]}"


def create_webhook_event_id() -> str:
    """Generate unique webhook event ID"""
    import uuid
    return f"hook_{uuid.uuid4().hex[:12]}"


def create_user_settings_id() -> str:
    """Generate unique user settings ID"""
    import uuid
    return f"user_{uuid.uuid4().hex[:12]}"


def create_system_log_id() -> str:
    """Generate unique system log ID"""
    import uuid
    return f"log_{uuid.uuid4().hex[:12]}"

