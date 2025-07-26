/**
 * Validation service for handling PR validation workflows
 */

import { ValidationPipeline } from '../models/ValidationPipeline.js';
import { Project } from '../models/Project.js';
import { AgentRun } from '../models/AgentRun.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class ValidationService {
  constructor() {
    this.activeValidations = new Map();
  }

  async startValidation(pipeline, project, pullRequest) {
    console.log(`🚀 Starting validation for pipeline ${pipeline.id}`);

    try {
      // Update pipeline status
      await pipeline.setStatus('running', null);
      await pipeline.updateProgress(10, 'Initializing validation environment');

      // Store active validation
      this.activeValidations.set(pipeline.id, {
        pipeline,
        project,
        pullRequest,
        startTime: Date.now()
      });

      // Run validation steps
      await this.runValidationSteps(pipeline, project, pullRequest);

    } catch (error) {
      console.error(`❌ Validation failed for pipeline ${pipeline.id}:`, error);
      
      await pipeline.setStatus('failed', error.message);
      await pipeline.updateProgress(0, 'Validation failed');
      
      // Clean up
      this.activeValidations.delete(pipeline.id);
      
      throw error;
    }
  }

  async runValidationSteps(pipeline, project, pullRequest) {
    const steps = [
      { name: 'Clone Repository', progress: 20, fn: this.cloneRepository },
      { name: 'Setup Environment', progress: 40, fn: this.setupEnvironment },
      { name: 'Run Deployment', progress: 60, fn: this.runDeployment },
      { name: 'Validate Deployment', progress: 80, fn: this.validateDeployment },
      { name: 'Run Tests', progress: 90, fn: this.runTests },
      { name: 'Generate Report', progress: 100, fn: this.generateReport }
    ];

    const validationResults = {
      success: false,
      steps: [],
      errors: [],
      deployment_url: null,
      test_results: null
    };

    for (const step of steps) {
      try {
        console.log(`📋 Running step: ${step.name}`);
        await pipeline.updateProgress(step.progress, step.name);

        const stepResult = await step.fn.call(this, pipeline, project, pullRequest);
        
        validationResults.steps.push({
          name: step.name,
          success: true,
          result: stepResult,
          timestamp: new Date().toISOString()
        });

        // Store deployment URL if available
        if (stepResult?.deployment_url) {
          validationResults.deployment_url = stepResult.deployment_url;
          await pipeline.setDeploymentUrl(stepResult.deployment_url);
        }

        // Store test results if available
        if (stepResult?.test_results) {
          validationResults.test_results = stepResult.test_results;
        }

      } catch (error) {
        console.error(`❌ Step ${step.name} failed:`, error);
        
        validationResults.steps.push({
          name: step.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        validationResults.errors.push({
          step: step.name,
          error: error.message
        });

        // Check if we should continue or fail
        if (this.shouldFailValidation(step.name, error)) {
          validationResults.success = false;
          await pipeline.setResults(validationResults);
          
          // Send error to Codegen API for fixing
          await this.sendErrorToCodegen(pipeline, project, pullRequest, error);
          return;
        }
      }
    }

    // All steps completed successfully
    validationResults.success = true;
    await pipeline.setResults(validationResults);
    
    console.log(`✅ Validation completed successfully for pipeline ${pipeline.id}`);
    
    // Clean up
    this.activeValidations.delete(pipeline.id);
  }

  async cloneRepository(pipeline, project, pullRequest) {
    console.log(`📥 Cloning repository for PR #${pullRequest.number}`);

    const workDir = `/tmp/validation-${pipeline.id}`;
    const repoUrl = project.repository_url;
    const branch = pullRequest.head.ref;

    try {
      // Create work directory
      await fs.mkdir(workDir, { recursive: true });

      // Clone the repository
      const cloneCmd = `git clone --depth 1 --branch ${branch} ${repoUrl} ${workDir}/repo`;
      await execAsync(cloneCmd);

      console.log(`✅ Repository cloned to ${workDir}/repo`);
      
      return {
        work_dir: workDir,
        repo_dir: `${workDir}/repo`,
        branch: branch
      };

    } catch (error) {
      console.error(`❌ Failed to clone repository:`, error);
      throw new Error(`Repository clone failed: ${error.message}`);
    }
  }

  async setupEnvironment(pipeline, project, pullRequest) {
    console.log(`⚙️ Setting up environment for pipeline ${pipeline.id}`);

    const workDir = `/tmp/validation-${pipeline.id}`;
    const repoDir = `${workDir}/repo`;

    try {
      // Get project setup commands
      const setupCommands = await Project.getSetting(project.id, 'setup_commands');
      
      if (!setupCommands?.value) {
        console.log(`ℹ️ No setup commands configured for project ${project.id}`);
        return { setup_commands: 'none' };
      }

      // Parse and execute setup commands
      const commands = setupCommands.value.split('\n').filter(cmd => cmd.trim());
      const results = [];

      for (const command of commands) {
        if (command.trim().startsWith('#') || !command.trim()) {
          continue; // Skip comments and empty lines
        }

        console.log(`🔄 Executing: ${command}`);
        
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: repoDir,
            timeout: 300000 // 5 minutes timeout
          });
          
          results.push({
            command,
            success: true,
            stdout: stdout.substring(0, 1000), // Limit output
            stderr: stderr.substring(0, 1000)
          });

        } catch (error) {
          results.push({
            command,
            success: false,
            error: error.message,
            stdout: error.stdout?.substring(0, 1000) || '',
            stderr: error.stderr?.substring(0, 1000) || ''
          });
          
          // Fail if critical setup command fails
          throw new Error(`Setup command failed: ${command} - ${error.message}`);
        }
      }

      console.log(`✅ Environment setup completed`);
      
      return {
        setup_commands: commands.length,
        results: results
      };

    } catch (error) {
      console.error(`❌ Environment setup failed:`, error);
      throw error;
    }
  }

  async runDeployment(pipeline, project, pullRequest) {
    console.log(`🚀 Running deployment for pipeline ${pipeline.id}`);

    const workDir = `/tmp/validation-${pipeline.id}`;
    const repoDir = `${workDir}/repo`;

    try {
      // Get deployment commands from project settings
      const deployCommands = await Project.getSetting(project.id, 'deploy_commands');
      
      if (!deployCommands?.value) {
        // Use default deployment strategy
        return await this.runDefaultDeployment(repoDir, pipeline);
      }

      // Execute custom deployment commands
      const commands = deployCommands.value.split('\n').filter(cmd => cmd.trim());
      const results = [];
      let deploymentUrl = null;

      for (const command of commands) {
        if (command.trim().startsWith('#') || !command.trim()) {
          continue;
        }

        console.log(`🔄 Deploying: ${command}`);
        
        const { stdout, stderr } = await execAsync(command, {
          cwd: repoDir,
          timeout: 600000 // 10 minutes timeout
        });
        
        results.push({
          command,
          stdout: stdout.substring(0, 1000),
          stderr: stderr.substring(0, 1000)
        });

        // Try to extract deployment URL from output
        const urlMatch = stdout.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          deploymentUrl = urlMatch[0];
        }
      }

      // Generate deployment URL if not found
      if (!deploymentUrl) {
        deploymentUrl = `http://localhost:${3000 + Math.floor(Math.random() * 1000)}`;
      }

      console.log(`✅ Deployment completed: ${deploymentUrl}`);
      
      return {
        deployment_url: deploymentUrl,
        commands: commands.length,
        results: results
      };

    } catch (error) {
      console.error(`❌ Deployment failed:`, error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async runDefaultDeployment(repoDir, pipeline) {
    console.log(`🔧 Running default deployment strategy`);

    try {
      // Check for common deployment files
      const packageJsonExists = await fs.access(path.join(repoDir, 'package.json')).then(() => true).catch(() => false);
      const dockerfileExists = await fs.access(path.join(repoDir, 'Dockerfile')).then(() => true).catch(() => false);

      if (packageJsonExists) {
        // Node.js project
        await execAsync('npm install', { cwd: repoDir, timeout: 300000 });
        
        // Try to start the application
        const port = 3000 + Math.floor(Math.random() * 1000);
        const deploymentUrl = `http://localhost:${port}`;
        
        // Start the application in background (for testing purposes)
        execAsync(`npm start &`, { cwd: repoDir }).catch(() => {
          // Ignore errors for background process
        });

        return {
          deployment_url: deploymentUrl,
          strategy: 'nodejs',
          port: port
        };

      } else if (dockerfileExists) {
        // Docker project
        const imageName = `validation-${pipeline.id}`;
        const port = 3000 + Math.floor(Math.random() * 1000);
        
        await execAsync(`docker build -t ${imageName} .`, { cwd: repoDir, timeout: 600000 });
        
        // Start container in background
        execAsync(`docker run -d -p ${port}:3000 ${imageName}`).catch(() => {
          // Ignore errors for background process
        });

        return {
          deployment_url: `http://localhost:${port}`,
          strategy: 'docker',
          image: imageName,
          port: port
        };

      } else {
        // Static files
        const port = 3000 + Math.floor(Math.random() * 1000);
        const deploymentUrl = `http://localhost:${port}`;
        
        // Start simple HTTP server
        execAsync(`python3 -m http.server ${port} &`, { cwd: repoDir }).catch(() => {
          // Ignore errors for background process
        });

        return {
          deployment_url: deploymentUrl,
          strategy: 'static',
          port: port
        };
      }

    } catch (error) {
      console.error(`❌ Default deployment failed:`, error);
      throw error;
    }
  }

  async validateDeployment(pipeline, project, pullRequest) {
    console.log(`🔍 Validating deployment for pipeline ${pipeline.id}`);

    const validationData = this.activeValidations.get(pipeline.id);
    if (!validationData) {
      throw new Error('Validation data not found');
    }

    // Get deployment URL from previous step
    const deploymentUrl = pipeline.deployment_url;
    if (!deploymentUrl) {
      throw new Error('No deployment URL available');
    }

    try {
      // Wait for deployment to be ready
      await this.waitForDeployment(deploymentUrl);

      // Run basic health checks
      const healthCheck = await this.runHealthCheck(deploymentUrl);
      
      // Use Gemini API to validate deployment
      const geminiValidation = await this.validateWithGemini(deploymentUrl, project);

      console.log(`✅ Deployment validation completed`);
      
      return {
        deployment_url: deploymentUrl,
        health_check: healthCheck,
        gemini_validation: geminiValidation,
        validation_time: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Deployment validation failed:`, error);
      throw error;
    }
  }

  async runTests(pipeline, project, pullRequest) {
    console.log(`🧪 Running tests for pipeline ${pipeline.id}`);

    const workDir = `/tmp/validation-${pipeline.id}`;
    const repoDir = `${workDir}/repo`;

    try {
      // Check for test commands in project settings
      const testCommands = await Project.getSetting(project.id, 'test_commands');
      
      let commands = [];
      if (testCommands?.value) {
        commands = testCommands.value.split('\n').filter(cmd => cmd.trim());
      } else {
        // Default test commands
        commands = ['npm test', 'yarn test', 'python -m pytest', 'go test ./...'];
      }

      const testResults = {
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        results: []
      };

      for (const command of commands) {
        if (command.trim().startsWith('#') || !command.trim()) {
          continue;
        }

        try {
          console.log(`🔄 Running test: ${command}`);
          
          const { stdout, stderr } = await execAsync(command, {
            cwd: repoDir,
            timeout: 300000 // 5 minutes timeout
          });
          
          // Parse test results (basic parsing)
          const testCount = this.parseTestResults(stdout, stderr);
          
          testResults.total_tests += testCount.total;
          testResults.passed_tests += testCount.passed;
          testResults.failed_tests += testCount.failed;
          
          testResults.results.push({
            command,
            success: true,
            stdout: stdout.substring(0, 2000),
            stderr: stderr.substring(0, 1000),
            test_count: testCount
          });

        } catch (error) {
          // Test command failed, but continue with other tests
          testResults.results.push({
            command,
            success: false,
            error: error.message,
            stdout: error.stdout?.substring(0, 2000) || '',
            stderr: error.stderr?.substring(0, 1000) || ''
          });
        }
      }

      console.log(`✅ Tests completed: ${testResults.passed_tests}/${testResults.total_tests} passed`);
      
      return {
        test_results: testResults,
        success: testResults.failed_tests === 0
      };

    } catch (error) {
      console.error(`❌ Tests failed:`, error);
      throw error;
    }
  }

  async generateReport(pipeline, project, pullRequest) {
    console.log(`📊 Generating validation report for pipeline ${pipeline.id}`);

    try {
      const validationData = this.activeValidations.get(pipeline.id);
      const endTime = Date.now();
      const duration = endTime - validationData.startTime;

      const report = {
        pipeline_id: pipeline.id,
        project_id: project.id,
        pull_request: {
          number: pullRequest.number,
          title: pullRequest.title,
          url: pullRequest.html_url,
          branch: pullRequest.head.ref
        },
        validation: {
          start_time: new Date(validationData.startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          duration_ms: duration,
          duration_human: this.formatDuration(duration)
        },
        deployment_url: pipeline.deployment_url,
        status: 'completed',
        generated_at: new Date().toISOString()
      };

      console.log(`✅ Validation report generated`);
      
      return {
        report: report,
        duration: duration
      };

    } catch (error) {
      console.error(`❌ Report generation failed:`, error);
      throw error;
    }
  }

  // Helper methods

  async waitForDeployment(url, maxAttempts = 30, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url, { timeout: 5000 });
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Ignore and retry
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Deployment not ready after ${maxAttempts} attempts`);
  }

  async runHealthCheck(url) {
    try {
      const response = await fetch(url, { timeout: 10000 });
      
      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        response_time: Date.now() // Simplified
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  async validateWithGemini(url, project) {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return { error: 'Gemini API key not configured' };
      }

      // Get project context for validation
      const projectSettings = await Project.getSettings(project.id);
      const repositoryRules = projectSettings.repository_rules?.value || '';

      const prompt = `
        Validate this deployed application: ${url}
        
        Project: ${project.name}
        Repository Rules: ${repositoryRules}
        
        Please check:
        1. Is the application accessible?
        2. Does it load without errors?
        3. Are there any obvious issues?
        4. Does it meet the repository rules?
        
        Provide a brief validation report.
      `;

      // Call Gemini API (simplified)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const validationText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No validation response';

      return {
        success: true,
        validation: validationText,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Gemini validation failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseTestResults(stdout, stderr) {
    // Basic test result parsing - can be enhanced for specific frameworks
    const output = stdout + stderr;
    
    let total = 0;
    let passed = 0;
    let failed = 0;

    // Jest/npm test patterns
    const jestMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (jestMatch) {
      failed = parseInt(jestMatch[1]);
      passed = parseInt(jestMatch[2]);
      total = parseInt(jestMatch[3]);
    }

    // Pytest patterns
    const pytestMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
    if (pytestMatch) {
      passed = parseInt(pytestMatch[1]);
      failed = parseInt(pytestMatch[2]);
      total = passed + failed;
    }

    // Go test patterns
    const goTestMatch = output.match(/PASS|FAIL/g);
    if (goTestMatch) {
      total = goTestMatch.length;
      passed = goTestMatch.filter(result => result === 'PASS').length;
      failed = total - passed;
    }

    return { total, passed, failed };
  }

  shouldFailValidation(stepName, error) {
    // Define which steps should cause validation to fail
    const criticalSteps = ['Clone Repository', 'Run Deployment'];
    return criticalSteps.includes(stepName);
  }

  async sendErrorToCodegen(pipeline, project, pullRequest, error) {
    try {
      console.log(`📤 Sending error to Codegen API for fixing`);

      // Get Codegen API credentials
      const codegenToken = process.env.CODEGEN_TOKEN;
      const codegenOrgId = process.env.CODEGEN_ORG_ID;

      if (!codegenToken || !codegenOrgId) {
        console.log(`⚠️ Codegen API credentials not configured`);
        return;
      }

      // Create agent run for error fixing
      const errorContext = `
        Validation failed for PR #${pullRequest.number} in project ${project.name}.
        
        Error: ${error.message}
        
        Please analyze the error and update the PR with fixes to resolve the validation issues.
        
        Project context: ${project.description || 'No description'}
        PR Title: ${pullRequest.title}
        PR URL: ${pullRequest.html_url}
      `;

      const response = await fetch(`https://api.codegen.com/v1/organizations/${codegenOrgId}/agent/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${codegenToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: errorContext,
          context: {
            project_id: project.id,
            pipeline_id: pipeline.id,
            pull_request_number: pullRequest.number
          }
        })
      });

      if (response.ok) {
        const agentRun = await response.json();
        console.log(`✅ Created Codegen agent run: ${agentRun.id}`);
        
        // Link agent run to validation pipeline
        await ValidationPipeline.update(pipeline.id, {
          agent_run_id: agentRun.id,
          current_step: 'Codegen fixing errors'
        });
      }

    } catch (error) {
      console.error(`❌ Failed to send error to Codegen:`, error);
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async cancelValidation(pipelineId) {
    console.log(`🛑 Cancelling validation for pipeline ${pipelineId}`);
    
    const validationData = this.activeValidations.get(pipelineId);
    if (validationData) {
      // Clean up any running processes
      const workDir = `/tmp/validation-${pipelineId}`;
      try {
        await execAsync(`rm -rf ${workDir}`);
      } catch (error) {
        console.error(`❌ Failed to clean up work directory:`, error);
      }
      
      this.activeValidations.delete(pipelineId);
    }
  }

  async cleanupValidation(pipelineId) {
    console.log(`🧹 Cleaning up validation for pipeline ${pipelineId}`);
    
    const workDir = `/tmp/validation-${pipelineId}`;
    try {
      await execAsync(`rm -rf ${workDir}`);
      console.log(`✅ Cleaned up work directory: ${workDir}`);
    } catch (error) {
      console.error(`❌ Failed to clean up work directory:`, error);
    }
    
    this.activeValidations.delete(pipelineId);
  }
}
