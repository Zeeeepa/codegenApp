"""
API Models for Strands-Agents Backend
Defines all request/response models for the API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


# ============================================================================
# HEALTH AND STATUS MODELS
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Overall system status")
    services: Dict[str, str] = Field(..., description="Individual service statuses")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# CODEGEN API MODELS (matching frontend types)
# ============================================================================

class AgentRunStatus(str, Enum):
    """Agent run status enum"""
    ACTIVE = "ACTIVE"
    ERROR = "ERROR"
    EVALUATION = "EVALUATION"
    COMPLETE = "COMPLETE"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"
    MAX_ITERATIONS_REACHED = "MAX_ITERATIONS_REACHED"
    OUT_OF_TOKENS = "OUT_OF_TOKENS"
    FAILED = "FAILED"
    PAUSED = "PAUSED"
    PENDING = "PENDING"


class AgentRunResponse(BaseModel):
    """Agent run response model"""
    id: int = Field(..., description="Agent run ID")
    organization_id: int = Field(..., description="Organization ID")
    status: AgentRunStatus = Field(..., description="Current status")
    created_at: str = Field(..., description="Creation timestamp")
    web_url: str = Field(..., description="Web URL for viewing the run")
    result: Optional[str] = Field(None, description="Run result if completed")


class UserResponse(BaseModel):
    """User response model"""
    id: int = Field(..., description="User ID")
    email: Optional[str] = Field(None, description="User email")
    github_user_id: str = Field(..., description="GitHub user ID")
    github_username: str = Field(..., description="GitHub username")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    full_name: Optional[str] = Field(None, description="Full name")


class OrganizationResponse(BaseModel):
    """Organization response model"""
    id: int = Field(..., description="Organization ID")
    name: str = Field(..., description="Organization name")
    settings: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Organization settings"
    )


class CreateAgentRunRequest(BaseModel):
    """Create agent run request"""
    prompt: str = Field(..., description="Prompt for the agent")
    images: Optional[List[str]] = Field(None, description="Base64 encoded images")
    workflow_context: Optional[Dict[str, Any]] = Field(
        None, description="Additional workflow context"
    )


class ResumeAgentRunRequest(BaseModel):
    """Resume agent run request"""
    agent_run_id: int = Field(..., description="Agent run ID to resume")
    prompt: str = Field(..., description="Resume prompt")
    images: Optional[List[str]] = Field(None, description="Base64 encoded images")


class StopAgentRunRequest(BaseModel):
    """Stop agent run request"""
    agent_run_id: int = Field(..., description="Agent run ID to stop")


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")


# ============================================================================
# WORKFLOW ORCHESTRATION MODELS
# ============================================================================

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
    id: str = Field(..., description="Step ID")
    name: str = Field(..., description="Step name")
    service: str = Field(..., description="Service to execute (codegen, grainchain, etc.)")
    action: str = Field(..., description="Action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Step parameters")
    depends_on: List[str] = Field(default_factory=list, description="Dependencies")
    timeout: Optional[int] = Field(None, description="Step timeout in seconds")
    retry_count: int = Field(default=0, description="Number of retries")


class WorkflowDefinition(BaseModel):
    """Workflow definition"""
    id: str = Field(..., description="Workflow ID")
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    steps: List[WorkflowStep] = Field(..., description="Workflow steps")
    timeout: Optional[int] = Field(None, description="Overall workflow timeout")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class WorkflowExecution(BaseModel):
    """Workflow execution state"""
    id: str = Field(..., description="Execution ID")
    workflow_id: str = Field(..., description="Workflow definition ID")
    status: WorkflowStatus = Field(..., description="Execution status")
    started_at: datetime = Field(..., description="Start time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")
    current_step: Optional[str] = Field(None, description="Currently executing step")
    step_results: Dict[str, Any] = Field(default_factory=dict, description="Step results")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    organization_id: int = Field(..., description="Organization ID")
    user_id: int = Field(..., description="User ID who started the workflow")


class CreateWorkflowRequest(BaseModel):
    """Create workflow request"""
    workflow: WorkflowDefinition = Field(..., description="Workflow definition")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Runtime parameters")


class WorkflowExecutionResponse(BaseModel):
    """Workflow execution response"""
    execution: WorkflowExecution = Field(..., description="Execution details")
    step_statuses: Dict[str, WorkflowStepStatus] = Field(
        default_factory=dict, description="Individual step statuses"
    )


# ============================================================================
# GRAINCHAIN SANDBOX MODELS
# ============================================================================

class SandboxStatus(str, Enum):
    """Sandbox status"""
    CREATING = "CREATING"
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"
    DESTROYED = "DESTROYED"


class SandboxRequest(BaseModel):
    """Create sandbox request"""
    name: str = Field(..., description="Sandbox name")
    image: str = Field(..., description="Docker image to use")
    environment: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    ports: List[int] = Field(default_factory=list, description="Ports to expose")
    timeout: Optional[int] = Field(None, description="Sandbox timeout in seconds")
    resources: Optional[Dict[str, Any]] = Field(None, description="Resource limits")


class SandboxResponse(BaseModel):
    """Sandbox response"""
    id: str = Field(..., description="Sandbox ID")
    name: str = Field(..., description="Sandbox name")
    status: SandboxStatus = Field(..., description="Current status")
    image: str = Field(..., description="Docker image")
    created_at: datetime = Field(..., description="Creation time")
    endpoints: Dict[str, str] = Field(default_factory=dict, description="Exposed endpoints")
    logs_url: Optional[str] = Field(None, description="Logs URL")


class DeploymentImageRequest(BaseModel):
    """Create deployment image request"""
    name: str = Field(..., description="Image name")
    source_code: str = Field(..., description="Source code or repository URL")
    build_config: Dict[str, Any] = Field(default_factory=dict, description="Build configuration")
    environment: Dict[str, str] = Field(default_factory=dict, description="Environment variables")


class DeploymentImageResponse(BaseModel):
    """Deployment image response"""
    id: str = Field(..., description="Image ID")
    name: str = Field(..., description="Image name")
    tag: str = Field(..., description="Image tag")
    status: str = Field(..., description="Build status")
    created_at: datetime = Field(..., description="Creation time")
    size: Optional[int] = Field(None, description="Image size in bytes")
    registry_url: Optional[str] = Field(None, description="Registry URL")


# ============================================================================
# GRAPH-SITTER CODE ANALYSIS MODELS
# ============================================================================

class AnalysisRequest(BaseModel):
    """Code analysis request"""
    code: str = Field(..., description="Source code to analyze")
    language: str = Field(..., description="Programming language")
    analysis_types: List[str] = Field(
        default_factory=lambda: ["syntax", "structure"],
        description="Types of analysis to perform"
    )
    file_path: Optional[str] = Field(None, description="File path for context")


class CodeSymbol(BaseModel):
    """Code symbol information"""
    name: str = Field(..., description="Symbol name")
    type: str = Field(..., description="Symbol type (function, class, variable, etc.)")
    line_start: int = Field(..., description="Starting line number")
    line_end: int = Field(..., description="Ending line number")
    column_start: int = Field(..., description="Starting column")
    column_end: int = Field(..., description="Ending column")
    scope: Optional[str] = Field(None, description="Symbol scope")
    parameters: Optional[List[str]] = Field(None, description="Function parameters")
    return_type: Optional[str] = Field(None, description="Return type")


class AnalysisResult(BaseModel):
    """Code analysis result"""
    language: str = Field(..., description="Programming language")
    file_path: Optional[str] = Field(None, description="File path")
    symbols: List[CodeSymbol] = Field(default_factory=list, description="Extracted symbols")
    syntax_errors: List[str] = Field(default_factory=list, description="Syntax errors")
    complexity_metrics: Dict[str, Any] = Field(
        default_factory=dict, description="Code complexity metrics"
    )
    dependencies: List[str] = Field(default_factory=list, description="Code dependencies")
    analysis_metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional analysis metadata"
    )


# ============================================================================
# WEB-EVAL-AGENT MODELS
# ============================================================================

class EvaluationRequest(BaseModel):
    """Web evaluation request"""
    url: str = Field(..., description="URL to evaluate")
    evaluation_type: str = Field(..., description="Type of evaluation")
    criteria: Dict[str, Any] = Field(default_factory=dict, description="Evaluation criteria")
    timeout: Optional[int] = Field(None, description="Evaluation timeout")
    screenshot: bool = Field(default=False, description="Take screenshot")
    user_agent: Optional[str] = Field(None, description="Custom user agent")


class EvaluationResult(BaseModel):
    """Web evaluation result"""
    id: str = Field(..., description="Evaluation ID")
    url: str = Field(..., description="Evaluated URL")
    status: str = Field(..., description="Evaluation status")
    score: Optional[float] = Field(None, description="Overall score")
    results: Dict[str, Any] = Field(default_factory=dict, description="Detailed results")
    screenshot_url: Optional[str] = Field(None, description="Screenshot URL")
    execution_time: float = Field(..., description="Execution time in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Creation time")


# ============================================================================
# WEBSOCKET MODELS
# ============================================================================

class WebSocketMessage(BaseModel):
    """WebSocket message format"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkflowProgressUpdate(BaseModel):
    """Workflow progress update"""
    execution_id: str = Field(..., description="Workflow execution ID")
    status: WorkflowStatus = Field(..., description="Current status")
    current_step: Optional[str] = Field(None, description="Current step")
    progress_percentage: Optional[float] = Field(None, description="Progress percentage")
    message: Optional[str] = Field(None, description="Status message")


