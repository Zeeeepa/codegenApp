/**
 * Mock implementation for MCP server testing
 */

import { EventEmitter } from 'events';
import { sampleMCPResponses } from '../fixtures/sample-responses.js';

export class MockMCPProcess extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.killed = false;
    this.stdin = {
      write: jest.fn(),
      end: jest.fn()
    };
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    
    // Simulate process startup delay
    setTimeout(() => {
      this.simulateStartup();
    }, options.startupDelay || 100);
  }

  simulateStartup() {
    if (this.options.shouldFail) {
      this.emit('error', new Error(this.options.errorMessage || 'Mock process failed'));
      return;
    }

    // Simulate server ready message
    this.stdout.emit('data', 'FastMCP server starting...\n');
    
    // Set up request handling
    this.stdin.write.mockImplementation((data) => {
      this.handleMCPRequest(data);
    });
  }

  handleMCPRequest(data) {
    try {
      const request = JSON.parse(data.toString().trim());
      
      setTimeout(() => {
        const response = this.generateMockResponse(request);
        this.stdout.emit('data', JSON.stringify(response) + '\n');
        
        // Simulate process completion
        setTimeout(() => {
          this.emit('close', 0);
        }, this.options.responseDelay || 50);
      }, this.options.processingDelay || 10);
      
    } catch (error) {
      // Simulate JSON parsing error
      this.stderr.emit('data', `JSON parsing error: ${error.message}\n`);
      this.emit('close', 1);
    }
  }

  generateMockResponse(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: sampleMCPResponses.toolsList.result
        };

      case 'tools/call':
        return this.handleToolCall(request);

      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'MockWebEvalAgent',
              version: '1.0.0'
            }
          }
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
    }
  }

  handleToolCall(request) {
    const { params, id } = request;
    const { name, arguments: args } = params;

    // Simulate tool-specific responses based on configuration
    if (this.options.toolResponses && this.options.toolResponses[name]) {
      return {
        jsonrpc: '2.0',
        id,
        ...this.options.toolResponses[name]
      };
    }

    switch (name) {
      case 'web_eval_agent':
        return this.handleWebEvalTool(args, id);
      
      case 'setup_browser_state':
        return {
          jsonrpc: '2.0',
          id,
          result: sampleMCPResponses.browserSetupSuccess.result
        };
      
      case 'test_github_pr':
        return this.handleGitHubPRTool(args, id);
      
      case 'test_github_branch':
        return this.handleGitHubBranchTool(args, id);
      
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: 'Tool not found',
            data: { toolName: name }
          }
        };
    }
  }

  handleWebEvalTool(args, id) {
    const { url, task } = args;

    // Simulate parameter validation
    if (!url || !task) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Missing required parameters: url and task are required'
        }
      };
    }

    // Simulate different scenarios based on URL
    if (url.includes('99999') || url.includes('unreachable')) {
      return {
        jsonrpc: '2.0',
        id,
        result: [{
          type: 'text',
          text: '❌ Error: Failed to load the specified URL. The page may be unreachable or the server may be down.'
        }]
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: sampleMCPResponses.webEvalSuccess.result
    };
  }

  handleGitHubPRTool(args, id) {
    const { git_repo, pull_request, task } = args;

    // Simulate parameter validation
    if (!git_repo || !pull_request || !task) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Missing required parameters: git_repo, pull_request, and task are required'
        }
      };
    }

    // Simulate non-existent PR
    if (pull_request === 999999) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'GitHub PR not found or not accessible',
          data: { git_repo, pull_request }
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: sampleMCPResponses.githubPRSuccess.result
    };
  }

  handleGitHubBranchTool(args, id) {
    const { git_repo, branch, task } = args;

    // Simulate parameter validation
    if (!git_repo || !branch || !task) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Missing required parameters: git_repo, branch, and task are required'
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: sampleMCPResponses.githubBranchSuccess.result
    };
  }

  kill(signal) {
    this.killed = true;
    setTimeout(() => {
      this.emit('exit', signal === 'SIGTERM' ? 0 : 1);
    }, 10);
  }
}

export function createMockSpawn(options = {}) {
  return jest.fn().mockImplementation(() => {
    return new MockMCPProcess(options);
  });
}

export const mockMCPServerScenarios = {
  success: {
    startupDelay: 50,
    processingDelay: 10,
    responseDelay: 20
  },

  slow: {
    startupDelay: 200,
    processingDelay: 100,
    responseDelay: 150
  },

  failure: {
    shouldFail: true,
    errorMessage: 'Mock MCP server failed to start'
  },

  timeout: {
    startupDelay: 1000,
    processingDelay: 2000,
    responseDelay: 3000
  },

  invalidApiKey: {
    toolResponses: {
      web_eval_agent: {
        result: [{
          type: 'text',
          text: '❌ Error: API Key validation failed when running the tool.\n   Reason: Invalid or expired Gemini API key.\n   👉 Please check your GEMINI_API_KEY at https://aistudio.google.com/app/apikey'
        }]
      }
    }
  },

  networkError: {
    toolResponses: {
      web_eval_agent: {
        error: {
          code: -32603,
          message: 'Network error: Unable to reach the target URL',
          data: { error: 'ECONNREFUSED' }
        }
      }
    }
  }
};

