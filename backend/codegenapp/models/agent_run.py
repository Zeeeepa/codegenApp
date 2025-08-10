"""
Agent run model for CI/CD flow management.

Defines models for managing Codegen agent runs, their states,
and response types within the CI/CD workflow.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class AgentRunStatus(Enum):
    """Status enumeration for agent runs."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_INPUT = "waiting_input"


class ResponseType(Enum):
    """Response type enumeration for agent outputs."""
    REGULAR = "regular"  # Continue button available
    PLAN = "plan"        # Confirm/Modify options
    PR = "pr"           # PR created, validation triggered


# Official API compatible models
class AgentRunResponse(BaseModel):
    """
    Pydantic model for official Codegen API agent run responses.
    
    This model represents the processed response from the official Codegen API,
    with additional metadata and type classification.
    """
    
    id: str = Field(..., description="Unique identifier for the agent run")
    status: str = Field(..., description="Current status of the agent run")
    message: str = Field(..., description="Agent response message")
    type: str = Field(default="regular", description="Response type classification")
    
    # Timestamps
    created_at: Optional[datetime] = Field(None, description="When the run was created")
    updated_at: Optional[datetime] = Field(None, description="When the run was last updated")
    processed_at: Optional[datetime] = Field(None, description="When the response was processed")
    
    # Repository information
    repository: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Repository information")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    # Type-specific fields
    pr_url: Optional[str] = Field(None, description="PR URL if type is 'pr'")
    plan_content: Optional[Dict[str, Any]] = Field(None, description="Plan content if type is 'plan'")
    
    # Error information
    error: Optional[Dict[str, Any]] = Field(None, description="Error information if run failed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class AgentRunRequest(BaseModel):
    """
    Pydantic model for agent run creation requests.
    """
    
    message: str = Field(..., description="Message/prompt for the agent")
    repository_owner: str = Field(..., description="GitHub repository owner")
    repository_name: str = Field(..., description="GitHub repository name")
    branch: Optional[str] = Field(None, description="Target branch (optional)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class AgentRunResumeRequest(BaseModel):
    """
    Pydantic model for agent run resume requests.
    """
    
    message: str = Field(..., description="Additional message/input for the agent")


class AgentRun(Base):
    """
    Agent run entity for tracking Codegen agent executions.
    
    Manages the lifecycle of agent runs including their status,
    responses, and integration with the validation pipeline.
    """
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # Run Configuration
    target_text = Column(Text, nullable=False)  # User's target/goal input
    context_prompt = Column(Text)  # Full context sent to agent
    
    # Status and Progress
    status = Column(SQLEnum(AgentRunStatus), default=AgentRunStatus.PENDING)
    progress_percentage = Column(Integer, default=0)
    current_step = Column(String(255))
    
    # Response Handling
    response_type = Column(SQLEnum(ResponseType))
    response_data = Column(JSON)  # Agent's response content
    continuation_context = Column(JSON)  # Context for resume operations
    
    # Error Handling
    error_message = Column(Text)
    error_context = Column(JSON)  # Error details for recovery
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Session Management
    session_id = Column(String(255))  # For maintaining conversation context
    parent_run_id = Column(String, ForeignKey("agent_runs.id"))  # For continuation runs
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="agent_runs")
    parent_run = relationship("AgentRun", remote_side=[id])
    child_runs = relationship("AgentRun", back_populates="parent_run")
    validation_pipeline = relationship("ValidationPipeline", back_populates="agent_run", uselist=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert agent run to dictionary representation."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "target_text": self.target_text,
            "status": self.status.value if self.status else None,
            "progress_percentage": self.progress_percentage,
            "current_step": self.current_step,
            "response_type": self.response_type.value if self.response_type else None,
            "response_data": self.response_data,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "session_id": self.session_id,
            "parent_run_id": self.parent_run_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def can_retry(self) -> bool:
        """Check if the agent run can be retried."""
        return self.retry_count < self.max_retries and self.status == AgentRunStatus.FAILED

    def is_waiting_for_input(self) -> bool:
        """Check if the agent run is waiting for user input."""
        return self.status == AgentRunStatus.WAITING_INPUT

    def requires_validation(self) -> bool:
        """Check if the agent run requires validation pipeline."""
        return self.response_type == ResponseType.PR and self.status == AgentRunStatus.COMPLETED
