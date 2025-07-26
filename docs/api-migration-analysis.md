# Codegen API Migration Analysis

## Overview

This document analyzes the current custom Codegen API implementation and provides a detailed mapping to the official Codegen API endpoints. This analysis serves as the foundation for migrating from custom endpoints to the official API structure.

## Current Implementation Analysis

### Custom API Endpoints (Current)

The current `CodegenService` implementation uses custom endpoints that don't align with the official Codegen API:

#### 1. Agent Run Execution
- **Current Endpoint**: `POST /v1/agent/run`
- **Official Endpoint**: `POST /api/v1/agents/runs`
- **Documentation**: https://docs.codegen.com/api-reference/agents/create-agent-run

#### 2. Agent Run Continuation
- **Current Endpoint**: `POST /v1/agent/continue`
- **Official Endpoint**: `POST /api/v1/agents/runs/{id}/resume`
- **Documentation**: https://docs.codegen.com/api-reference/agents/resume-agent-run

#### 3. Agent Run Status
- **Current Endpoint**: `GET /v1/agent/run/{run_id}/status`
- **Official Endpoint**: `GET /api/v1/agents/runs/{id}`
- **Documentation**: https://docs.codegen.com/api-reference/agents/get-agent-run

#### 4. Agent Run Cancellation
- **Current Endpoint**: `POST /v1/agent/run/{run_id}/cancel`
- **Official Endpoint**: `POST /api/v1/agents/runs/{id}/cancel`
- **Documentation**: https://docs.codegen.com/api-reference/agents/cancel-agent-run

## Request/Response Format Comparison

### 1. Create Agent Run

#### Current Implementation
```python
# Current request format
payload = {
    "prompt": context_prompt,
    "project_context": {
        "project_id": project_id,
        "run_id": run_id
    },
    "settings": {
        "timeout": timeout,
        "max_tokens": 4000,
        "temperature": 0.7
    }
}
```

#### Official API Format
```python
# Official API request format
payload = {
    "message": context_prompt,
    "repository": {
        "owner": "owner_name",
        "name": "repo_name",
        "branch": "main"  # optional
    },
    "organization_id": org_id,
    "metadata": {
        "project_id": project_id,
        "run_id": run_id
    }
}
```

### 2. Resume Agent Run

#### Current Implementation
```python
# Current request format
payload = {
    "run_id": run_id,
    "continuation": continuation_text,
    "settings": {
        "timeout": timeout,
        "max_tokens": 4000,
        "temperature": 0.7
    }
}
```

#### Official API Format
```python
# Official API request format
payload = {
    "message": continuation_text
}
# Note: run_id is in the URL path, not body
```

## Authentication Comparison

### Current Implementation
```python
headers = {
    "Authorization": f"Bearer {self.api_key}",
    "Content-Type": "application/json",
    "X-Organization-ID": self.org_id,
    "X-User-ID": self.user_id or "",
    "X-Request-ID": run_id
}
```

### Official API Requirements
```python
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
# Organization ID is included in request body, not headers
```

## Environment Variables Mapping

### Current Variables
```bash
CODEGEN_API_URL=https://api.codegen.com
CODEGEN_API_KEY=your_api_key
CODEGEN_ORG_ID=your_org_id
CODEGEN_USER_ID=your_user_id
```

### Official API Requirements
```bash
CODEGEN_API_KEY=your_api_key_here
CODEGEN_ORG_ID=your_organization_id
CODEGEN_API_BASE_URL=https://api.codegen.com  # Optional, defaults to official URL
```

## Response Format Analysis

### Current Response Processing
The current implementation processes responses with custom logic:
- Extracts PR URLs using regex patterns
- Identifies plan content based on keywords
- Custom error handling

### Official API Response Format
The official API returns structured responses:
```json
{
  "id": "run_id",
  "status": "running|completed|failed|cancelled",
  "message": "Agent response content",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "metadata": {
    "repository": {...},
    "organization_id": "org_id"
  }
}
```

## Functionality Gaps

### Missing in Current Implementation
1. **Proper Error Handling**: Official API provides structured error responses
2. **Webhook Integration**: Official API supports webhooks for real-time updates
3. **Run Metadata**: Official API provides richer metadata about runs
4. **Status Polling**: Official API has better status management
5. **Rate Limiting**: Official API includes rate limiting headers

### Additional Features in Official API
1. **Repository Integration**: Direct GitHub repository integration
2. **Branch Specification**: Ability to specify target branch
3. **Webhook Events**: Real-time notifications for run status changes
4. **Enhanced Metadata**: Richer context and metadata support
5. **Better Error Context**: Structured error responses with actionable information

## Migration Strategy

### Phase 1: Parallel Implementation
- Implement new `CodegenServiceV2` alongside existing service
- Use feature flags to control which service is used
- Maintain backward compatibility

### Phase 2: Data Migration
- Migrate existing agent run data to new format
- Update database schema if needed
- Implement data transformation utilities

### Phase 3: Frontend Updates
- Update frontend to work with new API responses
- Enhance UI with new features from official API
- Implement webhook event handling

### Phase 4: Deprecation
- Remove old custom API implementation
- Clean up unused code and configurations
- Update documentation

## Risk Assessment

### High Risk
- **Breaking Changes**: API format differences may break existing functionality
- **Authentication Changes**: Different auth mechanism may cause access issues
- **Response Format**: Frontend may need significant updates

### Medium Risk
- **Performance Impact**: New API may have different performance characteristics
- **Rate Limiting**: Official API may have stricter rate limits
- **Feature Parity**: Some custom features may not have direct equivalents

### Low Risk
- **Configuration Changes**: Environment variable updates are straightforward
- **Documentation**: Well-documented official API reduces implementation risk

## Testing Strategy

### Unit Tests
- Test new service implementation with mock responses
- Verify request/response format transformations
- Test error handling scenarios

### Integration Tests
- Test against official API endpoints
- Verify webhook integration
- Test authentication and authorization

### End-to-End Tests
- Test complete CI/CD workflow with new API
- Verify frontend integration
- Test migration scenarios

## Timeline Estimate

- **Phase 1**: 2-3 days (Parallel implementation)
- **Phase 2**: 1-2 days (Data migration)
- **Phase 3**: 2-3 days (Frontend updates)
- **Phase 4**: 1 day (Cleanup and documentation)

**Total Estimated Time**: 6-9 days

## Next Steps

1. Implement new `CodegenServiceV2` with official API endpoints
2. Create feature flag system for gradual migration
3. Update environment configuration
4. Implement webhook integration
5. Update frontend components
6. Create comprehensive tests
7. Plan production migration

---

*This analysis was generated as part of the CodegenApp upgrade to official Codegen API integration.*
