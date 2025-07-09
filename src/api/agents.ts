/**
 * AI Agents API Client
 * TypeScript client for interacting with AI agents
 */

import { apiRequest } from './client';

// Types for AI Agents
export interface AgentStats {
  agentName: string;
  totalConversations: number;
  totalDuration: number;
  avgDuration: number;
  model: string;
  lastActivity: string | null;
}

export interface ProjectRequirements {
  name: string;
  description: string;
  objectives: string[];
  constraints?: string[];
  timeline?: string;
  budget?: string;
  stakeholders?: string[];
  technicalRequirements?: any;
}

export interface SchemaRequirements {
  projectName: string;
  description: string;
  entities: any[];
  relationships?: any[];
  constraints?: any[];
  performanceRequirements?: any;
  complianceRequirements?: any;
}

export interface QueryRequirements {
  description: string;
  tables: string[];
  operations: string[];
  filters?: any[];
  joins?: any[];
  aggregations?: any[];
  outputFormat?: string;
}

export interface WorkflowConfig {
  type: 'full_database_project' | 'schema_design_only' | 'query_generation_only' | 'testing_only';
  data: any;
  description?: string;
}

export interface WorkflowStatus {
  id: string;
  config: WorkflowConfig;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  steps: any[];
  results: any;
  startedAt: string;
  lastUpdated: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  error?: string;
}

// PMAgent API
export class PMAgentAPI {
  static async analyzeProject(requirements: ProjectRequirements) {
    return apiRequest('/api/pm-agent/analyze-project', {
      method: 'POST',
      body: JSON.stringify({ requirements }),
    });
  }

  static async createTaskBreakdown(projectId: string, scope: any) {
    return apiRequest('/api/pm-agent/create-task-breakdown', {
      method: 'POST',
      body: JSON.stringify({ projectId, scope }),
    });
  }

  static async coordinateAgents(projectId: string, phase: string) {
    return apiRequest('/api/pm-agent/coordinate-agents', {
      method: 'POST',
      body: JSON.stringify({ projectId, phase }),
    });
  }

  static async getProjectStatus(projectId: string) {
    return apiRequest(`/api/pm-agent/project-status/${projectId}`);
  }

  static async handleProjectChanges(projectId: string, changes: any) {
    return apiRequest('/api/pm-agent/handle-changes', {
      method: 'POST',
      body: JSON.stringify({ projectId, changes }),
    });
  }

  static async getProjects() {
    return apiRequest('/api/pm-agent/projects');
  }

  static async getProject(projectId: string) {
    return apiRequest(`/api/pm-agent/projects/${projectId}`);
  }

  static async getStats(): Promise<AgentStats> {
    return apiRequest('/api/pm-agent/stats');
  }

  static async clearHistory() {
    return apiRequest('/api/pm-agent/clear-history', {
      method: 'POST',
    });
  }
}

// SchemaAgent API
export class SchemaAgentAPI {
  static async designSchema(requirements: SchemaRequirements) {
    return apiRequest('/api/schema-agent/design-schema', {
      method: 'POST',
      body: JSON.stringify({ requirements }),
    });
  }

  static async generateDDL(schemaId: string, targetDatabase: string = 'postgresql') {
    return apiRequest('/api/schema-agent/generate-ddl', {
      method: 'POST',
      body: JSON.stringify({ schemaId, targetDatabase }),
    });
  }

  static async optimizeSchema(schemaId: string, performanceRequirements: any) {
    return apiRequest('/api/schema-agent/optimize-schema', {
      method: 'POST',
      body: JSON.stringify({ schemaId, performanceRequirements }),
    });
  }

  static async validateSchema(schemaId: string) {
    return apiRequest('/api/schema-agent/validate-schema', {
      method: 'POST',
      body: JSON.stringify({ schemaId }),
    });
  }

  static async generateMigration(fromSchemaId: string, toSchemaId: string) {
    return apiRequest('/api/schema-agent/generate-migration', {
      method: 'POST',
      body: JSON.stringify({ fromSchemaId, toSchemaId }),
    });
  }

  static async getSchemas() {
    return apiRequest('/api/schema-agent/schemas');
  }

  static async getSchema(schemaId: string) {
    return apiRequest(`/api/schema-agent/schemas/${schemaId}`);
  }

  static async getSupportedDatabases() {
    return apiRequest('/api/schema-agent/supported-databases');
  }

  static async getStats(): Promise<AgentStats> {
    return apiRequest('/api/schema-agent/stats');
  }

  static async clearHistory() {
    return apiRequest('/api/schema-agent/clear-history', {
      method: 'POST',
    });
  }
}

// QAAgent API
export class QAAgentAPI {
  static async generateQueries(requirements: QueryRequirements) {
    return apiRequest('/api/qa-agent/generate-queries', {
      method: 'POST',
      body: JSON.stringify({ requirements }),
    });
  }

