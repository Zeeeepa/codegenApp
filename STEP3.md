# STEP3.md - Implement Real-time Notification System

## QUERY 3 ##########

### ROLE
You are a senior backend engineer with 8+ years of experience in real-time communication systems, specializing in WebSocket implementation, Server-Sent Events, and real-time dashboard updates with extensive knowledge of FastAPI WebSocket patterns and React real-time integration.

### TASK
Implement Real-time Notification System with WebSocket/SSE Integration

### YOUR QUEST
Create a comprehensive real-time communication layer using WebSocket or Server-Sent Events to provide live updates for agent run progress, PR notifications, validation status, and dashboard state changes with proper connection management and reconnection logic.

### TECHNICAL CONTEXT

#### EXISTING CODEBASE:

```python
# From backend/main.py (FastAPI application structure)
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# From backend/services/WebhookProcessor.js (existing webhook handling)
class WebhookProcessor {
    async processPRWebhook(payload) {
        // Existing PR webhook processing
        // Need to integrate with real-time notifications
    }
}

# From frontend/src/store/projectStore.ts (existing state management)
interface Project {
  id: string;
  notifications: Notification[];
  agentRuns: AgentRun[];
  // ... other properties
}
```

#### IMPLEMENTATION REQUIREMENTS:

- Implement FastAPI WebSocket endpoint for real-time communication
- Create React WebSocket client with automatic reconnection
- Add connection state management (connecting, connected, disconnected, error)
- Implement message queuing for offline scenarios
- Add real-time updates for agent run progress, PR notifications, validation status
- Support multiple concurrent connections per user/project
- Implement heartbeat/ping-pong for connection health monitoring
- Add proper error handling and fallback mechanisms
- Performance requirement: <50ms message delivery latency
- Support message acknowledgment and delivery confirmation
- Implement connection pooling for multiple projects

### INTEGRATION CONTEXT

#### UPSTREAM DEPENDENCIES:

- STEP1.md - UI Foundation: Requires error boundary for WebSocket error handling
- STEP2.md - Agent Run Dialog: Provides workflow state changes to broadcast
- backend/services/WebhookProcessor.js: Source of PR and webhook notifications
- backend/services/CodegenApiService.js: Source of agent run progress updates
- frontend/src/store/projectStore.ts: Target for real-time state updates

#### DOWNSTREAM DEPENDENCIES:

- STEP4.md - Validation Pipeline: Will broadcast validation progress via WebSocket
- STEP7.md - Auto-merge Functionality: Will send merge notifications via WebSocket
- STEP8.md - Web-Eval-Agent Testing: Must validate real-time notification functionality
- All dashboard components: Will receive and display real-time updates

### EXPECTED OUTCOME

#### Files to Create:
- `backend/services/WebSocketService.py` - FastAPI WebSocket server implementation
- `frontend/src/services/websocketService.ts` - React WebSocket client
- `frontend/src/hooks/useWebSocket.ts` - React hook for WebSocket integration
- `backend/models/WebSocketMessage.py` - Message type definitions
- `frontend/src/types/websocket.ts` - TypeScript WebSocket message types

#### Files to Modify:
- `backend/main.py` - Add WebSocket endpoint registration
- `backend/services/WebhookProcessor.js` - Integrate WebSocket notifications
- `frontend/src/store/projectStore.ts` - Add real-time update handlers
- `frontend/src/components/dashboard/ProjectCard.tsx` - Display real-time updates

#### Required Interfaces:
```python
# Backend WebSocket Message Types
class WebSocketMessage(BaseModel):
    type: str  # 'agent_run_progress', 'pr_notification', 'validation_update'
    project_id: str
    data: Dict[str, Any]
    timestamp: datetime
    message_id: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, project_id: str):
        pass
    
    async def disconnect(self, websocket: WebSocket, project_id: str):
        pass
    
    async def broadcast_to_project(self, project_id: str, message: WebSocketMessage):
        pass
```

```typescript
// Frontend WebSocket Types
interface WebSocketState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastMessage?: WebSocketMessage;
  reconnectAttempts: number;
}

interface WebSocketMessage {
  type: 'agent_run_progress' | 'pr_notification' | 'validation_update';
  projectId: string;
  data: any;
  timestamp: string;
  messageId: string;
}

interface UseWebSocketReturn {
  state: WebSocketState;
  sendMessage: (message: WebSocketMessage) => void;
  subscribe: (projectId: string) => void;
  unsubscribe: (projectId: string) => void;
}
```

### ACCEPTANCE CRITERIA

1. WebSocket server handles multiple concurrent connections efficiently
2. React client automatically reconnects on connection loss
3. Real-time updates appear in dashboard within 50ms of server broadcast
4. Connection state is properly managed and displayed to users
5. Message queuing works correctly during offline scenarios
6. Heartbeat mechanism maintains connection health monitoring
7. Error handling provides graceful degradation when WebSocket unavailable
8. Multiple project subscriptions work without interference
9. Message acknowledgment ensures reliable delivery
10. Performance: <50ms message delivery latency maintained under load
11. Web-eval-agent validation passes for real-time functionality testing

### IMPLEMENTATION CONSTRAINTS

- This task represents a SINGLE atomic unit of functionality
- Must be independently implementable except for STEP1.md and STEP2.md dependencies
- Implementation must include comprehensive automated tests
- Code must conform to project coding standards with proper type safety
- Must handle network failures gracefully with automatic recovery
- All WebSocket messages must be properly typed and validated

### TESTING REQUIREMENTS

#### Unit Tests Required:
- WebSocketService connection management
- WebSocket client reconnection logic
- Message serialization/deserialization
- useWebSocket hook state management

#### Integration Tests Required:
- End-to-end WebSocket communication
- Multiple client connection handling
- Message broadcasting to specific projects
- Connection failure and recovery scenarios

#### Performance Tests Required:
- Message delivery latency <50ms
- Concurrent connection handling (100+ connections)
- Memory usage under sustained load
- Reconnection performance and reliability

