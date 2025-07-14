import express from 'express';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

// Configuration for web-eval-agent MCP server
const WEB_EVAL_CONFIG = {
  mcpServerPath: process.env.WEB_EVAL_MCP_PATH || 'web-eval-agent',
  timeout: parseInt(process.env.WEB_EVAL_TIMEOUT) || 300000, // 5 minutes
  maxConcurrentEvaluations: parseInt(process.env.WEB_EVAL_MAX_CONCURRENT) || 3
};

// Track active evaluations
const activeEvaluations = new Map();

/**
 * Execute MCP tool with proper error handling and timeout
 */
async function executeMCPTool(toolName, params, sessionId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (mcpProcess) {
        mcpProcess.kill('SIGTERM');
      }
      reject(new Error(`MCP tool execution timed out after ${WEB_EVAL_CONFIG.timeout}ms`));
    }, WEB_EVAL_CONFIG.timeout);

    let mcpProcess;
    let stdout = '';
    let stderr = '';

    try {
      // Prepare MCP server command
      const mcpCommand = [
        'python', '-m', 'webEvalAgent.mcp_server'
      ];

      mcpProcess = spawn(mcpCommand[0], mcpCommand.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
          GITHUB_TOKEN: process.env.GITHUB_TOKEN
        }
      });

      // Send MCP request
      const mcpRequest = {
        jsonrpc: '2.0',
        id: sessionId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      mcpProcess.stdin.end();

      mcpProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      mcpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mcpProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            // Parse MCP response
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const response = JSON.parse(lastLine);
            
            if (response.error) {
              reject(new Error(`MCP Error: ${response.error.message}`));
            } else {
              resolve(response.result);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse MCP response: ${parseError.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
          }
        } else {
          reject(new Error(`MCP process exited with code ${code}\nStderr: ${stderr}`));
        }
      });

      mcpProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start MCP process: ${error.message}`));
      });

    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Generate unique session ID for tracking evaluations
 */
function generateSessionId() {
  return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/web-eval/evaluate
 * Evaluate a web application using web_eval_agent tool
 */
router.post('/evaluate', async (req, res) => {
  const sessionId = generateSessionId();
  
  try {
    const { url, task, headless = true } = req.body;

    // Validation
    if (!url || !task) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both url and task are required'
      });
    }

    // Check concurrent evaluation limit
    if (activeEvaluations.size >= WEB_EVAL_CONFIG.maxConcurrentEvaluations) {
      return res.status(429).json({
        error: 'Too many concurrent evaluations',
        message: `Maximum ${WEB_EVAL_CONFIG.maxConcurrentEvaluations} evaluations allowed`
      });
    }

    // Track this evaluation
    activeEvaluations.set(sessionId, {
      url,
      task,
      startTime: Date.now(),
      status: 'running'
    });

    console.log(`🔄 Starting web evaluation ${sessionId} for ${url}`);

    // Execute web_eval_agent tool
    const result = await executeMCPTool('web_eval_agent', {
      url,
      task,
      headless_browser: headless
    }, sessionId);

    // Update tracking
    activeEvaluations.set(sessionId, {
      ...activeEvaluations.get(sessionId),
      status: 'completed',
      endTime: Date.now()
    });

    console.log(`✅ Completed web evaluation ${sessionId}`);

    res.json({
      sessionId,
      status: 'completed',
      result,
      metadata: {
        url,
        task,
        duration: Date.now() - activeEvaluations.get(sessionId).startTime
      }
    });

  } catch (error) {
    console.error(`❌ Web evaluation ${sessionId} failed:`, error);
    
    // Update tracking
    if (activeEvaluations.has(sessionId)) {
      activeEvaluations.set(sessionId, {
        ...activeEvaluations.get(sessionId),
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      });
    }

    res.status(500).json({
      sessionId,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Clean up completed/failed evaluations after 5 minutes
    setTimeout(() => {
      activeEvaluations.delete(sessionId);
    }, 5 * 60 * 1000);
  }
});

/**
 * POST /api/web-eval/setup-browser
 * Setup browser state for authentication
 */
router.post('/setup-browser', async (req, res) => {
  const sessionId = generateSessionId();
  
  try {
    const { url } = req.body;

    console.log(`🔄 Setting up browser state ${sessionId}`);

    const result = await executeMCPTool('setup_browser_state', {
      url: url || null
    }, sessionId);

    console.log(`✅ Browser setup completed ${sessionId}`);

    res.json({
      sessionId,
      status: 'completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Browser setup ${sessionId} failed:`, error);
    
    res.status(500).json({
      sessionId,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/web-eval/test-github-pr
 * Test a GitHub PR using web evaluation
 */
router.post('/test-github-pr', async (req, res) => {
  const sessionId = generateSessionId();
  
  try {
    const { git_repo, pull_request, task, headless = true } = req.body;

    // Validation
    if (!git_repo || !pull_request || !task) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'git_repo, pull_request, and task are required'
      });
    }

    // Validate repo format
    if (!git_repo.includes('/')) {
      return res.status(400).json({
        error: 'Invalid repository format',
        message: 'Repository must be in format "owner/repo"'
      });
    }

    console.log(`🔄 Testing GitHub PR ${git_repo}#${pull_request} - ${sessionId}`);

    const result = await executeMCPTool('test_github_pr', {
      git_repo,
      pull_request: parseInt(pull_request),
      task,
      headless_browser: headless
    }, sessionId);

    console.log(`✅ GitHub PR test completed ${sessionId}`);

    res.json({
      sessionId,
      status: 'completed',
      result,
      metadata: {
        git_repo,
        pull_request,
        task
      }
    });

  } catch (error) {
    console.error(`❌ GitHub PR test ${sessionId} failed:`, error);
    
    res.status(500).json({
      sessionId,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/web-eval/test-github-branch
 * Test a GitHub branch using web evaluation
 */
router.post('/test-github-branch', async (req, res) => {
  const sessionId = generateSessionId();
  
  try {
    const { git_repo, branch, task, headless = true } = req.body;

    // Validation
    if (!git_repo || !branch || !task) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'git_repo, branch, and task are required'
      });
    }

    console.log(`🔄 Testing GitHub branch ${git_repo}@${branch} - ${sessionId}`);

    const result = await executeMCPTool('test_github_branch', {
      git_repo,
      branch,
      task,
      headless_browser: headless
    }, sessionId);

    console.log(`✅ GitHub branch test completed ${sessionId}`);

    res.json({
      sessionId,
      status: 'completed',
      result,
      metadata: {
        git_repo,
        branch,
        task
      }
    });

  } catch (error) {
    console.error(`❌ GitHub branch test ${sessionId} failed:`, error);
    
    res.status(500).json({
      sessionId,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/web-eval/status/:sessionId
 * Get status of a specific evaluation
 */
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (activeEvaluations.has(sessionId)) {
    const evaluation = activeEvaluations.get(sessionId);
    res.json({
      sessionId,
      ...evaluation,
      duration: evaluation.endTime ? 
        evaluation.endTime - evaluation.startTime : 
        Date.now() - evaluation.startTime
    });
  } else {
    res.status(404).json({
      error: 'Evaluation not found',
      message: `No evaluation found with session ID: ${sessionId}`
    });
  }
});

/**
 * GET /api/web-eval/active
 * Get all active evaluations
 */
router.get('/active', (req, res) => {
  const active = Array.from(activeEvaluations.entries()).map(([sessionId, data]) => ({
    sessionId,
    ...data,
    duration: data.endTime ? 
      data.endTime - data.startTime : 
      Date.now() - data.startTime
  }));

  res.json({
    count: active.length,
    maxConcurrent: WEB_EVAL_CONFIG.maxConcurrentEvaluations,
    evaluations: active
  });
});

/**
 * DELETE /api/web-eval/cancel/:sessionId
 * Cancel a running evaluation (if possible)
 */
router.delete('/cancel/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (activeEvaluations.has(sessionId)) {
    const evaluation = activeEvaluations.get(sessionId);
    
    if (evaluation.status === 'running') {
      // Mark as cancelled - actual process termination would need more sophisticated tracking
      activeEvaluations.set(sessionId, {
        ...evaluation,
        status: 'cancelled',
        endTime: Date.now()
      });
      
      res.json({
        sessionId,
        status: 'cancelled',
        message: 'Evaluation marked for cancellation'
      });
    } else {
      res.status(400).json({
        error: 'Cannot cancel evaluation',
        message: `Evaluation is in ${evaluation.status} state`
      });
    }
  } else {
    res.status(404).json({
      error: 'Evaluation not found',
      message: `No evaluation found with session ID: ${sessionId}`
    });
  }
});

/**
 * GET /api/web-eval/health
 * Health check for web-eval-agent integration
 */
router.get('/health', async (req, res) => {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = ['GEMINI_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Missing required environment variables',
        missing: missingEnvVars
      });
    }

    // Basic health check - could be enhanced to actually test MCP server
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        timeout: WEB_EVAL_CONFIG.timeout,
        maxConcurrent: WEB_EVAL_CONFIG.maxConcurrentEvaluations
      },
      activeEvaluations: activeEvaluations.size
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

