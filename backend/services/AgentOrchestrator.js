/**
 * Agent Orchestrator Service
 * Coordinates communication and workflow between AI agents
 * Manages agent lifecycle and inter-agent communication
 */

const PMAgent = require('../agents/PMAgent');
const DatabaseSchemaBuildAgent = require('../agents/DatabaseSchemaBuildAgent');
const QADDLGenerationAgent = require('../agents/QADDLGenerationAgent');
const logger = require('../logger');

class AgentOrchestrator {
  constructor() {
    this.agents = {
      pm: new PMAgent(),
      schema: new DatabaseSchemaBuildAgent(),
      qa: new QADDLGenerationAgent()
    };
    
    this.workflows = new Map();
    this.activeWorkflows = new Map();
    this.workflowHistory = [];
    
    logger.info('AgentOrchestrator initialized with all agents');
  }

  /**
   * Start a new multi-agent workflow
   * @param {Object} workflowConfig - Workflow configuration
   * @returns {Promise<Object>} Workflow instance
   */
  async startWorkflow(workflowConfig) {
    try {
      const workflowId = this.generateWorkflowId();
      const workflow = {
        id: workflowId,
        config: workflowConfig,
        status: 'started',
        currentStep: 0,
        steps: [],
        results: {},
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Define workflow steps based on type
      workflow.steps = this.defineWorkflowSteps(workflowConfig.type, workflowConfig);
      
      this.activeWorkflows.set(workflowId, workflow);
      
      logger.info('AgentOrchestrator workflow started', { 
        workflowId, 
        type: workflowConfig.type,
        stepCount: workflow.steps.length 
      });
      
      return workflow;
    } catch (error) {
      logger.error('AgentOrchestrator workflow start failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute next step in workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Step execution result
   */
  async executeNextStep(workflowId) {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      if (workflow.currentStep >= workflow.steps.length) {
        workflow.status = 'completed';
        workflow.completedAt = new Date().toISOString();
        this.workflowHistory.push(workflow);
        this.activeWorkflows.delete(workflowId);
        
        logger.info('AgentOrchestrator workflow completed', { workflowId });
        return { status: 'completed', workflow };
      }

      const step = workflow.steps[workflow.currentStep];
      logger.info('AgentOrchestrator executing step', { 
        workflowId, 
        stepIndex: workflow.currentStep,
        stepType: step.type,
        agent: step.agent 
      });

      const stepResult = await this.executeStep(step, workflow);
      
      // Store step result
      workflow.results[step.id] = stepResult;
      workflow.currentStep++;
      workflow.lastUpdated = new Date().toISOString();
      
      logger.info('AgentOrchestrator step completed', { 
        workflowId, 
        stepId: step.id,
        success: stepResult.success 
      });
      
      return { status: 'step_completed', step: step, result: stepResult, workflow };
    } catch (error) {
      logger.error('AgentOrchestrator step execution failed', { 
        error: error.message, 
        workflowId 
      });
      
      // Mark workflow as failed
      const workflow = this.activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = 'failed';
        workflow.error = error.message;
        workflow.failedAt = new Date().toISOString();
      }
      
      throw error;
    }
  }

  /**
   * Execute complete workflow automatically
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Complete workflow results
   */
  async executeWorkflow(workflowId) {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      logger.info('AgentOrchestrator executing complete workflow', { workflowId });
      
      while (workflow.status === 'started' && workflow.currentStep < workflow.steps.length) {
        await this.executeNextStep(workflowId);
      }
      
      const finalWorkflow = this.activeWorkflows.get(workflowId) || 
                           this.workflowHistory.find(w => w.id === workflowId);
      
      logger.info('AgentOrchestrator workflow execution completed', { 
        workflowId, 
        status: finalWorkflow.status 
      });
      
      return finalWorkflow;
    } catch (error) {
      logger.error('AgentOrchestrator workflow execution failed', { 
        error: error.message, 
        workflowId 
      });
      throw error;
    }
  }

  /**
   * Execute individual workflow step
   * @param {Object} step - Step configuration
   * @param {Object} workflow - Workflow context
   * @returns {Promise<Object>} Step execution result
   */
  async executeStep(step, workflow) {
    const agent = this.agents[step.agent];
    if (!agent) {
      throw new Error(`Agent ${step.agent} not found`);
    }

    try {
      let result;
      const stepData = this.prepareStepData(step, workflow);
      
      switch (step.type) {
        case 'analyze_project':
          result = await agent.analyzeProject(stepData);
          break;
          
        case 'create_task_breakdown':
          result = await agent.createTaskBreakdown(stepData.projectId, stepData.scope);
          break;
          
        case 'coordinate_agents':
          result = await agent.coordinateAgents(stepData.projectId, stepData.phase);
          break;
          
        case 'design_schema':
          result = await agent.designSchema(stepData);
          break;
          
        case 'generate_ddl':
          result = await agent.generateDDL(stepData.schemaId, stepData.targetDatabase);
          break;
          
        case 'optimize_schema':
          result = await agent.optimizeSchema(stepData.schemaId, stepData.requirements);
          break;
          
        case 'validate_schema':
          result = await agent.validateSchema(stepData.schemaId);
          break;
          
        case 'generate_queries':
          result = await agent.generateQueries(stepData);
          break;
          
        case 'generate_ddl_statements':
          result = await agent.generateDDL(stepData);
          break;
          
        case 'create_test_suite':
          result = await agent.createTestSuite(stepData);
          break;
          
        case 'optimize_queries':
          result = await agent.optimizeQueries(stepData.queryId, stepData.goals);
          break;
          
        case 'validate_sql':
          result = await agent.validateSQL(stepData.sql, stepData.dialect);
          break;
          
        case 'generate_test_data':
          result = await agent.generateTestData(stepData);
          break;
          
        case 'execute_test_suite':
          result = await agent.executeTestSuite(stepData.suiteId, stepData.config);
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      return {
        success: true,
        result: result,
        executedAt: new Date().toISOString(),
        duration: Date.now() - Date.now() // Placeholder for actual timing
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Define workflow steps based on workflow type
   * @param {string} workflowType - Type of workflow
   * @param {Object} config - Workflow configuration
   * @returns {Array} Array of workflow steps
   */
  defineWorkflowSteps(workflowType, config) {
    switch (workflowType) {
      case 'full_database_project':
        return [
          {
            id: 'step_1_analyze',
            type: 'analyze_project',
            agent: 'pm',
            description: 'Analyze project requirements and create plan',
            dependencies: []
          },
          {
            id: 'step_2_breakdown',
            type: 'create_task_breakdown',
            agent: 'pm',
            description: 'Create detailed task breakdown structure',
            dependencies: ['step_1_analyze']
          },
          {
            id: 'step_3_coordinate',
            type: 'coordinate_agents',
            agent: 'pm',
            description: 'Coordinate agents for project execution',
            dependencies: ['step_2_breakdown']
          },
          {
            id: 'step_4_design_schema',
            type: 'design_schema',
            agent: 'schema',
            description: 'Design comprehensive database schema',
            dependencies: ['step_3_coordinate']
          },
          {
            id: 'step_5_generate_ddl',
            type: 'generate_ddl',
            agent: 'schema',
            description: 'Generate DDL statements for schema',
            dependencies: ['step_4_design_schema']
          },
          {
            id: 'step_6_validate_schema',
            type: 'validate_schema',
            agent: 'schema',
            description: 'Validate schema design and identify issues',
            dependencies: ['step_5_generate_ddl']
          },
          {
            id: 'step_7_generate_queries',
            type: 'generate_queries',
            agent: 'qa',
            description: 'Generate SQL queries for application',
            dependencies: ['step_6_validate_schema']
          },
          {
            id: 'step_8_create_tests',
            type: 'create_test_suite',
            agent: 'qa',
            description: 'Create comprehensive test suite',
            dependencies: ['step_7_generate_queries']
          },
          {
            id: 'step_9_generate_test_data',
            type: 'generate_test_data',
            agent: 'qa',
            description: 'Generate test data for validation',
            dependencies: ['step_8_create_tests']
          },
          {
            id: 'step_10_execute_tests',
            type: 'execute_test_suite',
            agent: 'qa',
            description: 'Execute test suite and generate report',
            dependencies: ['step_9_generate_test_data']
          }
        ];
        
      case 'schema_design_only':
        return [
          {
            id: 'step_1_design',
            type: 'design_schema',
            agent: 'schema',
            description: 'Design database schema',
            dependencies: []
          },
          {
            id: 'step_2_generate_ddl',
            type: 'generate_ddl',
            agent: 'schema',
            description: 'Generate DDL statements',
            dependencies: ['step_1_design']
          },
          {
            id: 'step_3_validate',
            type: 'validate_schema',
            agent: 'schema',
            description: 'Validate schema design',
            dependencies: ['step_2_generate_ddl']
          }
        ];
        
      case 'query_generation_only':
        return [
          {
            id: 'step_1_generate',
            type: 'generate_queries',
            agent: 'qa',
            description: 'Generate SQL queries',
            dependencies: []
          },
          {
            id: 'step_2_optimize',
            type: 'optimize_queries',
            agent: 'qa',
            description: 'Optimize generated queries',
            dependencies: ['step_1_generate']
          },
          {
            id: 'step_3_validate',
            type: 'validate_sql',
            agent: 'qa',
            description: 'Validate SQL syntax and logic',
            dependencies: ['step_2_optimize']
          }
        ];
        
      case 'testing_only':
        return [
          {
            id: 'step_1_create_suite',
            type: 'create_test_suite',
            agent: 'qa',
            description: 'Create test suite',
            dependencies: []
          },
          {
            id: 'step_2_generate_data',
            type: 'generate_test_data',
            agent: 'qa',
            description: 'Generate test data',
            dependencies: ['step_1_create_suite']
          },
          {
            id: 'step_3_execute',
            type: 'execute_test_suite',
            agent: 'qa',
            description: 'Execute test suite',
            dependencies: ['step_2_generate_data']
          }
        ];
        
      default:
        throw new Error(`Unknown workflow type: ${workflowType}`);
    }
  }

  /**
   * Prepare step data with context from previous steps
   * @param {Object} step - Current step
   * @param {Object} workflow - Workflow context
   * @returns {Object} Prepared step data
   */
  prepareStepData(step, workflow) {
    let stepData = { ...workflow.config.data };
    
    // Add results from dependent steps
    step.dependencies.forEach(depId => {
      if (workflow.results[depId] && workflow.results[depId].success) {
        const depResult = workflow.results[depId].result;
        
        // Map common result fields
        if (depResult.projectId) stepData.projectId = depResult.projectId;
        if (depResult.schemaId) stepData.schemaId = depResult.schemaId;
        if (depResult.queryId) stepData.queryId = depResult.queryId;
        if (depResult.suiteId) stepData.suiteId = depResult.suiteId;
        
        // Add full result for complex dependencies
        stepData[`${depId}_result`] = depResult;
      }
    });
    
    return stepData;
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Object|null} Workflow status
   */
  getWorkflowStatus(workflowId) {
    const active = this.activeWorkflows.get(workflowId);
    if (active) return active;
    
    return this.workflowHistory.find(w => w.id === workflowId) || null;
  }

  /**
   * Get all active workflows
   * @returns {Array} List of active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get workflow history
   * @returns {Array} List of completed workflows
   */
  getWorkflowHistory() {
    return [...this.workflowHistory];
  }

  /**
   * Cancel active workflow
   * @param {string} workflowId - Workflow ID
   * @returns {boolean} Success status
   */
  cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return false;
    }
    
    workflow.status = 'cancelled';
    workflow.cancelledAt = new Date().toISOString();
    
    this.workflowHistory.push(workflow);
    this.activeWorkflows.delete(workflowId);
    
    logger.info('AgentOrchestrator workflow cancelled', { workflowId });
    return true;
  }

  /**
   * Get agent statistics
   * @returns {Object} Agent statistics
   */
  getAgentStats() {
    return {
      pm: this.agents.pm.getStats(),
      schema: this.agents.schema.getStats(),
      qa: this.agents.qa.getStats()
    };
  }

  /**
   * Get orchestrator statistics
   * @returns {Object} Orchestrator statistics
   */
  getOrchestratorStats() {
    return {
      activeWorkflows: this.activeWorkflows.size,
      completedWorkflows: this.workflowHistory.filter(w => w.status === 'completed').length,
      failedWorkflows: this.workflowHistory.filter(w => w.status === 'failed').length,
      cancelledWorkflows: this.workflowHistory.filter(w => w.status === 'cancelled').length,
      totalWorkflows: this.workflowHistory.length + this.activeWorkflows.size,
      agents: this.getAgentStats()
    };
  }

  /**
   * Generate unique workflow ID
   * @returns {string} Workflow ID
   */
  generateWorkflowId() {
    return `WF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = AgentOrchestrator;

