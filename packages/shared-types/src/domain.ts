/**
 * Domain-specific types for CodegenApp business logic
 */

import { Status, User, Organization, Project } from './common';
import { AgentRun, ValidationResult } from './api';

// Code Analysis Types
export interface CodeAnalysisResult {
  id: string;
  projectId: string;
  analysisType: CodeAnalysisType;
  status: Status;
  result: {
    summary: CodeAnalysisSummary;
    files: AnalyzedFile[];
    dependencies: DependencyAnalysis;
    metrics: CodeMetrics;
    issues: CodeIssue[];
    suggestions: CodeSuggestion[];
  };
  createdAt: string;
  completedAt?: string;
}

export type CodeAnalysisType = 
  | 'full_project'
  | 'incremental'
  | 'pr_diff'
  | 'security_scan'
  | 'performance_analysis';

export interface CodeAnalysisSummary {
  totalFiles: number;
  totalLines: number;
  languages: LanguageStats[];
  complexity: ComplexityMetrics;
  testCoverage?: number;
  securityScore?: number;
}

export interface LanguageStats {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  maintainabilityIndex: number;
}

export interface AnalyzedFile {
  path: string;
  language: string;
  lines: number;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  complexity: number;
  issues: CodeIssue[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: ParameterInfo[];
  returnType?: string;
  complexity: number;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  isExported: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type';
  isDefault: boolean;
}

export interface DependencyAnalysis {
  direct: DependencyInfo[];
  transitive: DependencyInfo[];
  vulnerabilities: VulnerabilityInfo[];
  outdated: OutdatedDependencyInfo[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
  license?: string;
  size?: number;
}

export interface VulnerabilityInfo {
  dependency: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  patchedVersions?: string;
  recommendation: string;
}

export interface OutdatedDependencyInfo {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'major' | 'minor' | 'patch';
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: TechnicalDebtMetrics;
  testMetrics?: TestMetrics;
}

export interface TechnicalDebtMetrics {
  totalMinutes: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  issues: number;
  codeSmells: number;
  duplicatedLines: number;
}

export interface TestMetrics {
  coverage: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

export interface CodeIssue {
  id: string;
  type: CodeIssueType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  file: string;
  line: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export type CodeIssueType = 
  | 'syntax_error'
  | 'type_error'
  | 'lint_warning'
  | 'security_vulnerability'
  | 'performance_issue'
  | 'code_smell'
  | 'duplication'
  | 'complexity';

export interface CodeSuggestion {
  id: string;
  type: 'refactor' | 'optimization' | 'best_practice' | 'security';
  title: string;
  description: string;
  file: string;
  line?: number;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  example?: string;
}

// Web Evaluation Types
export interface WebEvaluationResult {
  id: string;
  agentRunId: string;
  url: string;
  status: Status;
  result: {
    accessibility: AccessibilityResult;
    performance: PerformanceResult;
    functionality: FunctionalityResult;
    visual: VisualResult;
    security: SecurityResult;
  };
  screenshots: Screenshot[];
  logs: EvaluationLog[];
  createdAt: string;
  completedAt?: string;
}

export interface AccessibilityResult {
  score: number;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface PerformanceResult {
  score: number;
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    totalBlockingTime: number;
  };
  opportunities: PerformanceOpportunity[];
}

export interface PerformanceOpportunity {
  id: string;
  title: string;
  description: string;
  score: number;
  numericValue: number;
  displayValue: string;
}

export interface FunctionalityResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: FunctionalTest[];
}

export interface FunctionalTest {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  steps: TestStep[];
}

export interface TestStep {
  action: string;
  target?: string;
  value?: string;
  status: 'passed' | 'failed';
  screenshot?: string;
  error?: string;
}

export interface VisualResult {
  screenshots: Screenshot[];
  comparisons?: VisualComparison[];
  issues: VisualIssue[];
}

export interface Screenshot {
  id: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  timestamp: string;
  type: 'full_page' | 'viewport' | 'element';
  element?: string;
}

export interface VisualComparison {
  baseline: string;
  current: string;
  diff?: string;
  similarity: number;
  threshold: number;
  passed: boolean;
}

export interface VisualIssue {
  type: 'layout_shift' | 'missing_element' | 'broken_image' | 'styling_issue';
  description: string;
  element?: string;
  screenshot?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityResult {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  headers: SecurityHeader[];
  certificates: CertificateInfo[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  cwe?: string;
}

export interface SecurityHeader {
  name: string;
  value?: string;
  status: 'present' | 'missing' | 'misconfigured';
  recommendation?: string;
}

export interface CertificateInfo {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  status: 'valid' | 'expired' | 'invalid';
}

export interface EvaluationLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

// Deployment Types
export interface DeploymentResult {
  id: string;
  agentRunId: string;
  environment: 'development' | 'staging' | 'production';
  status: Status;
  result: {
    buildLogs: string[];
    deploymentUrl?: string;
    healthChecks: HealthCheck[];
    rollbackInfo?: RollbackInfo;
  };
  startedAt: string;
  completedAt?: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  timestamp: string;
  responseTime?: number;
}

export interface RollbackInfo {
  previousVersion: string;
  rollbackUrl: string;
  rollbackReason: string;
  rollbackTimestamp: string;
}

