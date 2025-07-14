# Component Interfaces Specification

## Overview

This document defines the standardized interfaces, data formats, and communication protocols between all library kit components. These interfaces ensure seamless integration and interoperability.

## Core Interface Patterns

### 1. Service Adapter Interface

All external components integrate through the Service Adapter pattern:

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class ServiceAdapter(ABC):
    """Base interface for all service adapters"""
    
    @abstractmethod
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific action with given context"""
        pass
    
    @abstractmethod
    async def health_check(self) -> str:
        """Check service health status"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup resources and connections"""
        pass
    
    @property
    @abstractmethod
    def supported_actions(self) -> List[str]:
        """List of supported actions"""
        pass
```

### 2. Event Interface

Components communicate through standardized events:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

@dataclass
class Event:
    """Base event structure"""
    event_type: str
    source_component: str
    target_component: Optional[str]
    payload: Dict[str, Any]
    timestamp: datetime
    correlation_id: str
    workflow_id: Optional[str] = None
    
class EventHandler(ABC):
    @abstractmethod
    async def handle_event(self, event: Event) -> Optional[Event]:
        """Handle incoming event and optionally return response event"""
        pass
```

## Component-Specific Interfaces

### CodegenApp Interface

**REST API Endpoints:**

```yaml
# Workflow Management
POST /api/v1/workflows
GET /api/v1/workflows
GET /api/v1/workflows/{id}
DELETE /api/v1/workflows/{id}
POST /api/v1/workflows/{id}/cancel

# Real-time Updates
WebSocket /ws/workflows/{id}

# Component Status
GET /health
GET /api/v1/components/status
```

**Data Models:**

```python
class WorkflowRequest:
    workflow: WorkflowDefinition
    parameters: Dict[str, Any]
    priority: int = 0
    
class WorkflowResponse:
    execution: WorkflowExecution
    status: str
    message: str
```

### Codegen SDK Interface

**Actions:**
- `create_agent_run`: Create new agent execution
- `get_agent_run`: Retrieve agent run status
- `list_agent_runs`: List user's agent runs
- `resume_agent_run`: Resume paused agent run
- `get_current_user`: Get authenticated user info
- `validate_token`: Validate authentication token

**Data Models:**

```python
class AgentRunRequest:
    prompt: str
    context: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    
class AgentRunResponse:
    run_id: str
    status: str
    output: Optional[str] = None
    artifacts: List[str] = []
    metadata: Dict[str, Any] = {}
```

### Grainchain Interface

**Actions:**
- `create_sandbox`: Create new sandbox environment
- `destroy_sandbox`: Destroy sandbox
- `execute_command`: Execute command in sandbox
- `upload_file`: Upload file to sandbox
- `download_file`: Download file from sandbox
- `list_files`: List files in sandbox
- `create_snapshot`: Create sandbox snapshot
- `restore_snapshot`: Restore from snapshot
- `get_sandbox_status`: Get sandbox status
- `list_sandboxes`: List active sandboxes

**Data Models:**

```python
class SandboxRequest:
    provider: str = "local"
    image: Optional[str] = None
    timeout: int = 300
    working_directory: str = "/tmp"
    environment_vars: Dict[str, str] = {}
    
class SandboxResponse:
    sandbox_id: str
    provider: str
    status: str
    created_at: str
    endpoints: List[str] = []
    
class CommandRequest:
    sandbox_id: str
    command: str
    timeout: Optional[int] = None
    working_dir: Optional[str] = None
    environment: Optional[Dict[str, str]] = None
    
class CommandResponse:
    stdout: str
    stderr: str
    return_code: int
    success: bool
    execution_time: float
```

### Graph-Sitter Interface

**Actions:**
- `parse_code`: Parse code and generate AST
- `analyze_structure`: Analyze code structure and patterns
- `extract_functions`: Extract function definitions
- `extract_classes`: Extract class definitions
- `find_dependencies`: Find code dependencies
- `suggest_refactoring`: Suggest refactoring opportunities
- `validate_syntax`: Validate code syntax
- `get_metrics`: Calculate code metrics

**Data Models:**

```python
class CodeParseRequest:
    content: str
    language: str
    file_path: Optional[str] = None
    include_comments: bool = True
    
class CodeParseResponse:
    ast: Dict[str, Any]
    syntax_errors: List[SyntaxError] = []
    parse_time: float
    
class CodeAnalysisRequest:
    content: str
    language: str
    analysis_types: List[str] = ["structure", "metrics", "dependencies"]
    
class CodeAnalysisResponse:
    structure: Dict[str, Any]
    metrics: Dict[str, float]
    dependencies: List[str]
    issues: List[CodeIssue]
    suggestions: List[RefactoringSuggestion]
    
class CodeIssue:
    type: str
    severity: str
    message: str
    line: int
    column: int
    
class RefactoringSuggestion:
    type: str
    description: str
    location: CodeLocation
    confidence: float
```

### Web-Eval-Agent Interface

**Actions:**
- `evaluate_website`: Comprehensive website evaluation
- `test_performance`: Performance testing and metrics
- `check_accessibility`: Accessibility compliance check
- `validate_seo`: SEO optimization analysis
- `test_ui_components`: UI component testing
- `run_lighthouse`: Run Lighthouse audit
- `check_security`: Security vulnerability scan
- `test_mobile_responsive`: Mobile responsiveness test

**Data Models:**

