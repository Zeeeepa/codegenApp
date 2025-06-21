# Codegen Agent Run Manager

A React web application for managing and monitoring Codegen agent runs. This application provides a clean, modern interface to create, track, and interact with AI agent runs through the Codegen API.

## 🚀 Features

- **Create Agent Runs**: Start new AI agent tasks with custom prompts and image uploads
- **Real-time Monitoring**: Track agent run status with automatic polling and updates
- **Interactive Dashboard**: View all agent runs with filtering, sorting, and search capabilities
- **Status Management**: Stop running agents and continue conversations with completed ones
- **Responsive Design**: Modern, dark-themed UI that works on all devices
- **Local Caching**: Efficient data management with background synchronization

## 📋 API Endpoints

### ✅ Working Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/organizations/{id}/agent/run` | POST | Create new agent run | ✅ Working |
| `/v1/organizations/{id}/agent/run/{id}` | GET | Get agent run details | ✅ Working |
| `/v1/organizations/{id}/agent/runs` | GET | List all agent runs | ✅ Working |
| `/v1/beta/organizations/{id}/agent/run/stop` | POST | Stop running agent | ✅ Working |

### ⚠️ Endpoints with Fallbacks

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/beta/organizations/{id}/agent/run/resume` | POST | Resume paused agent | ⚠️ Fallback to new run |
| `/v1/beta/organizations/{id}/agent/run/message` | POST | Send message to agent | ⚠️ Fallback to new run |

*Note: Resume and message endpoints currently return 404. The application gracefully handles this by creating new agent runs with contextual prompts.*

## 🛠️ Functions & Components

### Core Functions

#### API Client (`src/api/client.ts`)
- `createAgentRun(organizationId, request)` - Create new agent run
- `getAgentRun(organizationId, agentRunId)` - Get agent run details
- `listAgentRuns(organizationId, page?, size?)` - List agent runs with pagination
- `stopAgentRun(organizationId, request)` - Stop running agent
- `resumeAgentRun(organizationId, request)` - Resume agent (with fallback)
- `messageAgentRun(organizationId, request)` - Send message (with fallback)

#### Cache Management (`src/storage/agentRunCache.ts`)
- `syncAgentRuns(organizationId)` - Sync with API
- `getAgentRuns(organizationId)` - Get cached runs
- `updateAgentRun(organizationId, agentRun)` - Update single run
- `getPollingRuns(organizationId)` - Get runs needing updates

#### Background Monitoring (`src/utils/backgroundMonitoring.ts`)
- `start()` - Start background monitoring
- `stop()` - Stop background monitoring
- `addAgentRun(agentRun)` - Track new agent run
- `removeAgentRun(agentRunId)` - Stop tracking agent run

### React Components

#### Main Components
- `ListAgentRuns` - Main dashboard with agent run list
- `CreateAgentRunDialog` - Modal for creating new agent runs
- `MessageAgentRunDialog` - Modal for messaging/resuming agent runs
- `AgentRunCard` - Individual agent run display card

#### Utility Components
- `StatusBadge` - Agent run status indicator
- `LoadingSpinner` - Loading state indicator
- `ErrorBoundary` - Error handling wrapper

### Custom Hooks

#### `useCachedAgentRuns`
Main hook for agent run management:
```typescript
const {
  agentRuns,           // All agent runs
  filteredRuns,        // Filtered and sorted runs
  isLoading,           // Initial loading state
  isRefreshing,        // Sync in progress
  error,               // Error message
  syncStatus,          // Sync status
  refresh,             // Manual refresh function
  updateFilters,       // Update filter criteria
  updateSort,          // Update sort options
  organizationId,      // Current organization
  setOrganizationId    // Change organization
} = useCachedAgentRuns();
```

## 🔧 Interfaces & Types

### Core Types (`src/api/types.ts`)

#### Agent Run Response
```typescript
interface AgentRunResponse {
  id: number;
  organization_id: number;
  status: string;
  created_at: string;
  web_url: string;
  result?: string;
}
```

#### Request Types
```typescript
interface CreateAgentRunRequest {
  prompt: string;
  images?: string[]; // Base64 encoded data URIs
}

