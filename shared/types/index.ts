// Shared TypeScript types for the entire application

export interface Project {
  id: string;
  name: string;
  repository: string;
  branch: string;
  webhookUrl?: string;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  repositoryRules?: string;
  setupCommands?: string[];
  secrets?: Record<string, string>;
  autoMerge: boolean;
  autoConfirmPlan: boolean;
  planningStatement?: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  targetText: string;
  status: AgentRunStatus;
  type: AgentRunType;
  response?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  logs: AgentRunLog[];
}

export enum AgentRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum AgentRunType {
  REGULAR = 'regular',
  PLAN = 'plan',
  PR = 'pr'
}

export interface AgentRunLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export interface ValidationPipeline {
  id: string;
  projectId: string;
  prNumber: number;
  status: ValidationStatus;
  steps: ValidationStep[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ValidationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ValidationStep {
  id: string;
  name: string;
  status: ValidationStatus;
  startTime?: Date;
  endTime?: Date;
  logs: string[];
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  branches: string[];
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  error?: string;
}
