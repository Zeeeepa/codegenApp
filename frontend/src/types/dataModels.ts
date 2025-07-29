/**
 * Data Models - TypeScript interfaces for all application data structures
 */

// Project-related types
export interface Project {
  id: string;
  name: string;
  fullName: string; // owner/repo format
  description?: string;
  url: string;
  defaultBranch: string;
  language?: string;
  topics: string[];
  private: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Dashboard-specific properties
  pinned: boolean;
  pinnedAt?: string;
  webhookConfigured: boolean;
  webhookUrl?: string;
  
  // Configuration
  settings: ProjectSettings;
  
  // Status
  status: 'active' | 'inactive' | 'error';
  lastActivity?: string;
}

export interface ProjectSettings {
  // Repository rules
  repositoryRules?: string;
  
  // Setup commands
  setupCommands: string[];
  selectedBranch: string;
  
  // Secrets
  secrets: Record<string, string>;
  
  // Agent configuration
  planningStatement?: string;
  autoConfirmPlan: boolean;
  autoMergeValidatedPR: boolean;
  
  // Validation settings
  validationEnabled: boolean;
  validationTimeout: number; // in minutes
  
  // Notification preferences
  notifications: {
    prCreated: boolean;
    prUpdated: boolean;
    validationComplete: boolean;
    validationFailed: boolean;
  };
}

// Agent Run types
export interface AgentRun {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'initial' | 'resume' | 'plan_confirm' | 'plan_modify';
  
  // Request data
  prompt: string;
  targetGoal: string;
  planningStatement?: string;
  projectContext: string;
  
  // Response data
  response?: AgentResponse;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  // Logs and errors
  logs: string[];
  errors: string[];
  
  // Related entities
  planId?: string;
  prNumber?: number;
  validationId?: string;
}

export interface AgentResponse {
  type: 'regular' | 'plan' | 'pr';
  content: string;
  
  // Plan-specific data
  plan?: {
    id: string;
    title: string;
    description: string;
    steps: PlanStep[];
    status: 'pending' | 'confirmed' | 'rejected' | 'executing' | 'completed';
    estimatedTime?: string;
  };
  
  // PR-specific data
  pr?: {
    number: number;
    url: string;
    title: string;
    branch: string;
    status: 'open' | 'closed' | 'merged';
    validationStatus?: 'pending' | 'running' | 'passed' | 'failed';
  };
  
  // Action suggestions
  suggestedActions: string[];
  canContinue: boolean;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  confidenceLevel: number;
  dependencies: string[];
  estimatedTime?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

// Validation types
export interface ValidationRun {
  id: string;
  projectId: string;
  agentRunId?: string;
  prNumber?: number;
  
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stage: 'snapshot' | 'clone' | 'setup' | 'analysis' | 'testing' | 'complete';
  
  // Configuration
  config: {
    repository: string;
    branch: string;
    setupCommands: string[];
    secrets: Record<string, string>;
  };
  
  // Results
  results: {
    snapshot?: {
      success: boolean;
      snapshotId?: string;
      environment: Record<string, boolean>;
      error?: string;
    };
    clone?: {
      success: boolean;
      repositoryPath?: string;
      commitSha?: string;
      error?: string;
    };
    setup?: {
      success: boolean;
      commands: Array<{
        command: string;
        success: boolean;
        output: string;
        error?: string;
        duration: number;
      }>;
      error?: string;
    };
    analysis?: {
      success: boolean;
      codeQuality: number;
      complexity: number;
      issues: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        file: string;
        line?: number;
      }>;
      geminiValidation: {
        deploymentSuccess: boolean;
        feedback: string;
        suggestions: string[];
      };
      error?: string;
    };
    testing?: {
      success: boolean;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      testResults: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        error?: string;
        screenshots?: string[];
      }>;
      error?: string;
    };
  };
  
  // Timing
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  
  // Logs and errors
  logs: string[];
  errors: Array<{
    stage: string;
    type: string;
    message: string;
    timestamp: string;
    recoverable: boolean;
  }>;
  
  // Retry information
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
}

// Notification types
export interface Notification {
  id: string;
  type: 'webhook' | 'agent_run' | 'validation' | 'system';
  subtype: string; // 'pr_created', 'pr_updated', 'validation_complete', etc.
  
  // Content
  title: string;
  message: string;
  description?: string;
  url?: string;
  
  // Metadata
  projectId?: string;
  agentRunId?: string;
  validationId?: string;
  prNumber?: number;
  
  // Status
  read: boolean;
  archived: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Timing
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  
  // Actions
  actions?: Array<{
    id: string;
    label: string;
    type: 'button' | 'link';
    action: string;
    url?: string;
    primary?: boolean;
  }>;
}

// Settings types
export interface AppSettings {
  // API Configuration
  apis: {
    codegen: {
      orgId: string;
      apiToken: string;
      baseUrl?: string;
    };
    github: {
      token: string;
      baseUrl?: string;
    };
    cloudflare: {
      apiKey: string;
      accountId: string;
      workerName: string;
      workerUrl: string;
    };
    gemini: {
      apiKey: string;
    };
  };
  
  // UI Preferences
  ui: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    showNotifications: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // in seconds
  };
  
  // Default Project Settings
  defaultProjectSettings: Partial<ProjectSettings>;
  
  // Validation Settings
  validation: {
    enabled: boolean;
    timeout: number; // in minutes
    maxRetries: number;
    autoRetryOnFailure: boolean;
  };
  
  // Notification Settings
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email?: string;
    webhookUrl?: string;
  };
  
  // Advanced Settings
  advanced: {
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    maxLogEntries: number;
    enableAnalytics: boolean;
  };
}

// Dashboard types
export interface DashboardState {
  // Projects
  projects: Project[];
  selectedProjectId?: string;
  
  // Agent Runs
  agentRuns: AgentRun[];
  activeAgentRuns: AgentRun[];
  
  // Validations
  validationRuns: ValidationRun[];
  activeValidations: ValidationRun[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // UI State
  ui: {
    loading: boolean;
    error?: string;
    lastUpdated?: string;
    
    // Modal states
    showCreateRunDialog: boolean;
    showProjectSettings: boolean;
    showAppSettings: boolean;
    showNotifications: boolean;
    
    // Selected items
    selectedAgentRunId?: string;
    selectedValidationId?: string;
    selectedNotificationId?: string;
  };
  
  // Filters and search
  filters: {
    projectStatus: 'all' | 'active' | 'inactive' | 'error';
    agentRunStatus: 'all' | 'running' | 'completed' | 'failed';
    validationStatus: 'all' | 'running' | 'success' | 'failed';
    timeRange: 'today' | 'week' | 'month' | 'all';
    searchQuery: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Webhook payload types
export interface WebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
  pull_request?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
      avatar_url: string;
    };
    created_at: string;
    updated_at: string;
  };
  sender: {
    login: string;
    avatar_url: string;
  };
}

// Export utility types
export type ProjectStatus = Project['status'];
export type AgentRunStatus = AgentRun['status'];
export type ValidationStatus = ValidationRun['status'];
export type NotificationType = Notification['type'];
export type NotificationPriority = Notification['priority'];

// Export default interfaces for common use
export type {
  Project as IProject,
  AgentRun as IAgentRun,
  ValidationRun as IValidationRun,
  Notification as INotification,
  AppSettings as IAppSettings,
  DashboardState as IDashboardState,
};

