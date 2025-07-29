// Core Types for CodegenApp Dashboard

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  updated_at: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface ProjectCard {
  id: string;
  repository: GitHubRepository;
  webhookUrl?: string;
  webhookActive: boolean;
  settings: ProjectSettings;
  agentRuns: AgentRun[];
  notifications: ProjectNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  repositoryRules: string;
  setupCommands: string;
  selectedBranch: string;
  secrets: Record<string, string>;
  planningStatement: string;
  autoConfirmPlan: boolean;
  autoMergeValidatedPR: boolean;
}

export interface AgentRun {
  id: string;
  projectId: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: 'regular' | 'plan' | 'pr';
  response?: string;
  createdAt: string;
  updatedAt: string;
  logs: AgentRunLog[];
}

export interface AgentRunLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface ProjectNotification {
  id: string;
  type: 'pr_created' | 'pr_updated' | 'webhook_error' | 'validation_complete';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface ValidationFlow {
  id: string;
  projectId: string;
  prNumber: number;
  status: 'pending' | 'cloning' | 'deploying' | 'validating' | 'testing' | 'completed' | 'failed';
  steps: ValidationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface CodegenApiResponse {
  id: string;
  status: string;
  type: 'regular' | 'plan' | 'pr';
  content: string;
  metadata?: {
    prNumber?: number;
    prUrl?: string;
  };
}

export interface WebhookPayload {
  action: string;
  repository: GitHubRepository;
  pull_request?: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    merged: boolean;
  };
}

export interface AppState {
  projects: ProjectCard[];
  selectedProject: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

export interface SecretsFormData {
  envVarName: string;
  value: string;
}

export interface SetupCommandsFormData {
  commands: string;
  selectedBranch: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Hook Types
export interface UseGitHubReturn {
  repositories: GitHubRepository[];
  branches: GitHubBranch[];
  isLoading: boolean;
  error: string | null;
  fetchRepositories: () => Promise<void>;
  fetchBranches: (repoName: string) => Promise<void>;
  setupWebhook: (repoName: string, webhookUrl: string) => Promise<boolean>;
}

export interface UseAgentRunReturn {
  createAgentRun: (projectId: string, target: string) => Promise<string>;
  getAgentRunStatus: (runId: string) => Promise<AgentRun>;
  continueAgentRun: (runId: string, message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Component Props Types
export interface ProjectCardProps {
  project: ProjectCard;
  onUpdate: (project: ProjectCard) => void;
  onDelete: (projectId: string) => void;
}

export interface ProjectSelectorProps {
  onProjectSelect: (repository: GitHubRepository) => void;
  selectedProjects: string[];
}

export interface AgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (target: string) => void;
  isLoading: boolean;
}

export interface ProjectSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectCard;
  onSave: (settings: ProjectSettings) => void;
}
