/**
 * Webhook processor for handling GitHub events
 */

import { ValidationPipeline } from '../models/ValidationPipeline.js';
import { ValidationService } from './ValidationService.js';
import { Project } from '../models/Project.js';

export class WebhookProcessor {
  constructor() {
    this.validationService = new ValidationService();
  }

  async processWebhook(project, eventType, payload) {
    console.log(`🔄 Processing webhook: ${eventType} for project ${project.id}`);

    try {
      switch (eventType) {
        case 'pull_request':
          await this.handlePullRequest(project, payload);
          break;
        
        case 'push':
          await this.handlePush(project, payload);
          break;
        
        case 'pull_request_review':
          await this.handlePullRequestReview(project, payload);
          break;
        
        case 'check_run':
          await this.handleCheckRun(project, payload);
          break;
        
        default:
          console.log(`ℹ️ Ignoring webhook event: ${eventType}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to process webhook ${eventType}:`, error);
      throw error;
    }
  }

  async handlePullRequest(project, payload) {
    const { action, pull_request } = payload;
    
    console.log(`📋 PR ${action}: #${pull_request.number} - ${pull_request.title}`);

    switch (action) {
      case 'opened':
      case 'synchronize': // New commits pushed to PR
        await this.startValidationPipeline(project, pull_request);
        break;
      
      case 'closed':
        if (pull_request.merged) {
          await this.handlePRMerged(project, pull_request);
        } else {
          await this.handlePRClosed(project, pull_request);
        }
        break;
      
      case 'reopened':
        await this.startValidationPipeline(project, pull_request);
        break;
      
      default:
        console.log(`ℹ️ Ignoring PR action: ${action}`);
        break;
    }
  }

  async handlePush(project, payload) {
    const { ref, commits } = payload;
    
    // Only handle pushes to main/master branch
    if (ref === `refs/heads/${project.default_branch}`) {
      console.log(`📦 Push to ${project.default_branch}: ${commits.length} commits`);
      
      // Trigger any post-merge actions if needed
      await this.handleMainBranchUpdate(project, payload);
    }
  }

  async handlePullRequestReview(project, payload) {
    const { action, review, pull_request } = payload;
    
    if (action === 'submitted' && review.state === 'approved') {
      console.log(`✅ PR #${pull_request.number} approved by ${review.user.login}`);
      
      // Check if auto-merge is enabled and all checks pass
      if (project.auto_merge_enabled) {
        await this.checkAutoMerge(project, pull_request);
      }
    }
  }

  async handleCheckRun(project, payload) {
    const { action, check_run } = payload;
    
    if (action === 'completed') {
      console.log(`🔍 Check run completed: ${check_run.name} - ${check_run.conclusion}`);
      
      // Update validation pipeline if this is our check
      if (check_run.name.includes('CodegenApp Validation')) {
        await this.updateValidationFromCheck(project, check_run);
      }
    }
  }

  async startValidationPipeline(project, pullRequest) {
    try {
      console.log(`🚀 Starting validation pipeline for PR #${pullRequest.number}`);

      // Check if validation pipeline already exists
      const existingPipeline = await ValidationPipeline.findByPR(
        project.id, 
        pullRequest.number
      );

      if (existingPipeline && existingPipeline.status === 'running') {
        console.log(`ℹ️ Validation pipeline already running for PR #${pullRequest.number}`);
        return existingPipeline;
      }

      // Create new validation pipeline
      const pipelineData = {
        project_id: project.id,
        pull_request_id: pullRequest.number,
        pull_request_url: pullRequest.html_url,
        status: 'pending'
      };

      const pipeline = await ValidationPipeline.create(pipelineData);

      // Start the validation process
      await this.validationService.startValidation(pipeline, project, pullRequest);

      return pipeline;

    } catch (error) {
      console.error(`❌ Failed to start validation pipeline:`, error);
      throw error;
    }
  }

  async handlePRMerged(project, pullRequest) {
    console.log(`🎉 PR #${pullRequest.number} merged into ${project.default_branch}`);

    // Find and complete validation pipeline
    const pipeline = await ValidationPipeline.findByPR(project.id, pullRequest.number);
    if (pipeline) {
      await ValidationPipeline.update(pipeline.id, {
        status: 'completed',
        current_step: 'Merged to main branch'
      });
    }

    // Trigger any post-merge actions
    await this.handlePostMerge(project, pullRequest);
  }

  async handlePRClosed(project, pullRequest) {
    console.log(`❌ PR #${pullRequest.number} closed without merging`);

    // Find and cancel validation pipeline
    const pipeline = await ValidationPipeline.findByPR(project.id, pullRequest.number);
    if (pipeline && pipeline.status === 'running') {
      await ValidationPipeline.update(pipeline.id, {
        status: 'cancelled',
        current_step: 'PR closed'
      });

      // Clean up any running validation processes
      await this.validationService.cancelValidation(pipeline.id);
    }
  }

  async checkAutoMerge(project, pullRequest) {
    try {
      console.log(`🤖 Checking auto-merge conditions for PR #${pullRequest.number}`);

      // Get validation pipeline
      const pipeline = await ValidationPipeline.findByPR(project.id, pullRequest.number);
      
      if (!pipeline) {
        console.log(`ℹ️ No validation pipeline found for PR #${pullRequest.number}`);
        return;
      }

      // Check if validation is complete and successful
      if (pipeline.status !== 'completed') {
        console.log(`ℹ️ Validation not complete for PR #${pullRequest.number}: ${pipeline.status}`);
        return;
      }

      // Check validation results
      const validationResults = pipeline.validation_results ? 
        JSON.parse(pipeline.validation_results) : {};

      if (!validationResults.success) {
        console.log(`❌ Validation failed for PR #${pullRequest.number}`);
        return;
      }

      // All conditions met - proceed with auto-merge
      await this.performAutoMerge(project, pullRequest, pipeline);

    } catch (error) {
      console.error(`❌ Auto-merge check failed:`, error);
    }
  }

  async performAutoMerge(project, pullRequest, pipeline) {
    try {
      console.log(`🔄 Performing auto-merge for PR #${pullRequest.number}`);

      // Use GitHub API to merge the PR
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      const [owner, repo] = project.full_name.split('/');
      const mergeUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullRequest.number}/merge`;

      const response = await fetch(mergeUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commit_title: `Auto-merge: ${pullRequest.title}`,
          commit_message: `Automatically merged after successful validation.\n\nValidation Pipeline: ${pipeline.id}`,
          merge_method: 'squash' // or 'merge' or 'rebase'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message}`);
      }