interface ResumeAgentRunRequest {
  agent_run_id: number;
  prompt: string;
  images?: string[];
}

interface StopAgentRunRequest {
  agent_run_id: number;
}

interface MessageAgentRunRequest {
  agent_run_id: number;
  prompt: string;
  images?: string[];
}
```

#### Status Enum
```typescript
enum AgentRunStatus {
  ACTIVE = "ACTIVE",
  ERROR = "ERROR",
  EVALUATION = "EVALUATION",
  COMPLETE = "COMPLETE",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
  MAX_ITERATIONS_REACHED = "MAX_ITERATIONS_REACHED",
  OUT_OF_TOKENS = "OUT_OF_TOKENS",
  FAILED = "FAILED",
  PAUSED = "PAUSED",
  PENDING = "PENDING"
}
```

#### Filtering & Sorting
```typescript
interface AgentRunFilters {
  status?: AgentRunStatus[];
  organizationId?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

interface SortOptions {
  field: "created_at" | "status" | "organization_id";
  direction: "asc" | "desc";
}
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Codegen API access token

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Your Codegen API token (required)
REACT_APP_API_TOKEN=your_api_token_here

# Your default organization ID (optional)
REACT_APP_DEFAULT_ORGANIZATION=323

# API Base URL - direct connection to Codegen API
REACT_APP_API_BASE_URL=https://api.codegen.com

# User ID for personalized features (optional)
REACT_APP_USER_ID=your_user_id_here
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd codegenApp

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:8000`.

### Production Build

```bash
# Build for production
npm run build

# The build folder contains the production-ready files
```

## 🏗️ Architecture

### Application Structure
```
src/
├── api/                 # API client and types
│   ├── client.ts       # Main API client
│   ├── constants.ts    # API endpoints
│   └── types.ts        # TypeScript interfaces
├── components/         # React components
│   ├── ListAgentRuns.tsx
│   ├── CreateAgentRunDialog.tsx
│   └── MessageAgentRunDialog.tsx
├── hooks/              # Custom React hooks
│   └── useCachedAgentRuns.ts
├── storage/            # Local storage and caching
│   ├── agentRunCache.ts
│   └── cacheTypes.ts
├── utils/              # Utility functions
│   ├── backgroundMonitoring.ts
│   ├── credentials.ts
│   ├── filtering.ts
│   └── toast.ts
└── styles/             # CSS and styling
```

### Data Flow
1. **Initial Load**: App loads cached data from localStorage
2. **Background Sync**: Automatic sync with Codegen API
3. **Real-time Updates**: Polling for active agent runs
4. **User Actions**: Create, stop, message agent runs
5. **Cache Updates**: Local cache updated with API responses

### Error Handling
- **Network Errors**: Graceful degradation with cached data
- **Missing Endpoints**: Fallback to alternative approaches
- **Rate Limiting**: Automatic retry with exponential backoff
- **User Feedback**: Toast notifications for all operations

## 🔍 Troubleshooting

### Common Issues

#### "Request failed with status 404" for message/resume
This is expected - these endpoints are not yet implemented in the API. The app creates new agent runs as a workaround.

#### React infinite loop warnings
Fixed in the latest version by properly managing useEffect dependencies.

#### CORS errors
The app connects directly to the Codegen API. Ensure your API token is valid and has proper permissions.

#### Agent runs not appearing immediately
Check that:
1. Your API token is valid
2. Organization ID is correct
3. Network connection is stable
4. Browser console for any errors

### Debug Mode

Enable debug logging by adding to your `.env`:
```env
REACT_APP_DEBUG=true
```

This will show detailed API requests and cache operations in the browser console.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify API token and organization access
4. Create an issue with detailed error information

---

**Built with ❤️ for the Codegen community**

