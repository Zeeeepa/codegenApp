/**
 * Validation and testing types for CodegenApp platform
 */

import { Status, BaseEvent } from './common';

// Validation Pipeline Types
export interface ValidationPipeline {
  id: string;
  name: string;
  description?: string;
  agentRunId: string;
  projectId: string;
  stages: ValidationStage[];
  configuration: ValidationConfiguration;
  status: ValidationPipelineStatus;
  result?: ValidationPipelineResult;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export type ValidationPipelineStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

export interface ValidationStage {
  id: string;
  name: string;
  type: ValidationStageType;
  order: number;
  configuration: Record<string, any>;
  dependencies: string[];
  required: boolean;
  timeout: number;
  retryPolicy: StageRetryPolicy;
}

export type ValidationStageType = 
  | 'code_analysis'
  | 'syntax_check'
  | 'type_check'
  | 'lint_check'
  | 'security_scan'
  | 'dependency_check'
  | 'build_test'
  | 'unit_test'
  | 'integration_test'
  | 'e2e_test'
  | 'performance_test'
  | 'accessibility_test'
  | 'visual_regression_test'
  | 'deployment_test'
  | 'smoke_test'
  | 'custom';

export interface StageRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential';
  initialDelay: number;
  maxDelay: number;
}

export interface ValidationConfiguration {
  environment: ValidationEnvironment;
  parallelExecution: boolean;
  maxConcurrentStages: number;
  failFast: boolean;
  notifications: ValidationNotificationConfig;
  artifacts: ArtifactConfiguration;
}

export interface ValidationEnvironment {
  type: 'sandbox' | 'container' | 'vm' | 'cloud';
  configuration: Record<string, any>;
  resources: ResourceLimits;
  cleanup: CleanupPolicy;
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  disk: string;
  timeout: number;
}

export interface CleanupPolicy {
  onSuccess: 'keep' | 'delete';
  onFailure: 'keep' | 'delete';
  retentionDays: number;
}

export interface ValidationNotificationConfig {
  onStart: boolean;
  onComplete: boolean;
  onFailure: boolean;
  channels: string[];
}

export interface ArtifactConfiguration {
  collect: boolean;
  types: ArtifactType[];
  retention: ArtifactRetention;
}

export type ArtifactType = 
  | 'logs'
  | 'screenshots'
  | 'videos'
  | 'reports'
  | 'coverage'
  | 'metrics'
  | 'binaries';

export interface ArtifactRetention {
  days: number;
  maxSize: string;
  compression: boolean;
}

// Validation Results
export interface ValidationPipelineResult {
  status: ValidationPipelineStatus;
  summary: ValidationSummary;
  stages: ValidationStageResult[];
  artifacts: ValidationArtifact[];
  metrics: ValidationMetrics;
  recommendations: ValidationRecommendation[];
}

export interface ValidationSummary {
  totalStages: number;
  passedStages: number;
  failedStages: number;
  skippedStages: number;
  duration: number;
  successRate: number;
}

export interface ValidationStageResult {
  stageId: string;
  stageName: string;
  status: ValidationStageStatus;
  result: StageExecutionResult;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  attempts: number;
  artifacts: ValidationArtifact[];
}

export type ValidationStageStatus = 
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface StageExecutionResult {
  success: boolean;
  message?: string;
  details: Record<string, any>;
  logs: ValidationLog[];
  metrics?: Record<string, number>;
  issues?: ValidationIssue[];
}

export interface ValidationLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
  data?: Record<string, any>;
}

export interface ValidationIssue {
  id: string;
  type: ValidationIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
  fixable: boolean;
}

export type ValidationIssueType = 
  | 'syntax_error'
  | 'type_error'
  | 'lint_violation'
  | 'security_vulnerability'
  | 'performance_issue'
  | 'accessibility_violation'
  | 'test_failure'
  | 'build_error'
  | 'deployment_error';

