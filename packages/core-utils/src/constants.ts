/**
 * Application constants and configuration values
 */

// API Configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 10000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Status Constants
export const STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const AGENT_RUN_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  VALIDATING: 'validating',
  DEPLOYING: 'deploying',
} as const;

export const VALIDATION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
} as const;

// Response Types
export const RESPONSE_TYPES = {
  SIMPLE: 'simple',
  PLAN: 'plan',
  PR: 'pr',
} as const;

// Integration Types
export const INTEGRATION_TYPES = {
  CODEGEN_API: 'codegen_api',
  GITHUB: 'github',
  GRAINCHAIN: 'grainchain',
  GRAPH_SITTER: 'graph_sitter',
  WEB_EVAL_AGENT: 'web_eval_agent',
  DOCKER: 'docker',
  KUBERNETES: 'kubernetes',
  SLACK: 'slack',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom',
} as const;

// Workflow Step Types
export const WORKFLOW_STEP_TYPES = {
  CODEGEN_REQUEST: 'codegen_request',
  CODE_ANALYSIS: 'code_analysis',
  BUILD_VALIDATION: 'build_validation',
  TEST_EXECUTION: 'test_execution',
  DEPLOYMENT: 'deployment',
  WEB_EVALUATION: 'web_evaluation',
  PR_CREATION: 'pr_creation',
  PR_MERGE: 'pr_merge',
  NOTIFICATION: 'notification',
  CUSTOM: 'custom',
} as const;

// Validation Stage Types
export const VALIDATION_STAGE_TYPES = {
  CODE_ANALYSIS: 'code_analysis',
  SYNTAX_CHECK: 'syntax_check',
  TYPE_CHECK: 'type_check',
  LINT_CHECK: 'lint_check',
  SECURITY_SCAN: 'security_scan',
  DEPENDENCY_CHECK: 'dependency_check',
  BUILD_TEST: 'build_test',
  UNIT_TEST: 'unit_test',
  INTEGRATION_TEST: 'integration_test',
  E2E_TEST: 'e2e_test',
  PERFORMANCE_TEST: 'performance_test',
  ACCESSIBILITY_TEST: 'accessibility_test',
  VISUAL_REGRESSION_TEST: 'visual_regression_test',
  DEPLOYMENT_TEST: 'deployment_test',
  SMOKE_TEST: 'smoke_test',
  CUSTOM: 'custom',
} as const;

// Error Codes
export const ERROR_CODES = {
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // API
  API_ERROR: 'API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Workflow
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  STEP_EXECUTION_ERROR: 'STEP_EXECUTION_ERROR',
  WORKFLOW_TIMEOUT: 'WORKFLOW_TIMEOUT',
  
  // Integration
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  INTEGRATION_UNAVAILABLE: 'INTEGRATION_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BUILD_FAILED: 'BUILD_FAILED',
  TEST_FAILED: 'TEST_FAILED',
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'codegenapp_auth_token',
  REFRESH_TOKEN: 'codegenapp_refresh_token',
  USER_INFO: 'codegenapp_user_info',
  SELECTED_PROJECT: 'codegenapp_selected_project',
  PROJECT_CACHE: 'codegenapp_project_cache',
  AGENT_RUN_CACHE: 'codegenapp_agent_run_cache',
  PREFERENCES: 'codegenapp_preferences',
  THEME: 'codegenapp_theme',
} as const;

// Event Types
export const EVENT_TYPES = {
  // Workflow Events
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',
  WORKFLOW_STEP_STARTED: 'workflow.step.started',
  WORKFLOW_STEP_COMPLETED: 'workflow.step.completed',
  WORKFLOW_STEP_FAILED: 'workflow.step.failed',
  
  // Agent Run Events
  AGENT_RUN_CREATED: 'agent_run.created',
  AGENT_RUN_UPDATED: 'agent_run.updated',
  AGENT_RUN_COMPLETED: 'agent_run.completed',
  AGENT_RUN_FAILED: 'agent_run.failed',
  
  // Validation Events
  VALIDATION_STARTED: 'validation.started',
  VALIDATION_COMPLETED: 'validation.completed',
  VALIDATION_FAILED: 'validation.failed',
  VALIDATION_STAGE_STARTED: 'validation.stage.started',
  VALIDATION_STAGE_COMPLETED: 'validation.stage.completed',
  
  // Integration Events
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
  INTEGRATION_ERROR: 'integration.error',
  
  // Plugin Events
  PLUGIN_INSTALLED: 'plugin.installed',
  PLUGIN_ACTIVATED: 'plugin.activated',
  PLUGIN_DEACTIVATED: 'plugin.deactivated',
  
  // Configuration Events
  CONFIGURATION_CHANGED: 'configuration.changed',
  
  // Sandbox Events
  SANDBOX_CREATED: 'sandbox.created',
  SANDBOX_DESTROYED: 'sandbox.destroyed',
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  GITHUB_REPO: /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
  SEMANTIC_VERSION: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// File Extensions
export const FILE_EXTENSIONS = {
  TYPESCRIPT: ['.ts', '.tsx'],
  JAVASCRIPT: ['.js', '.jsx'],
  PYTHON: ['.py'],
  JAVA: ['.java'],
  GO: ['.go'],
  RUST: ['.rs'],
  C_CPP: ['.c', '.cpp', '.cc', '.cxx'],
  CSHARP: ['.cs'],
  PHP: ['.php'],
  RUBY: ['.rb'],
  SWIFT: ['.swift'],
  KOTLIN: ['.kt'],
  SCALA: ['.scala'],
  CLOJURE: ['.clj'],
  HASKELL: ['.hs'],
  ERLANG: ['.erl'],
  ELIXIR: ['.ex'],
  LUA: ['.lua'],
  PERL: ['.pl'],
  R: ['.r'],
  MATLAB: ['.m'],
  SHELL: ['.sh', '.bash', '.zsh'],
  POWERSHELL: ['.ps1'],
  DOCKERFILE: ['Dockerfile'],
  YAML: ['.yml', '.yaml'],
  JSON: ['.json'],
  XML: ['.xml'],
  HTML: ['.html', '.htm'],
  CSS: ['.css'],
  SCSS: ['.scss'],
  LESS: ['.less'],
  MARKDOWN: ['.md', '.markdown'],
  TEXT: ['.txt'],
} as const;

// MIME Types
export const MIME_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  HTML: 'text/html',
  CSS: 'text/css',
  JAVASCRIPT: 'application/javascript',
  TEXT: 'text/plain',
  PDF: 'application/pdf',
  ZIP: 'application/zip',
  TAR: 'application/x-tar',
  GZIP: 'application/gzip',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  WEBP: 'image/webp',
  MP4: 'video/mp4',
  WEBM: 'video/webm',
  MP3: 'audio/mpeg',
  WAV: 'audio/wav',
  OGG: 'audio/ogg',
} as const;

// Time Constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// Size Constants
export const SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Log Levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Severity Levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

