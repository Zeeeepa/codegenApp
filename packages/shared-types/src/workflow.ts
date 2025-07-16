/**
 * Workflow and orchestration types for CodegenApp platform
 */

import { Status, BaseEvent } from './common';

// Workflow Definition Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  configuration: WorkflowConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  conditions?: WorkflowCondition[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  onSuccess?: WorkflowAction[];
  onFailure?: WorkflowAction[];
}

export type WorkflowStepType = 
  | 'codegen_request'
  | 'code_analysis'
  | 'build_validation'
  | 'test_execution'
  | 'deployment'
  | 'web_evaluation'
  | 'pr_creation'
  | 'pr_merge'
  | 'notification'
  | 'custom';

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'webhook' | 'schedule' | 'event';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowConfiguration {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  retryPolicy: RetryPolicy;
  notifications: NotificationConfiguration;
  variables: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  retryableErrors?: string[];
}

export interface WorkflowAction {
  type: 'notification' | 'webhook' | 'state_update' | 'variable_set';
  configuration: Record<string, any>;
}

export interface NotificationConfiguration {
  channels: NotificationChannel[];
  events: NotificationEvent[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface NotificationEvent {
  event: 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'step_failed';
  channels: string[];
}

// Workflow Execution Types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  trigger: WorkflowExecutionTrigger;
  context: WorkflowExecutionContext;
  steps: WorkflowStepExecution[];
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  metadata: Record<string, any>;
}

export type WorkflowExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface WorkflowExecutionTrigger {
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface WorkflowExecutionContext {
  userId: string;
  organizationId: string;
  projectId?: string;
  agentRunId?: string;
  variables: Record<string, any>;
  environment: 'development' | 'staging' | 'production';
}

export interface WorkflowStepExecution {
  id: string;
  stepId: string;
  status: WorkflowStepExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  attempts: number;
  logs: WorkflowStepLog[];
}

export type WorkflowStepExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying';

export interface WorkflowStepLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

// Workflow Events
export interface WorkflowEvent extends BaseEvent {
  workflowId: string;
  executionId: string;
  stepId?: string;
}

export interface WorkflowStartedEvent extends WorkflowEvent {
  type: 'workflow.started';
  data: {
    trigger: WorkflowExecutionTrigger;
    context: WorkflowExecutionContext;
  };
}

export interface WorkflowCompletedEvent extends WorkflowEvent {
  type: 'workflow.completed';
  data: {
    status: WorkflowExecutionStatus;
    duration: number;
    result?: Record<string, any>;
  };
}

export interface WorkflowStepStartedEvent extends WorkflowEvent {
  type: 'workflow.step.started';
  data: {
    stepName: string;
    stepType: WorkflowStepType;
    input: Record<string, any>;
  };
}

export interface WorkflowStepCompletedEvent extends WorkflowEvent {
  type: 'workflow.step.completed';
  data: {
    stepName: string;
    status: WorkflowStepExecutionStatus;
    output?: Record<string, any>;
    duration: number;
  };
}

// Service Orchestration Types
export interface ServiceAdapter {
  id: string;
  name: string;
  type: string;
  version: string;
  configuration: Record<string, any>;
  capabilities: string[];
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
}

export interface ServiceAction {
  id: string;
  adapterId: string;
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  timeout: number;
  retryable: boolean;
}

export interface ServiceExecutionRequest {
  actionId: string;
  input: Record<string, any>;
  context: WorkflowExecutionContext;
  timeout?: number;
}

export interface ServiceExecutionResponse {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

