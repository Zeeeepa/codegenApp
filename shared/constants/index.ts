// Shared constants for the entire application

export const API_ENDPOINTS = {
  PROJECTS: '/api/v1/projects',
  AGENT_RUNS: '/api/v1/agent-runs',
  VALIDATIONS: '/api/v1/validations',
  WEBHOOKS: '/api/v1/webhooks',
  HEALTH: '/api/v1/health'
} as const;

export const WEBSOCKET_EVENTS = {
  // Agent Run Events
  AGENT_RUN_STARTED: 'agent_run_started',
  AGENT_RUN_PROGRESS: 'agent_run_progress',
  AGENT_RUN_COMPLETED: 'agent_run_completed',
  AGENT_RUN_FAILED: 'agent_run_failed',
  
  // Validation Events
  VALIDATION_STARTED: 'validation_started',
  VALIDATION_PROGRESS: 'validation_progress',
  VALIDATION_COMPLETED: 'validation_completed',
  VALIDATION_FAILED: 'validation_failed',
  
  // Project Events
  PROJECT_UPDATED: 'project_updated',
  PROJECT_WEBHOOK_RECEIVED: 'project_webhook_received',
  
  // System Events
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_LOST: 'connection_lost',
  ERROR: 'error'
} as const;

export const VALIDATION_STEPS = {
  SNAPSHOT_CREATION: 'snapshot_creation',
  CODEBASE_CLONE: 'codebase_clone',
  DEPLOYMENT: 'deployment',
  HEALTH_CHECK: 'health_check',
  WEB_EVALUATION: 'web_evaluation',
  CLEANUP: 'cleanup'
} as const;

export const SERVICE_NAMES = {
  CODEGEN: 'codegen',
  GITHUB: 'github',
  GRAINCHAIN: 'grainchain',
  WEB_EVAL_AGENT: 'web_eval_agent',
  GRAPH_SITTER: 'graph_sitter',
  CLOUDFLARE: 'cloudflare'
} as const;

export const DEFAULT_SETTINGS = {
  AUTO_MERGE: false,
  AUTO_CONFIRM_PLAN: false,
  MAX_RETRIES: 3,
  TIMEOUT_MINUTES: 30,
  PLANNING_STATEMENT: 'You are an expert software engineer. Please analyze the project context and implement the requested changes following best practices.'
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const GITHUB_EVENTS = {
  PULL_REQUEST: 'pull_request',
  PUSH: 'push',
  ISSUE: 'issues'
} as const;