# ============================================================================
# ERROR MODELS
# ============================================================================

class APIError(BaseModel):
    """API error response"""
    message: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")
    details: Optional[str] = Field(None, description="Additional error details")
    error_code: Optional[str] = Field(None, description="Internal error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# PROJECT MANAGEMENT MODELS
# ============================================================================

class ProjectStatus(str, Enum):
    """Project status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class DeploymentSettings(BaseModel):
    """Project deployment settings"""
    build_command: str = Field(default="npm run build", description="Build command")
    deploy_command: str = Field(default="npm run deploy", description="Deploy command")
    health_check_url: str = Field(default="/health", description="Health check URL")
    environment_variables: Dict[str, str] = Field(default_factory=dict, description="Environment variables")


class ValidationSettings(BaseModel):
    """Project validation settings"""
    auto_merge: bool = Field(default=False, description="Auto-merge PRs after validation")
    required_checks: List[str] = Field(default_factory=list, description="Required CI checks")
    timeout_minutes: int = Field(default=30, description="Validation timeout in minutes")
    max_retries: int = Field(default=3, description="Maximum retry attempts")


class ProjectResponse(BaseModel):
    """Project response model"""
    id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    webhook_url: str = Field(..., description="Webhook URL")
    github_repo: str = Field(..., description="GitHub repository")
    status: ProjectStatus = Field(..., description="Project status")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    last_run: Optional[str] = Field(None, description="Last run timestamp")
    deployment_settings: DeploymentSettings = Field(..., description="Deployment settings")
    validation_settings: ValidationSettings = Field(..., description="Validation settings")


class CreateProjectRequest(BaseModel):
    """Create project request"""
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    webhook_url: str = Field(..., description="Webhook URL")
    github_repo: str = Field(..., description="GitHub repository")
    deployment_settings: Dict[str, Any] = Field(default_factory=dict, description="Deployment settings")
    validation_settings: Dict[str, Any] = Field(default_factory=dict, description="Validation settings")


class UpdateProjectRequest(BaseModel):
    """Update project request"""
    name: Optional[str] = Field(None, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    webhook_url: Optional[str] = Field(None, description="Webhook URL")
    github_repo: Optional[str] = Field(None, description="GitHub repository")
    status: Optional[ProjectStatus] = Field(None, description="Project status")
    deployment_settings: Optional[Dict[str, Any]] = Field(None, description="Deployment settings")
    validation_settings: Optional[Dict[str, Any]] = Field(None, description="Validation settings")


class ProjectAgentRunStatus(str, Enum):
    """Project agent run status enum"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    WAITING_INPUT = "waiting_input"


class ProjectAgentRunResponse(BaseModel):
    """Project agent run response model"""
    id: str = Field(..., description="Agent run ID")
    project_id: str = Field(..., description="Project ID")
    target_text: str = Field(..., description="Target text for the run")
    status: ProjectAgentRunStatus = Field(..., description="Current status")
    progress_percentage: int = Field(..., description="Progress percentage")
    current_step: Optional[str] = Field(None, description="Current step")
    response_type: Optional[str] = Field(None, description="Response type")
    response_data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    retry_count: int = Field(..., description="Retry count")
    session_id: str = Field(..., description="Session ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


class CreateAgentRunRequest(BaseModel):
    """Create agent run request"""
    target_text: str = Field(..., description="Target text for the agent run")


class ValidationPipelineStatus(str, Enum):
    """Validation pipeline status enum"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ValidationPipelineResponse(BaseModel):
    """Validation pipeline response model"""
    id: str = Field(..., description="Validation pipeline ID")
    project_id: str = Field(..., description="Project ID")
    pull_request_id: str = Field(..., description="Pull request ID")
    status: ValidationPipelineStatus = Field(..., description="Current status")
    progress_percentage: int = Field(..., description="Progress percentage")
    current_step: Optional[str] = Field(None, description="Current step")
    deployment_url: Optional[str] = Field(None, description="Deployment URL")
    created_at: str = Field(..., description="Creation timestamp")
