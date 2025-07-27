/**
 * Workflow Orchestrator
 * Manages the complete CI/CD workflow from requirements to completion
 */

import { CodegenApiService } from './CodegenApiService.js';
import { WebEvalAgentService } from './WebEvalAgentService.js';
import { CloudflareService } from './CloudflareService.js';
import { GitHubService } from './GitHubService.js';
import { GrainchainService } from './GrainchainService.js';
import { AgentRun } from '../models/AgentRun.js';
import { Project } from '../models/Project.js';

export class WorkflowOrchestrator {
  constructor() {
    this.codegenService = new CodegenApiService();
    this.webEvalService = new WebEvalAgentService();
    this.cloudflareService = new CloudflareService();
    this.githubService = new GitHubService();
    this.grainchainService = new GrainchainService();
    
    this.activeWorkflows = new Map();
    this.maxIterations = 5; // Prevent infinite loops
  }

  /**
   * Start complete autonomous workflow
   * @param {Object} params - Workflow parameters
   * @param {string} params.projectId - Project ID
   * @param {string} params.requirements - User requirements
   * @param {Object} params.context - Additional context
   * @returns {Promise<Object>} Workflow execution result
   */
  async startAutonomousWorkflow({ projectId, requirements, context = {} }) {
    const workflowId = `workflow-${projectId}-${Date.now()}`;
    
    try {
      console.log(`🚀 Starting autonomous workflow: ${workflowId}`);
      console.log(`📋 Requirements: ${requirements}`);

      // Initialize workflow state
      const workflowState = {
        workflow_id: workflowId,
        project_id: projectId,
        requirements: requirements,
        context: context,
        status: 'running',
        current_phase: 'initialization',
        phases: [],
        iterations: 0,
        max_iterations: this.maxIterations,
        started_at: new Date().toISOString(),
        completed_at: null,
        final_result: null
      };

      this.activeWorkflows.set(workflowId, workflowState);

      // Execute workflow phases
      const result = await this.executeWorkflowPhases(workflowState);

      // Mark workflow as completed
      workflowState.status = result.success ? 'completed' : 'failed';
      workflowState.completed_at = new Date().toISOString();
      workflowState.final_result = result;

      console.log(`✅ Autonomous workflow completed: ${workflowId} - ${workflowState.status}`);
      return result;

    } catch (error) {
      console.error('❌ Workflow orchestration error:', error.message);
      
      // Update workflow state on error
      if (this.activeWorkflows.has(workflowId)) {
        const workflowState = this.activeWorkflows.get(workflowId);
        workflowState.status = 'failed';
        workflowState.completed_at = new Date().toISOString();
        workflowState.error = error.message;
      }

      throw new Error(`Autonomous workflow failed: ${error.message}`);
    } finally {
      // Cleanup workflow from active list after delay
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Execute all workflow phases
   */
  async executeWorkflowPhases(workflowState) {
    let currentIteration = 0;
    let requirementsMet = false;

    while (currentIteration < this.maxIterations && !requirementsMet) {
      currentIteration++;
      workflowState.iterations = currentIteration;

      console.log(`🔄 Starting workflow iteration ${currentIteration}/${this.maxIterations}`);

      try {
        // Phase 1: Plan Creation
        const planResult = await this.executePlanCreationPhase(workflowState);
        workflowState.phases.push(planResult);

        if (!planResult.success) {
          throw new Error(`Plan creation failed: ${planResult.error}`);
        }

        // Phase 2: PR Creation
        const prResult = await this.executePRCreationPhase(workflowState, planResult);
        workflowState.phases.push(prResult);

        if (!prResult.success) {
          throw new Error(`PR creation failed: ${prResult.error}`);
        }

        // Phase 3: Build/Deployment Validation
        const buildResult = await this.executeBuildValidationPhase(workflowState, prResult);
        workflowState.phases.push(buildResult);

        if (!buildResult.success) {
          throw new Error(`Build validation failed: ${buildResult.error}`);
        }

        // Phase 4: UI Validation (if applicable)
        const uiResult = await this.executeUIValidationPhase(workflowState, buildResult);
        workflowState.phases.push(uiResult);

        // Phase 5: Merge to Main
        const mergeResult = await this.executeMergePhase(workflowState, uiResult);
        workflowState.phases.push(mergeResult);

        if (!mergeResult.success) {
          throw new Error(`Merge failed: ${mergeResult.error}`);
        }

        // Phase 6: Requirements Comparison
        const comparisonResult = await this.executeRequirementsComparison(workflowState);
        workflowState.phases.push(comparisonResult);

        // Check if requirements are met
        requirementsMet = comparisonResult.requirements_met;

        if (requirementsMet) {
          console.log(`🎉 Requirements satisfied after ${currentIteration} iterations`);
          break;
        } else {
          console.log(`🔄 Requirements not fully met, continuing iteration ${currentIteration + 1}`);
          
          // Prepare context for next iteration
          workflowState.context.previous_iteration = {
            iteration: currentIteration,
            phases: workflowState.phases.slice(-6), // Last 6 phases
            gaps: comparisonResult.gaps,
            recommendations: comparisonResult.recommendations
          };
        }

      } catch (error) {
        console.error(`❌ Workflow iteration ${currentIteration} failed:`, error.message);
        
        // Add failed phase
        workflowState.phases.push({
          phase: 'iteration_error',
          iteration: currentIteration,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Decide whether to continue or fail
        if (currentIteration >= this.maxIterations) {
          throw new Error(`Workflow failed after ${this.maxIterations} iterations: ${error.message}`);
        }

        // Continue to next iteration with error context
        workflowState.context.last_error = error.message;
      }
    }

    // Final result
    return {
      success: requirementsMet,
      workflow_id: workflowState.workflow_id,
      iterations_completed: currentIteration,
      requirements_met: requirementsMet,
      phases_executed: workflowState.phases.length,
      total_duration_ms: Date.now() - new Date(workflowState.started_at).getTime(),
      final_status: requirementsMet ? 'requirements_satisfied' : 'max_iterations_reached',
      phases: workflowState.phases
    };
  }

  /**
   * Phase 1: Plan Creation
   */
  async executePlanCreationPhase(workflowState) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'plan_creation';

    try {
      console.log(`📋 Executing Phase 1: Plan Creation`);

      // Create agent run for planning
      const agentRunResult = await this.codegenService.createAgentRun({
        projectId: workflowState.project_id,
        prompt: this.generatePlanningPrompt(workflowState),
        context: {
          ...workflowState.context,
          phase: 'planning',
          iteration: workflowState.iterations
        }
      });

      // Monitor agent run progress (simplified for demo)
      await this.waitForAgentRunCompletion(agentRunResult.local_agent_run_id);

      return {
        phase: 'plan_creation',
        iteration: workflowState.iterations,
        success: true,
        agent_run_id: agentRunResult.local_agent_run_id,
        codegen_run_id: agentRunResult.codegen_run_id,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: {
          planning_completed: true,
          agent_status: 'completed'
        }
      };

    } catch (error) {
      console.error('❌ Plan creation phase failed:', error.message);
      return {
        phase: 'plan_creation',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 2: PR Creation
   */
  async executePRCreationPhase(workflowState, planResult) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'pr_creation';

    try {
      console.log(`🔀 Executing Phase 2: PR Creation`);

      // Simulate PR creation (in real implementation, would extract from agent run result)
      const prData = {
        owner: 'Zeeeepa',
        repo: 'codegenApp',
        title: `Implement: ${workflowState.requirements.substring(0, 50)}...`,
        body: `Automated implementation of requirements:\n\n${workflowState.requirements}\n\nGenerated by Codegen Workflow Orchestrator`,
        head: `feature/workflow-${workflowState.workflow_id}`,
        base: 'main'
      };

      // Send PR notification via Cloudflare
      if (this.cloudflareService.isConfigured()) {
        await this.cloudflareService.sendPRNotification({
          prUrl: `https://github.com/${prData.owner}/${prData.repo}/pull/123`, // Mock PR URL
          status: 'created',
          projectId: workflowState.project_id,
          metadata: {
            workflow_id: workflowState.workflow_id,
            iteration: workflowState.iterations
          }
        });
      }

      return {
        phase: 'pr_creation',
        iteration: workflowState.iterations,
        success: true,
        pr_url: `https://github.com/${prData.owner}/${prData.repo}/pull/123`,
        pr_number: 123,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: {
          pr_created: true,
          notification_sent: this.cloudflareService.isConfigured()
        }
      };

    } catch (error) {
      console.error('❌ PR creation phase failed:', error.message);
      return {
        phase: 'pr_creation',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 3: Build/Deployment Validation
   */
  async executeBuildValidationPhase(workflowState, prResult) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'build_validation';

    try {
      console.log(`🏗️ Executing Phase 3: Build/Deployment Validation`);

      // Run Grainchain validation
      const validationResult = await this.grainchainService.validateBuildDeployment({
        projectId: workflowState.project_id,
        prUrl: prResult.pr_url,
        branch: `feature/workflow-${workflowState.workflow_id}`,
        buildConfig: workflowState.context.buildConfig || {}
      });

      return {
        phase: 'build_validation',
        iteration: workflowState.iterations,
        success: validationResult.overall_status === 'success',
        validation_id: validationResult.validation_id,
        validation_results: validationResult,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: {
          steps_completed: validationResult.steps.length,
          all_steps_passed: validationResult.steps.every(step => step.status === 'success')
        }
      };

    } catch (error) {
      console.error('❌ Build validation phase failed:', error.message);
      return {
        phase: 'build_validation',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 4: UI Validation
   */
  async executeUIValidationPhase(workflowState, buildResult) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'ui_validation';

    try {
      console.log(`🌐 Executing Phase 4: UI Validation`);

      // Skip UI validation if not applicable
      if (!this.shouldRunUIValidation(workflowState)) {
        return {
          phase: 'ui_validation',
          iteration: workflowState.iterations,
          success: true,
          skipped: true,
          reason: 'UI validation not applicable for this project type',
          duration_ms: Date.now() - phaseStart,
          timestamp: new Date().toISOString()
        };
      }

      // Run Web-Eval-Agent validation
      const uiValidationResult = await this.webEvalService.validateUI({
        url: `http://localhost:3000`, // Mock deployment URL
        elements: ['button', 'form', 'nav', 'main'],
        projectId: workflowState.project_id
      });

      const uiPassed = uiValidationResult.results.validation_status === 'pass';

      return {
        phase: 'ui_validation',
        iteration: workflowState.iterations,
        success: uiPassed,
        validation_results: uiValidationResult,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: {
          overall_score: uiValidationResult.results.overall_score,
          issues_found: uiValidationResult.results.issues?.length || 0,
          recommendations: uiValidationResult.results.recommendations?.length || 0
        }
      };

    } catch (error) {
      console.error('❌ UI validation phase failed:', error.message);
      return {
        phase: 'ui_validation',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 5: Merge to Main
   */
  async executeMergePhase(workflowState, uiResult) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'merge';

    try {
      console.log(`🔀 Executing Phase 5: Merge to Main`);

      // Check if all validations passed
      const allValidationsPassed = this.allValidationsPassed(workflowState);

      if (!allValidationsPassed) {
        return {
          phase: 'merge',
          iteration: workflowState.iterations,
          success: false,
          error: 'Cannot merge: validation failures detected',
          duration_ms: Date.now() - phaseStart,
          timestamp: new Date().toISOString(),
          details: {
            merge_blocked: true,
            reason: 'validation_failures'
          }
        };
      }

      // Simulate merge (in real implementation, would use GitHub API)
      console.log(`✅ All validations passed, proceeding with merge`);

      return {
        phase: 'merge',
        iteration: workflowState.iterations,
        success: true,
        merge_sha: `sha-${Date.now()}`,
        merged_at: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: {
          merge_method: 'squash',
          validations_passed: true
        }
      };

    } catch (error) {
      console.error('❌ Merge phase failed:', error.message);
      return {
        phase: 'merge',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Phase 6: Requirements Comparison
   */
  async executeRequirementsComparison(workflowState) {
    const phaseStart = Date.now();
    workflowState.current_phase = 'requirements_comparison';

    try {
      console.log(`🔍 Executing Phase 6: Requirements Comparison`);

      // Use AI to compare final result vs initial requirements
      const comparisonPrompt = this.generateComparisonPrompt(workflowState);
      
      // Simulate AI comparison (in real implementation, would use Codegen API)
      const comparisonResult = await this.performRequirementsComparison(
        workflowState.requirements,
        workflowState.phases
      );

      return {
        phase: 'requirements_comparison',
        iteration: workflowState.iterations,
        success: true,
        requirements_met: comparisonResult.requirements_met,
        completion_percentage: comparisonResult.completion_percentage,
        gaps: comparisonResult.gaps,
        recommendations: comparisonResult.recommendations,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString(),
        details: comparisonResult.details
      };

    } catch (error) {
      console.error('❌ Requirements comparison phase failed:', error.message);
      return {
        phase: 'requirements_comparison',
        iteration: workflowState.iterations,
        success: false,
        error: error.message,
        requirements_met: false,
        duration_ms: Date.now() - phaseStart,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate planning prompt for Codegen
   */
  generatePlanningPrompt(workflowState) {
    let prompt = `Please implement the following requirements:\n\n${workflowState.requirements}\n\n`;

    if (workflowState.iterations > 1) {
      prompt += `This is iteration ${workflowState.iterations}. Previous attempts had the following gaps:\n`;
      if (workflowState.context.previous_iteration) {
        prompt += `- ${workflowState.context.previous_iteration.gaps?.join('\n- ') || 'No specific gaps identified'}\n\n`;
        prompt += `Please address these gaps in your implementation.\n\n`;
      }
    }

    prompt += `Please create a comprehensive implementation that fully satisfies all requirements.`;

    return prompt;
  }

  /**
   * Generate comparison prompt for requirements analysis
   */
  generateComparisonPrompt(workflowState) {
    return `
Compare the implemented solution against the original requirements:

Original Requirements:
${workflowState.requirements}

Implementation Summary:
- Plan created and executed
- PR created and merged
- Build validation: ${this.getPhaseStatus(workflowState, 'build_validation')}
- UI validation: ${this.getPhaseStatus(workflowState, 'ui_validation')}
- Merge completed: ${this.getPhaseStatus(workflowState, 'merge')}

Please analyze if the requirements are fully satisfied and provide:
1. Completion percentage (0-100)
2. Any gaps or missing functionality
3. Recommendations for improvement
4. Whether requirements are fully met (true/false)
`;
  }

  /**
   * Perform AI-powered requirements comparison
   */
  async performRequirementsComparison(requirements, phases) {
    // Simulate AI analysis (in real implementation, would use advanced AI)
    const successfulPhases = phases.filter(phase => phase.success).length;
    const totalPhases = phases.length;
    const completionPercentage = Math.round((successfulPhases / totalPhases) * 100);

    // Simple heuristic for requirements satisfaction
    const requirementsMet = completionPercentage >= 80 && 
                           this.hasSuccessfulPhase(phases, 'merge') &&
                           this.hasSuccessfulPhase(phases, 'build_validation');

    const gaps = [];
    const recommendations = [];

    if (!this.hasSuccessfulPhase(phases, 'build_validation')) {
      gaps.push('Build validation failed');
      recommendations.push('Fix build issues and ensure all tests pass');
    }

    if (!this.hasSuccessfulPhase(phases, 'ui_validation')) {
      gaps.push('UI validation issues detected');
      recommendations.push('Address UI/UX issues and accessibility concerns');
    }

    if (!this.hasSuccessfulPhase(phases, 'merge')) {
      gaps.push('Merge to main branch failed');
      recommendations.push('Resolve merge conflicts and validation failures');
    }

    return {
      requirements_met: requirementsMet,
      completion_percentage: completionPercentage,
      gaps,
      recommendations,
      details: {
        successful_phases: successfulPhases,
        total_phases: totalPhases,
        analysis_method: 'heuristic'
      }
    };
  }

  /**
   * Helper methods
   */
  async waitForAgentRunCompletion(agentRunId) {
    // Simulate waiting for agent run completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { status: 'completed' };
  }

  shouldRunUIValidation(workflowState) {
    // Simple heuristic - run UI validation if requirements mention UI/frontend
    const requirements = workflowState.requirements.toLowerCase();
    return requirements.includes('ui') || 
           requirements.includes('frontend') || 
           requirements.includes('interface') ||
           requirements.includes('web');
  }

  allValidationsPassed(workflowState) {
    const currentPhases = workflowState.phases.filter(p => p.iteration === workflowState.iterations);
    const buildValidation = currentPhases.find(p => p.phase === 'build_validation');
    const uiValidation = currentPhases.find(p => p.phase === 'ui_validation');

    return buildValidation?.success && (uiValidation?.success || uiValidation?.skipped);
  }

  getPhaseStatus(workflowState, phaseName) {
    const phase = workflowState.phases.find(p => p.phase === phaseName && p.iteration === workflowState.iterations);
    return phase ? (phase.success ? 'success' : 'failed') : 'not_run';
  }

  hasSuccessfulPhase(phases, phaseName) {
    return phases.some(phase => phase.phase === phaseName && phase.success);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return {
      workflow_id: workflowId,
      status: workflow.status,
      current_phase: workflow.current_phase,
      iterations: workflow.iterations,
      max_iterations: workflow.max_iterations,
      phases_completed: workflow.phases.length,
      started_at: workflow.started_at,
      completed_at: workflow.completed_at,
      duration_ms: workflow.completed_at 
        ? new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()
        : Date.now() - new Date(workflow.started_at).getTime()
    };
  }

  /**
   * List active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({
      workflow_id: workflow.workflow_id,
      project_id: workflow.project_id,
      status: workflow.status,
      current_phase: workflow.current_phase,
      iterations: workflow.iterations,
      started_at: workflow.started_at
    }));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'WorkflowOrchestrator',
      active_workflows: this.activeWorkflows.size,
      max_iterations: this.maxIterations,
      services: {
        codegen: this.codegenService.isConfigured(),
        web_eval: this.webEvalService.isConfigured(),
        cloudflare: this.cloudflareService.isConfigured(),
        github: this.githubService.isConfigured(),
        grainchain: this.grainchainService.isConfigured()
      }
    };
  }
}
