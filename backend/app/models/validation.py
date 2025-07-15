"""
CodegenApp Validation Models
Data models for validation pipeline and SWE-bench integration
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ValidationStatus(str, Enum):
    """Validation flow status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class ValidationStage(str, Enum):
    """Validation pipeline stages"""
    INITIALIZING = "initializing"
    SNAPSHOT_CREATION = "snapshot_creation"
    CODEBASE_CLONING = "codebase_cloning"
    DEPLOYMENT = "deployment"
    GEMINI_VALIDATION = "gemini_validation"
    WEB_EVAL_TESTING = "web_eval_testing"
    GRAPH_SITTER_ANALYSIS = "graph_sitter_analysis"
    AUTO_MERGE_DECISION = "auto_merge_decision"
    CLEANUP = "cleanup"


class ValidationRequest(BaseModel):
    """Validation request model"""
    flow_id: str = Field(..., description="Unique flow identifier")
    project_name: str = Field(..., description="Name of the project")
    pr_number: int = Field(..., description="Pull request number")
    pr_url: str = Field(..., description="Pull request URL")
    base_branch: str = Field("main", description="Base branch for comparison")
    deployment_commands: List[str] = Field(..., description="Deployment commands to execute")
    auto_merge_enabled: bool = Field(False, description="Enable auto-merge on success")
    validation_config: Dict[str, Any] = Field(default_factory=dict, description="Custom validation configuration")
    timeout: int = Field(1800, description="Validation timeout in seconds")
    retry_count: int = Field(0, description="Current retry attempt")


class ValidationResponse(BaseModel):
    """Validation response model"""
    flow_id: str
    status: ValidationStatus
    message: str
    started_at: datetime
    completed_at: Optional[datetime] = None


class StageResult(BaseModel):
    """Individual stage result"""
    stage: ValidationStage
    status: ValidationStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None
    success: bool = False
    error_message: Optional[str] = None
    output: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ValidationResult(BaseModel):
    """Complete validation result"""
    flow_id: str
    project_name: str
    pr_number: int
    pr_url: str
    status: ValidationStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_duration: float = 0.0
    
    # Stage results
    stages: Dict[str, StageResult] = Field(default_factory=dict)
    current_stage: ValidationStage = ValidationStage.INITIALIZING
    progress: float = 0.0
    
    # Validation outcomes
    deployment_success: bool = False
    gemini_validation_score: float = 0.0
    web_eval_success: bool = False
    graph_sitter_analysis: Dict[str, Any] = Field(default_factory=dict)
    
    # Decision making
    confidence_score: float = 0.0
    auto_merge_decision: Optional[str] = None
    auto_merge_reason: Optional[str] = None
    
    # Error tracking
    error_count: int = 0
    error_messages: List[str] = Field(default_factory=list)
    
    # Recommendations
    recommendations: List[str] = Field(default_factory=list)
    
    # Logs and debugging
    logs: List[str] = Field(default_factory=list)
    debug_info: Dict[str, Any] = Field(default_factory=dict)


class SnapshotInfo(BaseModel):
    """Validation snapshot information"""
    snapshot_id: str
    project_name: str
    created_at: datetime
    last_used: Optional[datetime] = None
    size_mb: float
    status: str
    tools_installed: List[str] = Field(default_factory=list)
    environment_variables: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DeploymentResult(BaseModel):
    """Deployment execution result"""
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration: float
    command: str
    environment: Dict[str, str] = Field(default_factory=dict)
    working_directory: str
    timestamp: datetime


class GeminiValidationResult(BaseModel):
    """Gemini AI validation result"""
    success: bool
    confidence_score: float
    analysis: str
    recommendations: List[str] = Field(default_factory=list)
    issues_found: List[Dict[str, Any]] = Field(default_factory=list)
    code_quality_score: float = 0.0
    security_score: float = 0.0
    performance_score: float = 0.0
    maintainability_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WebEvalResult(BaseModel):
    """Web-Eval-Agent testing result"""
    success: bool
    tests_passed: int
    tests_failed: int
    total_tests: int
    coverage_percentage: float = 0.0
    performance_metrics: Dict[str, float] = Field(default_factory=dict)
    accessibility_score: float = 0.0
    ui_issues: List[Dict[str, Any]] = Field(default_factory=list)
    screenshots: List[str] = Field(default_factory=list)
    test_reports: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphSitterAnalysisResult(BaseModel):
    """Graph-Sitter code analysis result"""
    success: bool
    languages_analyzed: List[str] = Field(default_factory=list)
    files_analyzed: int = 0
    complexity_score: float = 0.0
    code_patterns: List[Dict[str, Any]] = Field(default_factory=list)
    potential_issues: List[Dict[str, Any]] = Field(default_factory=list)
    refactoring_suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    dependency_analysis: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AutoMergeDecision(BaseModel):
    """Auto-merge decision model"""
    decision: str  # "merge", "reject", "manual_review"
    confidence: float
    reason: str
    factors: Dict[str, Any] = Field(default_factory=dict)
    requirements_met: Dict[str, bool] = Field(default_factory=dict)
    risk_assessment: Dict[str, float] = Field(default_factory=dict)
    timestamp: datetime


class ValidationFlowStatus(BaseModel):
    """Real-time validation flow status"""
    flow_id: str
    project_name: str
    pr_number: int
    status: ValidationStatus
    current_stage: ValidationStage
    progress: float
    started_at: datetime
    updated_at: datetime
    estimated_completion: Optional[datetime] = None
    logs: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    
    # Real-time metrics
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    network_usage: float = 0.0
    
    # Stage progress
    stage_progress: Dict[str, float] = Field(default_factory=dict)
    stage_eta: Dict[str, Optional[datetime]] = Field(default_factory=dict)


class ValidationMetrics(BaseModel):
    """Validation pipeline metrics"""
    total_validations: int = 0
    successful_validations: int = 0
    failed_validations: int = 0
    average_duration: float = 0.0
    success_rate: float = 0.0
    
    # Stage metrics
    stage_durations: Dict[str, float] = Field(default_factory=dict)
    stage_success_rates: Dict[str, float] = Field(default_factory=dict)
    
    # Auto-merge metrics
    auto_merge_rate: float = 0.0
    manual_review_rate: float = 0.0
    rejection_rate: float = 0.0
    
    # Error analysis
    common_errors: List[Dict[str, Any]] = Field(default_factory=list)
    error_trends: Dict[str, List[float]] = Field(default_factory=dict)


class SWEBenchIntegration(BaseModel):
    """SWE-bench integration configuration"""
    enabled: bool = True
    dataset: str = "lite"
    timeout: int = 1800
    max_workers: int = 4
    cache_level: str = "env"
    custom_test_spec: Optional[Dict[str, Any]] = None
    evaluation_config: Dict[str, Any] = Field(default_factory=dict)

