/**
 * Integration tests for MCP server communication
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

describe('MCP Server Integration', () => {
  let mcpProcess;
  const timeout = 30000; // 30 seconds for integration tests

  beforeEach(() => {
    // Ensure required environment variables are set for integration tests
    if (!process.env.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = 'test-api-key-for-integration';
    }
  });

  afterEach(async () => {
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise((resolve) => {
        mcpProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force resolve after 5 seconds
      });
    }
  });

  describe('MCP Server Startup', () => {
    it('should start MCP server successfully', async () => {
      const startupPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('MCP server startup timeout'));
        }, timeout);

        try {
          mcpProcess = spawn('python', ['-m', 'webEvalAgent.mcp_server'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              GEMINI_API_KEY: process.env.GEMINI_API_KEY
            }
          });

          let stdout = '';
          let stderr = '';

          mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            // Look for server ready indicators
            if (stdout.includes('FastMCP') || stdout.includes('server')) {
              clearTimeout(timeoutId);
              resolve({ stdout, stderr });
            }
          });

          mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          mcpProcess.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to start MCP server: ${error.message}`));
          });

          mcpProcess.on('exit', (code) => {
            clearTimeout(timeoutId);
            if (code !== 0) {
              reject(new Error(`MCP server exited with code ${code}\nStderr: ${stderr}`));
            }
          });

          // Send a simple test message to check if server is responsive
          setTimeout(() => {
            if (mcpProcess && !mcpProcess.killed) {
              const testMessage = {
                jsonrpc: '2.0',
                id: 'test-startup',
                method: 'initialize',
                params: {}
              };
              
              mcpProcess.stdin.write(JSON.stringify(testMessage) + '\n');
            }
          }, 1000);

        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      const result = await startupPromise;
      expect(result.stdout).toBeDefined();
    }, timeout);

    it('should handle invalid API key gracefully', async () => {
      const invalidKeyTest = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, timeout);

        try {
          const testProcess = spawn('python', ['-m', 'webEvalAgent.mcp_server'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              GEMINI_API_KEY: 'invalid-api-key'
            }
          });

          let stderr = '';

          testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          testProcess.on('exit', (code) => {
            clearTimeout(timeoutId);
            // Should exit with error code or show error message
            resolve({ code, stderr });
          });

          testProcess.on('error', (error) => {
            clearTimeout(timeoutId);
            resolve({ error: error.message });
          });

        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      const result = await invalidKeyTest;
      // Should either exit with non-zero code or show error in stderr
      expect(result.code !== 0 || result.stderr.includes('Error') || result.error).toBeTruthy();
    }, timeout);
  });

  describe('MCP Tool Communication', () => {
    beforeEach(async () => {
      // Start MCP server for tool tests
      const serverReady = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 15000);

        mcpProcess = spawn('python', ['-m', 'webEvalAgent.mcp_server'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        });

        let stdout = '';

        mcpProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          if (stdout.includes('FastMCP') || stdout.length > 100) {
            clearTimeout(timeoutId);
            resolve();
          }
        });

        mcpProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      await serverReady;
    });

    it('should respond to tool list request', async () => {
      const toolListPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Tool list request timeout'));
        }, 10000);

        let stdout = '';

        const dataHandler = (data) => {
          stdout += data.toString();
          
          try {
            const lines = stdout.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const response = JSON.parse(line);
              if (response.id === 'tool-list-test' && response.result) {
                clearTimeout(timeoutId);
                mcpProcess.stdout.off('data', dataHandler);
                resolve(response.result);
              }
            }
          } catch (e) {
            // Continue parsing
          }
        };

        mcpProcess.stdout.on('data', dataHandler);

        const listToolsRequest = {
          jsonrpc: '2.0',
          id: 'tool-list-test',
          method: 'tools/list',
          params: {}
        };

        mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
      });

      const tools = await toolListPromise;
      expect(tools).toBeDefined();
      expect(Array.isArray(tools.tools)).toBeTruthy();
      
      // Check for expected tools
      const toolNames = tools.tools.map(tool => tool.name);
      expect(toolNames).toContain('web_eval_agent');
      expect(toolNames).toContain('setup_browser_state');
      expect(toolNames).toContain('test_github_pr');
      expect(toolNames).toContain('test_github_branch');
    }, timeout);

    it('should handle invalid tool requests gracefully', async () => {
      const invalidToolPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Invalid tool request timeout'));
        }, 10000);

        let stdout = '';

        const dataHandler = (data) => {
          stdout += data.toString();
          
          try {
            const lines = stdout.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const response = JSON.parse(line);
              if (response.id === 'invalid-tool-test') {
                clearTimeout(timeoutId);
                mcpProcess.stdout.off('data', dataHandler);
                resolve(response);
              }
            }
          } catch (e) {
            // Continue parsing
          }
        };

        mcpProcess.stdout.on('data', dataHandler);

        const invalidToolRequest = {
          jsonrpc: '2.0',
          id: 'invalid-tool-test',
          method: 'tools/call',
          params: {
            name: 'non_existent_tool',
            arguments: {}
          }
        };

        mcpProcess.stdin.write(JSON.stringify(invalidToolRequest) + '\n');
      });

      const response = await invalidToolPromise;
      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Tool not found');
    }, timeout);
  });

  describe('Tool Parameter Validation', () => {
    beforeEach(async () => {
      // Start MCP server
      const serverReady = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 15000);

        mcpProcess = spawn('python', ['-m', 'webEvalAgent.mcp_server'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        });

        let stdout = '';

        mcpProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          if (stdout.includes('FastMCP') || stdout.length > 100) {
            clearTimeout(timeoutId);
            resolve();
          }
        });

        mcpProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      await serverReady;
    });

    it('should validate web_eval_agent parameters', async () => {
      const validationPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Parameter validation timeout'));
        }, 10000);

        let stdout = '';

        const dataHandler = (data) => {
          stdout += data.toString();
          
          try {
            const lines = stdout.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const response = JSON.parse(line);
              if (response.id === 'param-validation-test') {
                clearTimeout(timeoutId);
                mcpProcess.stdout.off('data', dataHandler);
                resolve(response);
              }
            }
          } catch (e) {
            // Continue parsing
          }
        };

        mcpProcess.stdout.on('data', dataHandler);

        // Test with missing required parameters
        const invalidParamsRequest = {
          jsonrpc: '2.0',
          id: 'param-validation-test',
          method: 'tools/call',
          params: {
            name: 'web_eval_agent',
            arguments: {
              // Missing required 'url' and 'task' parameters
              headless_browser: true
            }
          }
        };

        mcpProcess.stdin.write(JSON.stringify(invalidParamsRequest) + '\n');
      });

      const response = await validationPromise;
      // Should return error for missing parameters
      expect(response.error || (response.result && response.result[0].text.includes('Error'))).toBeTruthy();
    }, timeout);

    it('should validate test_github_pr parameters', async () => {
      const validationPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('GitHub PR validation timeout'));
        }, 10000);

        let stdout = '';

        const dataHandler = (data) => {
          stdout += data.toString();
          
          try {
            const lines = stdout.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const response = JSON.parse(line);
              if (response.id === 'github-pr-validation-test') {
                clearTimeout(timeoutId);
                mcpProcess.stdout.off('data', dataHandler);
                resolve(response);
              }
            }
          } catch (e) {
            // Continue parsing
          }
        };

        mcpProcess.stdout.on('data', dataHandler);

        // Test with missing required parameters
        const invalidGitHubRequest = {
          jsonrpc: '2.0',
          id: 'github-pr-validation-test',
          method: 'tools/call',
          params: {
            name: 'test_github_pr',
            arguments: {
              // Missing required parameters
              headless_browser: true
            }
          }
        };

        mcpProcess.stdin.write(JSON.stringify(invalidGitHubRequest) + '\n');
      });

      const response = await validationPromise;
      // Should return error for missing parameters
      expect(response.error || (response.result && response.result[0].text.includes('Error'))).toBeTruthy();
    }, timeout);
  });
});