      const mergeResult = await response.json();
      console.log(`✅ Auto-merged PR #${pullRequest.number}: ${mergeResult.sha}`);

      // Update pipeline with merge information
      await ValidationPipeline.update(pipeline.id, {
        current_step: 'Auto-merged successfully',
        validation_results: JSON.stringify({
          ...JSON.parse(pipeline.validation_results || '{}'),
          auto_merged: true,
          merge_sha: mergeResult.sha,
          merged_at: new Date().toISOString()
        })
      });

    } catch (error) {
      console.error(`❌ Auto-merge failed for PR #${pullRequest.number}:`, error);
      
      // Update pipeline with error
      await ValidationPipeline.update(pipeline.id, {
        error_message: `Auto-merge failed: ${error.message}`,
        current_step: 'Auto-merge failed'
      });
    }
  }

  async handleMainBranchUpdate(project, payload) {
    console.log(`📦 Main branch updated for project ${project.id}`);
    
    // Trigger any post-merge actions like:
    // - Deployment to production
    // - Cache invalidation
    // - Notification to team
    
    // For now, just log the event
    const commits = payload.commits || [];
    console.log(`📝 ${commits.length} new commits on ${project.default_branch}`);
  }

  async handlePostMerge(project, pullRequest) {
    console.log(`🎯 Post-merge actions for PR #${pullRequest.number}`);
    
    // Implement post-merge actions like:
    // - Cleanup validation environments
    // - Send notifications
    // - Update project metrics
    
    // Clean up validation pipeline resources
    const pipeline = await ValidationPipeline.findByPR(project.id, pullRequest.number);
    if (pipeline) {
      await this.validationService.cleanupValidation(pipeline.id);
    }
  }

  async updateValidationFromCheck(project, checkRun) {
    try {
      // Extract PR number from check run details
      const prNumber = this.extractPRNumberFromCheck(checkRun);
      if (!prNumber) return;

      const pipeline = await ValidationPipeline.findByPR(project.id, prNumber);
      if (!pipeline) return;

      // Update pipeline based on check run results
      const updates = {
        current_step: `Check: ${checkRun.name}`,
        progress_percentage: checkRun.conclusion === 'success' ? 100 : 
                           checkRun.conclusion === 'failure' ? 0 : 50
      };

      if (checkRun.conclusion === 'failure') {
        updates.error_message = checkRun.output?.summary || 'Check run failed';
      }

      await ValidationPipeline.update(pipeline.id, updates);

    } catch (error) {
      console.error(`❌ Failed to update validation from check run:`, error);
    }
  }

  extractPRNumberFromCheck(checkRun) {
    // Try to extract PR number from check run details
    // This depends on how the check run is configured
    
    if (checkRun.pull_requests && checkRun.pull_requests.length > 0) {
      return checkRun.pull_requests[0].number;
    }

    // Try to extract from check run name or details
    const prMatch = checkRun.details_url?.match(/\/pull\/(\d+)/);
    if (prMatch) {
      return parseInt(prMatch[1]);
    }

    return null;
  }
}
