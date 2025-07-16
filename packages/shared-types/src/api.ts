/**
 * API-specific types for CodegenApp platform
 */

import { ApiResponse, PaginationParams, User, Organization, Project } from './common';

// Agent Run Types
export interface AgentRun {
  id: string;
  projectId: string;
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  requirements: string;
  status: AgentRunStatus;
  response?: AgentRunResponse;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata: Record<string, any>;
}

export type AgentRunStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'
  | 'validating'
  | 'deploying';

export interface AgentRunResponse {
  type: 'simple' | 'plan' | 'pr';
  content: string;
  data?: {
    planSteps?: PlanStep[];
    prUrl?: string;
    prNumber?: number;
    repository?: string;
    branch?: string;
  };
  metadata?: Record<string, any>;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedDuration?: number;
  actualDuration?: number;
  dependencies?: string[];
}

// API Request/Response Types
export interface CreateAgentRunRequest {
  projectId: string;
  requirements: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAgentRunRequest {
  status?: AgentRunStatus;
  response?: AgentRunResponse;
  metadata?: Record<string, any>;
}

export interface ListAgentRunsRequest extends PaginationParams {
  projectId?: string;
  organizationId?: string;
  status?: AgentRunStatus;
  userId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Authentication Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Organization API Types
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface ListOrganizationsRequest extends PaginationParams {
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Project API Types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  organizationId: string;
  repositoryUrl?: string;
  branch?: string;
  settings?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  branch?: string;
  settings?: Record<string, any>;
  status?: 'active' | 'inactive' | 'archived';
}

export interface ListProjectsRequest extends PaginationParams {
  organizationId?: string;
  search?: string;
  status?: 'active' | 'inactive' | 'archived';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Validation Types
export interface ValidationResult {
  id: string;
  agentRunId: string;
  type: 'build' | 'test' | 'deployment' | 'web_eval';
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: {
    success: boolean;
    message?: string;
    details?: Record<string, any>;
    logs?: string[];
    screenshots?: string[];
  };
  startedAt?: string;
  completedAt?: string;
}

// GitHub Integration Types
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  language?: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  htmlUrl: string;
  headBranch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