  static async generateDDL(ddlRequirements: any) {
    return apiRequest('/api/qa-agent/generate-ddl', {
      method: 'POST',
      body: JSON.stringify({ ddlRequirements }),
    });
  }

  static async createTestSuite(testRequirements: any) {
    return apiRequest('/api/qa-agent/create-test-suite', {
      method: 'POST',
      body: JSON.stringify({ testRequirements }),
    });
  }

  static async optimizeQueries(queryId: string, optimizationGoals: any) {
    return apiRequest('/api/qa-agent/optimize-queries', {
      method: 'POST',
      body: JSON.stringify({ queryId, optimizationGoals }),
    });
  }

  static async validateSQL(sql: string, dialect: string = 'postgresql') {
    return apiRequest('/api/qa-agent/validate-sql', {
      method: 'POST',
      body: JSON.stringify({ sql, dialect }),
    });
  }

  static async generateTestData(dataRequirements: any) {
    return apiRequest('/api/qa-agent/generate-test-data', {
      method: 'POST',
      body: JSON.stringify({ dataRequirements }),
    });
  }

  static async executeTestSuite(suiteId: string, executionConfig: any = {}) {
    return apiRequest('/api/qa-agent/execute-test-suite', {
      method: 'POST',
      body: JSON.stringify({ suiteId, executionConfig }),
    });
  }

  static async getQueries() {
    return apiRequest('/api/qa-agent/queries');
  }

  static async getQuery(queryId: string) {
    return apiRequest(`/api/qa-agent/queries/${queryId}`);
  }

  static async getTestSuites() {
    return apiRequest('/api/qa-agent/test-suites');
  }

  static async getTestSuite(suiteId: string) {
    return apiRequest(`/api/qa-agent/test-suites/${suiteId}`);
  }

  static async getSupportedDialects() {
    return apiRequest('/api/qa-agent/supported-dialects');
  }

  static async getStats(): Promise<AgentStats> {
    return apiRequest('/api/qa-agent/stats');
  }

  static async clearHistory() {
    return apiRequest('/api/qa-agent/clear-history', {
      method: 'POST',
    });
  }
}

// Orchestrator API
export class OrchestratorAPI {
  static async startWorkflow(workflowConfig: WorkflowConfig): Promise<WorkflowStatus> {
    return apiRequest('/api/orchestrator/start-workflow', {
      method: 'POST',
      body: JSON.stringify({ workflowConfig }),
    });
  }

  static async executeNextStep(workflowId: string) {
    return apiRequest(`/api/orchestrator/execute-step/${workflowId}`, {
      method: 'POST',
    });
  }

  static async executeWorkflow(workflowId: string): Promise<WorkflowStatus> {
    return apiRequest(`/api/orchestrator/execute-workflow/${workflowId}`, {
      method: 'POST',
    });
  }

  static async runWorkflow(workflowConfig: WorkflowConfig): Promise<WorkflowStatus> {
    return apiRequest('/api/orchestrator/run-workflow', {
      method: 'POST',
      body: JSON.stringify({ workflowConfig }),
    });
  }

  static async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    return apiRequest(`/api/orchestrator/workflow-status/${workflowId}`);
  }

  static async getActiveWorkflows(): Promise<WorkflowStatus[]> {
    return apiRequest('/api/orchestrator/active-workflows');
  }

  static async getWorkflowHistory(): Promise<WorkflowStatus[]> {
    return apiRequest('/api/orchestrator/workflow-history');
  }

  static async cancelWorkflow(workflowId: string) {
    return apiRequest(`/api/orchestrator/cancel-workflow/${workflowId}`, {
      method: 'POST',
    });
  }

  static async getAgentStats() {
    return apiRequest('/api/orchestrator/agent-stats');
  }

  static async getOrchestratorStats() {
    return apiRequest('/api/orchestrator/stats');
  }

  static async getWorkflowTypes() {
    return apiRequest('/api/orchestrator/workflow-types');
  }
}

// General Agents API
export class AgentsAPI {
  static async getStatus() {
    return apiRequest('/api/agents/status');
  }

  static async getAllStats() {
    const [pmStats, schemaStats, qaStats, orchestratorStats] = await Promise.all([
      PMAgentAPI.getStats(),
      SchemaAgentAPI.getStats(),
      QAAgentAPI.getStats(),
      OrchestratorAPI.getOrchestratorStats(),
    ]);

    return {
      pmAgent: pmStats,
      schemaAgent: schemaStats,
      qaAgent: qaStats,
      orchestrator: orchestratorStats,
    };
  }

  static async clearAllHistory() {
    await Promise.all([
      PMAgentAPI.clearHistory(),
      SchemaAgentAPI.clearHistory(),
      QAAgentAPI.clearHistory(),
    ]);
  }
}

// Export all APIs
export {
  PMAgentAPI,
  SchemaAgentAPI,
  QAAgentAPI,
  OrchestratorAPI,
  AgentsAPI,
};

