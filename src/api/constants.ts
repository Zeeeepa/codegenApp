// API Constants - All endpoints in one place for easy maintenance

export const API_ENDPOINTS = {
  // User endpoints
  USER_ME: "/v1/users/me",
  
  // Organization endpoints
  ORGANIZATIONS: "/v1/organizations",
  ORGANIZATIONS_PAGINATED: (page: number, size: number) => `/v1/organizations?page=${page}&size=${size}`,
  
  // User management endpoints
  ORG_USERS: (organizationId: number, page: number, size: number) => 
    `/v1/organizations/${organizationId}/users?page=${page}&size=${size}`,
  ORG_USER: (organizationId: number, userId: number) => 
    `/v1/organizations/${organizationId}/users/${userId}`,
  
  // Agent Run endpoints - VALIDATED ✅ 2025-06-21
  AGENT_RUN_CREATE: (organizationId: number) => 
    `/v1/organizations/${organizationId}/agent/run`, // ✅ WORKING (200)
  AGENT_RUN_LIST: (organizationId: number) => 
    `/v1/organizations/${organizationId}/agent/runs`, // ✅ WORKING (200)
  
  // ❌ THESE ENDPOINTS DO NOT EXIST - ALL RETURN 404
  // Based on API testing, the following endpoints are NOT available:
  // - Individual agent run details (GET /agent/run/{id})
  // - Resume functionality (POST /agent/run/{id}/resume)
  // - Continue functionality (POST /agent/run/{id}/continue) 
  // - Stop functionality (POST /agent/run/{id}/stop)
  // - Respond/message functionality (POST /agent/run/{id}/respond)
  // 
  // The Codegen API appears to only support:
  // 1. Creating new agent runs
  // 2. Listing existing agent runs
  // 3. Interaction via web interface at web_url
} as const;

// API Base URL - uses environment variable with fallback to production API
export const DEFAULT_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://api.codegen.com";
