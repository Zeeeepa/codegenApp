"""
Workflow state models for CI/CD pipeline orchestration.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class WorkflowState(str, Enum):
    """CI/CD Workflow states"""
    IDLE = "idle"
    PLANNING = "planning"
    CODING = "coding"
    PR_CREATED = "pr_created"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowTransition(BaseModel):
    """Workflow state transition"""
    from_state: WorkflowState
    to_state: WorkflowState
    timestamp: datetime
    trigger: str
    metadata: Optional[Dict[str, Any]] = None


class WorkflowMetadata(BaseModel):
    """Workflow execution metadata"""
    project_id: str
    repository: Dict[str, Any]
    initial_requirements: str
    planning_statement: Optional[str] = None
    auto_confirm_plan: bool = False
    auto_merge_pr: bool = False
    max_iterations: int = 10
    current_iteration: int = 1
    
    # Agent run tracking
    current_agent_run_id: Optional[str] = None
    agent_run_history: List[str] = Field(default_factory=list)
    
    # PR tracking
    current_pr_number: Optional[int] = None
    pr_history: List[int] = Field(default_factory=list)
    
    # Validation tracking
    validation_attempts: int = 0
    validation_errors: List[str] = Field(default_factory=list)
    
    # Context accumulation
    accumulated_context: List[str] = Field(default_factory=list)
    error_contexts: List[str] = Field(default_factory=list)


class WorkflowExecution(BaseModel):
    """Complete workflow execution state"""
    id: str
    project_id: str
    current_state: WorkflowState
    metadata: WorkflowMetadata
    
    # Timing
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_activity: datetime
    
    # State management
    state_history: List[WorkflowTransition] = Field(default_factory=list)
    retry_count: int = 0
    max_retries: int = 3
    
    # Results
    final_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    # Real-time updates
    websocket_connections: List[str] = Field(default_factory=list)


class WorkflowEvent(BaseModel):
    """Workflow event for real-time updates"""
    workflow_id: str
    project_id: str
    event_type: str
    state: WorkflowState
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkflowConfig(BaseModel):
    """Workflow configuration"""
    # Timeouts (in seconds)
    planning_timeout: int = 1800  # 30 minutes
    coding_timeout: int = 3600    # 60 minutes
    validation_timeout: int = 1800 # 30 minutes
    
    # Retry settings
    max_retries_per_state: int = 3
    retry_delay: int = 60  # seconds
    
    # Resource limits
    max_concurrent_workflows: int = 50
    max_memory_per_workflow: int = 100 * 1024 * 1024  # 100MB
    
    # Integration settings
    webhook_timeout: int = 30
    api_timeout: int = 60
    
    # Validation settings
    max_validation_attempts: int = 5
    validation_retry_delay: int = 300  # 5 minutes


class StateTransitionRule(BaseModel):
    """State transition validation rule"""
    from_state: WorkflowState
    to_state: WorkflowState
    required_conditions: List[str]
    optional_conditions: List[str] = Field(default_factory=list)
    timeout_seconds: Optional[int] = None


# Valid state transitions
VALID_TRANSITIONS = [
    StateTransitionRule(
        from_state=WorkflowState.IDLE,
        to_state=WorkflowState.PLANNING,
        required_conditions=["initial_requirements", "project_configured"]
    ),
    StateTransitionRule(
        from_state=WorkflowState.PLANNING,
        to_state=WorkflowState.CODING,
        required_conditions=["plan_created", "plan_confirmed"],
        timeout_seconds=1800
    ),
    StateTransitionRule(
        from_state=WorkflowState.CODING,
        to_state=WorkflowState.PR_CREATED,
        required_conditions=["code_generated", "pr_created"],
        timeout_seconds=3600
    ),
    StateTransitionRule(
        from_state=WorkflowState.PR_CREATED,
        to_state=WorkflowState.VALIDATING,
        required_conditions=["pr_detected", "webhook_received"]
    ),
    StateTransitionRule(
        from_state=WorkflowState.VALIDATING,
        to_state=WorkflowState.COMPLETED,
        required_conditions=["validation_passed", "requirements_met"],
        timeout_seconds=1800
    ),
    StateTransitionRule(
        from_state=WorkflowState.VALIDATING,
        to_state=WorkflowState.PLANNING,
        required_conditions=["validation_failed", "requirements_not_met"],
        optional_conditions=["max_iterations_not_reached"]
    ),
    # Error transitions
    StateTransitionRule(
        from_state=WorkflowState.PLANNING,
        to_state=WorkflowState.FAILED,
        required_conditions=["planning_failed", "max_retries_reached"]
    ),
    StateTransitionRule(
        from_state=WorkflowState.CODING,
        to_state=WorkflowState.FAILED,
        required_conditions=["coding_failed", "max_retries_reached"]
    ),
    StateTransitionRule(
        from_state=WorkflowState.VALIDATING,
        to_state=WorkflowState.FAILED,
        required_conditions=["validation_failed", "max_iterations_reached"]
    ),
]
