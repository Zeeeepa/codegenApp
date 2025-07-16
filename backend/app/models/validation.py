"""
Validation pipeline models for CI/CD flow management.

Defines models for managing validation pipelines, steps,
and results within the CI/CD workflow system.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class ValidationStatus(Enum):
    """Status enumeration for validation pipelines."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class ValidationStepType(Enum):
    """Type enumeration for validation steps."""
    SNAPSHOT_CREATION = "snapshot_creation"
    CODEBASE_CLONE = "codebase_clone"
    DEPLOYMENT = "deployment"
    HEALTH_CHECK = "health_check"
    WEB_EVALUATION = "web_evaluation"
    CODE_ANALYSIS = "code_analysis"
    SECURITY_SCAN = "security_scan"
    CLEANUP = "cleanup"


class ValidationResult(Enum):
    """Result enumeration for validation outcomes."""
    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"
    SKIPPED = "skipped"


class ValidationPipeline(Base):
    """
    Validation pipeline entity for managing PR validation workflows.
    
    Orchestrates the complete validation process from snapshot creation
    through deployment testing and final approval/merge decisions.
    """
    __tablename__ = "validation_pipelines"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    agent_run_id = Column(String, ForeignKey("agent_runs.id"))
    pull_request_id = Column(String, ForeignKey("pull_requests.id"))
    
    # Pipeline Configuration
    pipeline_config = Column(JSON, default={
        "timeout_minutes": 30,
        "max_retries": 3,
        "required_steps": ["deployment", "health_check", "web_evaluation"],
        "optional_steps": ["code_analysis", "security_scan"]
    })
    
    # Status and Progress
    status = Column(SQLEnum(ValidationStatus), default=ValidationStatus.PENDING)
    current_step = Column(String(255))
    progress_percentage = Column(Integer, default=0)
    
    # Results and Metrics
    overall_result = Column(SQLEnum(ValidationResult))
    execution_time_seconds = Column(Integer)
    resource_usage = Column(JSON)  # CPU, memory, storage metrics
    
    # Error Handling
    error_message = Column(Text)
    error_context = Column(JSON)
    retry_count = Column(Integer, default=0)
    
    # Environment Information
    snapshot_id = Column(String(255))  # Docker/K8s snapshot identifier
    deployment_url = Column(String(500))  # URL of deployed application
    environment_variables = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="validations")
    agent_run = relationship("AgentRun", back_populates="validation_pipeline")
    pull_request = relationship("PullRequest", back_populates="validation_pipeline")
    steps = relationship("ValidationStep", back_populates="pipeline", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        """Convert validation pipeline to dictionary representation."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "agent_run_id": self.agent_run_id,
            "pull_request_id": self.pull_request_id,
            "status": self.status.value if self.status else None,
            "current_step": self.current_step,
            "progress_percentage": self.progress_percentage,
            "overall_result": self.overall_result.value if self.overall_result else None,
            "execution_time_seconds": self.execution_time_seconds,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "snapshot_id": self.snapshot_id,
            "deployment_url": self.deployment_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "steps": [step.to_dict() for step in self.steps] if self.steps else []
        }

    def can_retry(self) -> bool:
        """Check if the validation pipeline can be retried."""
        return (self.retry_count < self.pipeline_config.get("max_retries", 3) and 
                self.status == ValidationStatus.FAILED)

    def is_successful(self) -> bool:
        """Check if the validation pipeline completed successfully."""
        return (self.status == ValidationStatus.COMPLETED and 
                self.overall_result == ValidationResult.SUCCESS)


class ValidationStep(Base):
    """
    Individual validation step within a pipeline.
    
    Represents a single step in the validation process with
    its own status, results, and execution details.
    """
    __tablename__ = "validation_steps"

    id = Column(String, primary_key=True)
    pipeline_id = Column(String, ForeignKey("validation_pipelines.id"), nullable=False)
    
    # Step Configuration
    step_type = Column(SQLEnum(ValidationStepType), nullable=False)
    step_name = Column(String(255), nullable=False)
    step_config = Column(JSON, default={})
    execution_order = Column(Integer, nullable=False)
    
    # Status and Results
    status = Column(SQLEnum(ValidationStatus), default=ValidationStatus.PENDING)
    result = Column(SQLEnum(ValidationResult))
    
    # Execution Details
    command_executed = Column(Text)
    output_logs = Column(Text)
    error_logs = Column(Text)
    execution_time_seconds = Column(Integer)
    
    # Artifacts and Reports
    artifacts = Column(JSON)  # Screenshots, reports, files
    metrics = Column(JSON)    # Performance, coverage, quality metrics
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    pipeline = relationship("ValidationPipeline", back_populates="steps")

    def to_dict(self) -> Dict[str, Any]:
        """Convert validation step to dictionary representation."""
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "step_type": self.step_type.value if self.step_type else None,
            "step_name": self.step_name,
            "execution_order": self.execution_order,
            "status": self.status.value if self.status else None,
            "result": self.result.value if self.result else None,
            "command_executed": self.command_executed,
            "execution_time_seconds": self.execution_time_seconds,
            "artifacts": self.artifacts,
            "metrics": self.metrics,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def is_completed(self) -> bool:
        """Check if the validation step is completed."""
        return self.status in [ValidationStatus.COMPLETED, ValidationStatus.FAILED]

    def is_successful(self) -> bool:
        """Check if the validation step completed successfully."""
        return (self.status == ValidationStatus.COMPLETED and 
                self.result == ValidationResult.SUCCESS)

