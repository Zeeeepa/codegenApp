"""
Domain models for workflow orchestration
These are the core business objects that represent workflows in the system
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class WorkflowStatus(str, Enum):
    """Workflow execution status"""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    PAUSED = "PAUSED"


class WorkflowStepStatus(str, Enum):
    """Individual workflow step status"""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class WorkflowStep(BaseModel):
    """Individual workflow step definition"""
    id: str = Field(..., description="Unique step identifier")
    name: str = Field(..., description="Human-readable step name")
    service: str = Field(..., description="Service to execute (codegen, grainchain, etc.)")
    action: str = Field(..., description="Action to perform within the service")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Step-specific parameters")
    depends_on: List[str] = Field(default_factory=list, description="Step dependencies")
    timeout: Optional[int] = Field(None, description="Step timeout in seconds")
    retry_count: int = Field(default=0, description="Number of retry attempts")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowDefinition(BaseModel):
    """Workflow definition - the template for execution"""
    id: str = Field(..., description="Unique workflow identifier")
    name: str = Field(..., description="Human-readable workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    version: str = Field(default="1.0.0", description="Workflow version")
    steps: List[WorkflowStep] = Field(..., description="Ordered list of workflow steps")
    timeout: Optional[int] = Field(None, description="Overall workflow timeout in seconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Workflow tags for categorization")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowExecution(BaseModel):
    """Workflow execution instance - runtime state"""
    id: str = Field(..., description="Unique execution identifier")
    workflow_id: str = Field(..., description="Reference to workflow definition")
    status: WorkflowStatus = Field(..., description="Current execution status")
    started_at: datetime = Field(..., description="Execution start time")
    completed_at: Optional[datetime] = Field(None, description="Execution completion time")
    current_step: Optional[str] = Field(None, description="Currently executing step ID")
    step_results: Dict[str, Any] = Field(default_factory=dict, description="Results from completed steps")
    error_message: Optional[str] = Field(None, description="Error message if execution failed")
    organization_id: int = Field(..., description="Organization ID")
    user_id: int = Field(..., description="User ID who initiated the execution")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Runtime parameters")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowTemplate(BaseModel):
    """Pre-built workflow template"""
    id: str = Field(..., description="Template identifier")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: str = Field(..., description="Template category (ci_cd, code_review, etc.)")
    workflow_definition: WorkflowDefinition = Field(..., description="The actual workflow")
    parameters_schema: Dict[str, Any] = Field(
        default_factory=dict, 
        description="JSON schema for required parameters"
    )
    examples: List[Dict[str, Any]] = Field(
        default_factory=list, 
        description="Example parameter sets"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class StepResult(BaseModel):
    """Result from a workflow step execution"""
    step_id: str = Field(..., description="Step identifier")
    status: WorkflowStepStatus = Field(..., description="Step execution status")
    result: Optional[Dict[str, Any]] = Field(None, description="Step result data")
    error: Optional[str] = Field(None, description="Error message if step failed")
    started_at: datetime = Field(..., description="Step start time")
    completed_at: Optional[datetime] = Field(None, description="Step completion time")
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowMetrics(BaseModel):
    """Workflow execution metrics"""
    execution_id: str = Field(..., description="Execution identifier")
    total_steps: int = Field(..., description="Total number of steps")
    completed_steps: int = Field(..., description="Number of completed steps")
    failed_steps: int = Field(..., description="Number of failed steps")
    skipped_steps: int = Field(..., description="Number of skipped steps")
    total_execution_time: Optional[float] = Field(None, description="Total execution time in seconds")
    average_step_time: Optional[float] = Field(None, description="Average step execution time")
    success_rate: float = Field(..., description="Success rate as percentage")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
