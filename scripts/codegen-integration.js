#!/usr/bin/env node

/**
 * Codegen API Integration Script
 * 
 * This script provides comprehensive integration with the Codegen API
 * for automated code analysis, improvements, and CI/CD workflow management.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class CodegenIntegration {
  constructor() {
    this.apiToken = process.env.CODEGEN_API_TOKEN;
    this.baseUrl = 'api.codegen.com';
    this.apiVersion = 'v1';
    
    if (!this.apiToken) {
      console.warn('⚠️ CODEGEN_API_TOKEN not set - some features will be disabled');
    }
  }

  /**
   * Create a new agent run for code analysis
   */
  async createAgentRun(message, agentId = 'default', metadata = {}) {
    if (!this.apiToken) {
      console.log('⚠️ Codegen API token not available - skipping agent run creation');
      return null;
    }

    const data = JSON.stringify({
      message,
      agent_id: agentId,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'ci-cd-integration',
        ...metadata
      }
    });

    const options = {
      hostname: this.baseUrl,
      port: 443,
      path: `/${this.apiVersion}/agent-runs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Length': data.length,
        'User-Agent': 'CodegenApp-CI/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200 || res.statusCode === 201) {
              const result = JSON.parse(responseData);
              console.log(`✅ Codegen agent run created: ${result.id}`);
              resolve(result);
            } else {
              console.log(`⚠️ Codegen API responded with status ${res.statusCode}`);
              console.log('Response:', responseData);
              resolve(null);
            }
          } catch (error) {
            console.log('⚠️ Failed to parse Codegen API response:', error.message);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.log('⚠️ Codegen API request failed:', error.message);
        resolve(null);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Resume an existing agent run
   */
  async resumeAgentRun(runId, message, metadata = {}) {
    if (!this.apiToken) {
      console.log('⚠️ Codegen API token not available - skipping agent run resume');
      return null;
    }

    const data = JSON.stringify({
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'ci-cd-integration',
        action: 'resume',
        ...metadata
      }
    });

    const options = {
      hostname: this.baseUrl,
      port: 443,
      path: `/${this.apiVersion}/agent-runs/${runId}/resume`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Length': data.length,
        'User-Agent': 'CodegenApp-CI/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200 || res.statusCode === 201) {
              const result = JSON.parse(responseData);
              console.log(`✅ Codegen agent run resumed: ${runId}`);
              resolve(result);
            } else {
              console.log(`⚠️ Codegen API responded with status ${res.statusCode}`);
              console.log('Response:', responseData);
              resolve(null);
            }
          } catch (error) {
            console.log('⚠️ Failed to parse Codegen API response:', error.message);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.log('⚠️ Codegen API request failed:', error.message);
        resolve(null);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Get the status of an agent run
   */
  async getAgentRunStatus(runId) {
    if (!this.apiToken) {
      console.log('⚠️ Codegen API token not available - skipping status check');
      return null;
    }

    const options = {
      hostname: this.baseUrl,
      port: 443,
      path: `/${this.apiVersion}/agent-runs/${runId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'User-Agent': 'CodegenApp-CI/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(responseData);
              resolve(result);
            } else {
              console.log(`⚠️ Codegen API responded with status ${res.statusCode}`);
              resolve(null);
            }
          } catch (error) {
            console.log('⚠️ Failed to parse Codegen API response:', error.message);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.log('⚠️ Codegen API request failed:', error.message);
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * Wait for an agent run to complete
   */
  async waitForCompletion(runId, maxWaitTime = 600000, pollInterval = 10000) {
    console.log(`⏳ Waiting for agent run ${runId} to complete...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getAgentRunStatus(runId);
      
      if (!status) {
        console.log('⚠️ Could not get agent run status');
        return null;
      }

      console.log(`📊 Agent run status: ${status.status}`);

      if (status.status === 'completed' || status.status === 'failed') {
        console.log(`✅ Agent run completed with status: ${status.status}`);
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.log('⏰ Timeout waiting for agent run completion');
    return null;
  }

  /**
   * Analyze code quality and create improvement suggestions
   */
  async analyzeCodeQuality(options = {}) {
    const {
      repository = process.env.GITHUB_REPOSITORY,
      branch = process.env.GITHUB_REF_NAME,
      commitSha = process.env.GITHUB_SHA,
      prNumber = process.env.GITHUB_PR_NUMBER,
      focus = []
    } = options;

    const focusAreas = focus.length > 0 ? focus : [
      'Fix ESLint warnings and TypeScript errors',
      'Resolve Python dependency compatibility issues',
      'Improve test coverage and add missing tests',
      'Optimize build performance and bundle size',
      'Add proper error handling and logging',
      'Enhance security and fix vulnerabilities',
      'Improve code documentation and comments'
    ];

    const message = `
🔍 **Code Quality Analysis Request**

Please analyze the codebase and provide improvements for:

${focusAreas.map(area => `• ${area}`).join('\n')}

**Repository Context:**
- Repository: ${repository}
- Branch: ${branch}
- Commit: ${commitSha}
- PR Number: ${prNumber || 'N/A'}

**Analysis Focus:**
- Identify and fix build warnings and errors
- Resolve dependency compatibility issues
- Improve code quality and maintainability
- Enhance test coverage
- Optimize performance
- Address security concerns

Please create commits with fixes and improvements as needed.
    `.trim();

    return await this.createAgentRun(message, 'code-analyzer', {
      repository,
      branch,
      commit_sha: commitSha,
      pr_number: prNumber,
      analysis_type: 'code_quality',
      focus_areas: focusAreas
    });
  }

  /**
   * Monitor deployment and create post-deployment analysis
   */
  async monitorDeployment(environment, options = {}) {
    const {
      repository = process.env.GITHUB_REPOSITORY,
      commitSha = process.env.GITHUB_SHA,
      deploymentUrl,
      healthCheckUrl
    } = options;

    const message = `
🚀 **Deployment Monitoring Request**

A new deployment has been completed to the ${environment} environment.

**Deployment Details:**
- Environment: ${environment}
- Repository: ${repository}
- Commit: ${commitSha}
- Deployment URL: ${deploymentUrl || 'Not specified'}
- Health Check URL: ${healthCheckUrl || 'Not specified'}

**Monitoring Tasks:**
- Verify deployment health and functionality
- Monitor for errors and performance issues
- Check application logs for anomalies
- Validate all critical features are working
- Monitor user experience and feedback
- Set up alerts for any issues

Please monitor the deployment for the next 24 hours and report any issues or recommendations.
    `.trim();

    return await this.createAgentRun(message, 'deployment-monitor', {
      repository,
      commit_sha: commitSha,
      environment,
      deployment_url: deploymentUrl,
      health_check_url: healthCheckUrl,
      monitoring_type: 'post_deployment',
      monitoring_duration: '24h'
    });
  }

  /**
   * Create a comprehensive CI/CD workflow analysis
   */
  async analyzeCICDWorkflow(workflowResults = {}) {
    const message = `
⚙️ **CI/CD Workflow Analysis Request**

Please analyze the CI/CD workflow execution and provide insights and improvements.

**Workflow Results:**
${Object.entries(workflowResults).map(([job, result]) => `• ${job}: ${result}`).join('\n')}

**Analysis Areas:**
- Build performance and optimization opportunities
- Test coverage and quality improvements
- Security scan results and recommendations
- Deployment process enhancements
- Workflow reliability and error handling
- Resource usage optimization

Please provide actionable recommendations for improving the CI/CD pipeline.
    `.trim();

    return await this.createAgentRun(message, 'cicd-analyzer', {
      workflow_results: workflowResults,
      analysis_type: 'cicd_workflow',
      repository: process.env.GITHUB_REPOSITORY,
      commit_sha: process.env.GITHUB_SHA
    });
  }

  /**
   * Save agent run information to file
   */
  saveAgentRunInfo(runInfo, filename = 'codegen-run-info.json') {
    try {
      const filePath = path.join(process.cwd(), filename);
      fs.writeFileSync(filePath, JSON.stringify(runInfo, null, 2));
      console.log(`📝 Agent run info saved to ${filename}`);
    } catch (error) {
      console.log(`⚠️ Failed to save agent run info: ${error.message}`);
    }
  }

  /**
   * Load agent run information from file
   */
  loadAgentRunInfo(filename = 'codegen-run-info.json') {
    try {
      const filePath = path.join(process.cwd(), filename);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log(`⚠️ Failed to load agent run info: ${error.message}`);
      return null;
    }
  }
}

// Export for use as module
module.exports = CodegenIntegration;

// CLI usage
if (require.main === module) {
  const integration = new CodegenIntegration();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'analyze':
      integration.analyzeCodeQuality().then(result => {
        if (result) {
          integration.saveAgentRunInfo(result);
          console.log('🎉 Code analysis initiated successfully');
        } else {
          console.log('❌ Failed to initiate code analysis');
          process.exit(1);
        }
      });
      break;

    case 'monitor':
      const environment = args[0] || 'staging';
      integration.monitorDeployment(environment).then(result => {
        if (result) {
          integration.saveAgentRunInfo(result);
          console.log(`🎉 Deployment monitoring initiated for ${environment}`);
        } else {
          console.log('❌ Failed to initiate deployment monitoring');
          process.exit(1);
        }
      });
      break;

    case 'status':
      const runId = args[0];
      if (!runId) {
        console.log('❌ Please provide a run ID');
        process.exit(1);
      }
      integration.getAgentRunStatus(runId).then(status => {
        if (status) {
          console.log('📊 Agent run status:', JSON.stringify(status, null, 2));
        } else {
          console.log('❌ Failed to get agent run status');
          process.exit(1);
        }
      });
      break;

    case 'wait':
      const waitRunId = args[0];
      if (!waitRunId) {
        console.log('❌ Please provide a run ID');
        process.exit(1);
      }
      integration.waitForCompletion(waitRunId).then(result => {
        if (result) {
          console.log('✅ Agent run completed:', JSON.stringify(result, null, 2));
        } else {
          console.log('❌ Agent run did not complete successfully');
          process.exit(1);
        }
      });
      break;

    default:
      console.log(`
🤖 Codegen Integration CLI

Usage:
  node codegen-integration.js <command> [args]

Commands:
  analyze                    - Start code quality analysis
  monitor <environment>      - Start deployment monitoring
  status <run-id>           - Get agent run status
  wait <run-id>             - Wait for agent run completion

Environment Variables:
  CODEGEN_API_TOKEN         - Required for API access
  GITHUB_REPOSITORY         - Repository name (auto-detected in CI)
  GITHUB_REF_NAME          - Branch name (auto-detected in CI)
  GITHUB_SHA               - Commit SHA (auto-detected in CI)
  GITHUB_PR_NUMBER         - PR number (auto-detected in CI)

Examples:
  node codegen-integration.js analyze
  node codegen-integration.js monitor staging
  node codegen-integration.js status abc123
  node codegen-integration.js wait abc123
      `);
      break;
  }
}