```python
class WebEvaluationRequest:
    url: str
    evaluation_types: List[str] = ["performance", "accessibility", "seo"]
    device_types: List[str] = ["desktop", "mobile"]
    timeout: int = 60
    
class WebEvaluationResponse:
    url: str
    overall_score: float
    performance: PerformanceMetrics
    accessibility: AccessibilityReport
    seo: SEOReport
    security: SecurityReport
    recommendations: List[Recommendation]
    
class PerformanceMetrics:
    load_time: float
    first_contentful_paint: float
    largest_contentful_paint: float
    cumulative_layout_shift: float
    first_input_delay: float
    
class AccessibilityReport:
    score: float
    violations: List[AccessibilityViolation]
    passes: int
    incomplete: int
    
class Recommendation:
    category: str
    priority: str
    description: str
    impact: str
    effort: str
```

## Event Types and Payloads

### Workflow Events

```python
# Workflow Started
{
    "event_type": "workflow.started",
    "payload": {
        "execution_id": "exec_123",
        "workflow_id": "workflow_456",
        "user_id": "user_789",
        "parameters": {...}
    }
}

# Workflow Step Completed
{
    "event_type": "workflow.step.completed",
    "payload": {
        "execution_id": "exec_123",
        "step_id": "step_1",
        "result": {...},
        "duration": 5.2
    }
}

# Workflow Failed
{
    "event_type": "workflow.failed",
    "payload": {
        "execution_id": "exec_123",
        "error": "Error message",
        "failed_step": "step_2"
    }
}
```

### Resource Events

```python
# Sandbox Created
{
    "event_type": "sandbox.created",
    "payload": {
        "sandbox_id": "sandbox_123",
        "provider": "local",
        "resources": {...}
    }
}

# Sandbox Status Changed
{
    "event_type": "sandbox.status_changed",
    "payload": {
        "sandbox_id": "sandbox_123",
        "old_status": "creating",
        "new_status": "running"
    }
}
```

### Analysis Events

```python
# Code Analysis Completed
{
    "event_type": "analysis.completed",
    "payload": {
        "file_path": "/src/main.py",
        "language": "python",
        "metrics": {...},
        "issues": [...]
    }
}

# Refactoring Suggested
{
    "event_type": "analysis.refactoring_suggested",
    "payload": {
        "file_path": "/src/main.py",
        "suggestions": [...],
        "confidence": 0.85
    }
}
```

### Evaluation Events

```python
# Web Evaluation Completed
{
    "event_type": "evaluation.completed",
    "payload": {
        "url": "https://example.com",
        "overall_score": 85.5,
        "performance_score": 90.0,
        "accessibility_score": 80.0
    }
}

# Security Issue Found
{
    "event_type": "evaluation.security_issue",
    "payload": {
        "url": "https://example.com",
        "severity": "high",
        "issue_type": "xss_vulnerability",
        "description": "..."
    }
}
```

## Error Handling Interfaces

### Standard Error Response

```python
class ErrorResponse:
    error_code: str
    error_message: str
    error_details: Optional[Dict[str, Any]] = None
    timestamp: datetime
    correlation_id: str
    
# Common error codes
ERROR_CODES = {
    "INVALID_REQUEST": "Request validation failed",
    "RESOURCE_NOT_FOUND": "Requested resource not found",
    "TIMEOUT": "Operation timed out",
    "RATE_LIMIT_EXCEEDED": "Rate limit exceeded",
    "INTERNAL_ERROR": "Internal server error",
    "SERVICE_UNAVAILABLE": "Service temporarily unavailable"
}
```

### Retry Policies

```python
class RetryPolicy:
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    
    retryable_errors: List[str] = [
        "TIMEOUT",
        "SERVICE_UNAVAILABLE",
        "RATE_LIMIT_EXCEEDED"
    ]
```

## Authentication & Authorization

### JWT Token Structure

```python
class JWTPayload:
    user_id: str
    organization_id: int
    roles: List[str]
    permissions: List[str]
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp
    
# Example permissions
PERMISSIONS = [
    "workflow.create",
    "workflow.execute",
    "workflow.delete",
    "sandbox.create",
    "sandbox.access",
    "analysis.run",
    "evaluation.run"
]
```

### API Key Authentication

```python
class APIKeyAuth:
    key_id: str
    secret_hash: str
    permissions: List[str]
    rate_limit: int
    expires_at: Optional[datetime] = None
```

## Configuration Interfaces

### Component Configuration

```python
class ComponentConfig:
    component_name: str
    version: str
    enabled: bool = True
    config: Dict[str, Any]
    dependencies: List[str] = []
    
class GlobalConfig:
    environment: str
    debug: bool
    log_level: str
    components: Dict[str, ComponentConfig]
    shared_settings: Dict[str, Any]
```

### Environment Variables

```bash
# Core settings
LIBRARY_KIT_ENV=development
LIBRARY_KIT_DEBUG=true
LIBRARY_KIT_LOG_LEVEL=INFO

# Component endpoints
CODEGEN_API_URL=https://api.codegen.com
GRAINCHAIN_PROVIDER=local
GRAPH_SITTER_LANGUAGES=python,javascript,typescript
WEB_EVAL_TIMEOUT=60

# Authentication
JWT_SECRET_KEY=your-secret-key
API_KEY_SALT=your-api-salt

# Database
DATABASE_URL=postgresql://user:pass@localhost/db
REDIS_URL=redis://localhost:6379/0
```

## Monitoring & Observability

### Metrics Interface

```python
class MetricPoint:
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = {}
    
class HealthCheck:
    component: str
    status: str  # "healthy", "degraded", "unhealthy"
    message: str
    checks: Dict[str, bool]
    response_time: float
```

### Logging Interface

```python
class LogEntry:
    timestamp: datetime
    level: str
    component: str
    message: str
    correlation_id: Optional[str] = None
    workflow_id: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
```

This interface specification ensures consistent communication patterns across all library kit components, enabling seamless integration and maintainability.

