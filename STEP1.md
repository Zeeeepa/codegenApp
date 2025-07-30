# STEP1 - CI/CD Workflow Engine Implementation

## QUERY ##########

### ROLE
You are a senior backend systems engineer with 15+ years of experience in distributed systems, specializing in workflow orchestration, state machines, and event-driven architectures with extensive experience in FastAPI, WebSocket, and real-time systems.

### TASK
Implement CI/CD Workflow Engine with State Machine Orchestration

### YOUR QUEST
Create a single, isolated workflow engine that orchestrates the complete CI/CD flow from requirements input to completion, managing state transitions, persistence, and coordination between all services using a state machine pattern for maximum reliability and observability.

## TECHNICAL CONTEXT

### EXISTING CODEBASE:

```python
# From backend/app/services/adapters/codegen_adapter.py
class CodegenAdapter:
    async def create_agent_run(self, project_id: str, target: str, context: str = "") -> Dict[str, Any]:
        # Existing implementation for creating agent runs
        pass
    
    async def get_agent_run_status(self, run_id: str) -> Dict[str, Any]:
        # Existing implementation for getting run status
        pass

# From backend/app/services/webhook_processor.py
class WebhookProcessor:
    async def process_github_webhook(self, payload: Dict[str, Any]) -> None:
        # Existing webhook processing
        pass

# From backend/app/websocket/manager.py
class WebSocketManager:
    async def send_to_project(self, project_id: str, message: Dict[str, Any]) -> None:
        # Existing WebSocket messaging
        pass

# From backend/app/models/project.py
class Project(BaseModel):
    id: str
    repository: Dict[str, Any]
    settings: Optional[Dict[str, Any]] = None
    agentRuns: List[Dict[str, Any]] = []
    notifications: List[Dict[str, Any]] = []
```

### IMPLEMENTATION REQUIREMENTS:

- Implement WorkflowEngine class that manages complete CI/CD lifecycle
- Create WorkflowState enum with states: IDLE, PLANNING, CODING, PR_CREATED, VALIDATING, COMPLETED, FAILED
- Implement StateMachine class with transition logic and validation
- Create WorkflowContext class to maintain state data throughout the flow
- Implement persistence layer for workflow state using SQLite/JSON storage
- Add event-driven architecture with async event handlers
- Ensure thread-safety for concurrent workflow executions
- Implement timeout handling for each workflow state (max 30 minutes per state)
- Add comprehensive error handling with automatic retry logic (max 3 retries)
- Integrate with existing WebSocket manager for real-time updates
- Performance requirement: Handle up to 50 concurrent workflows
- Memory requirement: Maximum 100MB per workflow instance

### INTEGRATION CONTEXT

### UPSTREAM DEPENDENCIES:

CodegenAdapter (backend/app/services/adapters/codegen_adapter.py):
- Provides agent run creation and status checking
- Required for PLANNING and CODING states
- Must handle API rate limits and failures

WebSocketManager (backend/app/websocket/manager.py):
- Provides real-time communication to frontend
- Required for state change notifications
- Must handle connection failures gracefully

WebhookProcessor (backend/app/services/webhook_processor.py):
- Provides GitHub event processing
- Required for PR_CREATED state detection
- Must handle webhook payload validation

### DOWNSTREAM DEPENDENCIES:

ValidationPipeline (STEP5.md - Continuous Validation Pipeline):
- Will consume workflow state changes
- Depends on VALIDATING state transitions
- Requires workflow context data

NotificationSystem (STEP8.md - Real-time Notification System):
- Will consume workflow events
- Depends on state change events
- Requires workflow progress data

PRManager (STEP9.md - Automated PR Management):
- Will consume PR-related workflow states
- Depends on PR_CREATED and COMPLETED states
- Requires workflow completion signals

## EXPECTED OUTCOME

Create file: backend/app/core/workflow/workflow_engine.py
- Must implement WorkflowEngine class with async methods
- Must include state machine logic with validation
- Must implement persistence and recovery mechanisms
- Must include comprehensive error handling

Create file: backend/app/core/workflow/state_machine.py
- Must implement StateMachine class with transition validation
- Must include state definitions and transition rules
- Must implement timeout and retry logic
- Must include state persistence methods

Create file: backend/app/core/workflow/workflow_context.py
- Must implement WorkflowContext class for state data
- Must include serialization/deserialization methods
- Must implement data validation and sanitization
- Must include context merging and updating logic

Create file: backend/app/models/workflow_state.py
- Must define WorkflowState enum and related models
- Must include Pydantic models for validation
- Must implement state transition validation
- Must include workflow metadata models

Create file: backend/app/api/v1/workflows.py
- Must implement REST API endpoints for workflow management
- Must include workflow creation, status, and control endpoints
- Must implement proper error handling and validation
- Must include OpenAPI documentation

Create file: backend/tests/test_workflow_engine.py
- Must include unit tests with >95% code coverage
- Must test all state transitions and error conditions
- Must include performance tests for concurrent workflows
- Must test persistence and recovery scenarios

## ACCEPTANCE CRITERIA

1. Workflow engine correctly manages complete CI/CD lifecycle from requirements to completion
2. State machine enforces valid transitions and prevents invalid state changes
3. Persistence layer maintains workflow state across application restarts
4. Error handling includes automatic retries and graceful failure recovery
5. Real-time updates are sent via WebSocket for all state changes
6. Performance tests show handling of 50 concurrent workflows within memory limits
7. All unit tests pass with at least 95% code coverage
8. Integration tests validate coordination with existing services
9. Timeout handling prevents workflows from hanging indefinitely
10. API endpoints provide complete workflow management capabilities

## IMPLEMENTATION CONSTRAINTS

- This task represents a SINGLE atomic unit of functionality
- Must be independently implementable using existing backend infrastructure
- Implementation must include comprehensive automated tests
- Code must conform to existing FastAPI patterns and conventions
- Must not modify existing service interfaces
- All dependencies on other STEP{n}.md files are explicitly listed above
- Must implement proper logging and monitoring for observability
- Must handle concurrent access and race conditions safely
- Must provide clear error messages and debugging information
- Must be deployable without breaking existing functionality