export interface ValidationArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  checksum: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ValidationMetrics {
  duration: number;
  resourceUsage: ResourceUsage;
  testMetrics?: TestExecutionMetrics;
  codeMetrics?: CodeQualityMetrics;
  performanceMetrics?: PerformanceMetrics;
}

export interface ResourceUsage {
  cpu: {
    average: number;
    peak: number;
    unit: string;
  };
  memory: {
    average: number;
    peak: number;
    unit: string;
  };
  disk: {
    used: number;
    unit: string;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface TestExecutionMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: number;
  duration: number;
  coverage?: CoverageMetrics;
}

export interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  threshold: CoverageThreshold;
}

export interface CoverageThreshold {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface CodeQualityMetrics {
  complexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  duplicatedLines: number;
  codeSmells: number;
  bugs: number;
  vulnerabilities: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  resourceEfficiency: number;
}

export interface ValidationRecommendation {
  id: string;
  type: 'improvement' | 'fix' | 'optimization' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  category: string;
  relatedIssues: string[];
  actionItems: ActionItem[];
}

export interface ActionItem {
  description: string;
  type: 'manual' | 'automated';
  command?: string;
  file?: string;
  line?: number;
}

// Grainchain Integration Types
export interface GrainchainSandbox {
  id: string;
  name: string;
  type: 'docker' | 'vm' | 'kubernetes';
  status: SandboxStatus;
  configuration: SandboxConfiguration;
  resources: SandboxResources;
  network: SandboxNetwork;
  volumes: SandboxVolume[];
  environment: Record<string, string>;
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  lastActivity?: string;
}

export type SandboxStatus = 
  | 'creating'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'destroyed';

export interface SandboxConfiguration {
  image: string;
  tag: string;
  command?: string[];
  workingDirectory?: string;
  user?: string;
  privileged: boolean;
  readOnly: boolean;
  networkMode: string;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
}

export interface SandboxResources {
  cpuLimit: string;
  memoryLimit: string;
  diskLimit: string;
  networkLimit?: string;
  timeLimit: number;
}

export interface SandboxNetwork {
  mode: 'bridge' | 'host' | 'none' | 'custom';
  ports: PortMapping[];
  dns?: string[];
  hosts?: Record<string, string>;
}

export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol: 'tcp' | 'udp';
  expose: boolean;
}

export interface SandboxVolume {
  name: string;
  type: 'bind' | 'volume' | 'tmpfs';
  source: string;
  target: string;
  readOnly: boolean;
}

export interface SandboxExecution {
  id: string;
  sandboxId: string;
  command: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  status: ExecutionStatus;
  result?: ExecutionResult;
  startedAt: string;
  completedAt?: string;
  timeout: number;
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  resourceUsage: ResourceUsage;
}

// Validation Events
export interface ValidationEvent extends BaseEvent {
  pipelineId: string;
  stageId?: string;
}

export interface ValidationStartedEvent extends ValidationEvent {
  type: 'validation.started';
  data: {
    configuration: ValidationConfiguration;
    stages: ValidationStage[];
  };
}

export interface ValidationCompletedEvent extends ValidationEvent {
  type: 'validation.completed';
  data: {
    result: ValidationPipelineResult;
    duration: number;
  };
}

export interface ValidationStageStartedEvent extends ValidationEvent {
  type: 'validation.stage.started';
  data: {
    stageName: string;
    stageType: ValidationStageType;
    configuration: Record<string, any>;
  };
}

export interface ValidationStageCompletedEvent extends ValidationEvent {
  type: 'validation.stage.completed';
  data: {
    stageName: string;
    status: ValidationStageStatus;
    result: StageExecutionResult;
    duration: number;
  };
}

export interface SandboxCreatedEvent extends BaseEvent {
  type: 'sandbox.created';
  data: {
    sandboxId: string;
    configuration: SandboxConfiguration;
    resources: SandboxResources;
  };
}

export interface SandboxDestroyedEvent extends BaseEvent {
  type: 'sandbox.destroyed';
  data: {
    sandboxId: string;
    reason: string;
    duration: number;
  };
}

