/**
 * Grainchain Service Implementation
 * 
 * This service provides local sandboxing capabilities for secure code execution
 * and testing environments using containerization and isolation techniques.
 */

export interface SandboxEnvironment {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopped' | 'failed' | 'destroyed';
  created_at: string;
  updated_at: string;
  config: {
    image: string;
    ports: number[];
    environment_variables: Record<string, string>;
    volumes: string[];
    memory_limit: string;
    cpu_limit: string;
    timeout_minutes: number;
  };
  metadata: {
    repository?: string;
    branch?: string;
    commit_sha?: string;
    pr_number?: number;
    purpose: 'testing' | 'development' | 'validation' | 'demo';
  };
  network: {
    internal_ip?: string;
    external_ports?: Record<number, number>;
    health_check_url?: string;
  };
  logs: string[];
  error?: string;
}

export interface SandboxExecutionResult {
  id: string;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timestamp: string;
}

export interface CreateSandboxRequest {
  name: string;
  image?: string;
  repository?: string;
  branch?: string;
  commit_sha?: string;
  environment_variables?: Record<string, string>;
  ports?: number[];
  purpose?: 'testing' | 'development' | 'validation' | 'demo';
  timeout_minutes?: number;
}

export interface ExecuteCommandRequest {
  sandbox_id: string;
  command: string;
  working_directory?: string;
  timeout_seconds?: number;
  environment?: Record<string, string>;
}

class GrainchainService {
  private sandboxes: Map<string, SandboxEnvironment> = new Map();
  private executionHistory: Map<string, SandboxExecutionResult[]> = new Map();
  private maxConcurrentSandboxes: number;
  private sandboxBaseDir: string;
  private defaultTimeout: number;

  constructor() {
    this.maxConcurrentSandboxes = parseInt(process.env.GRAINCHAIN_MAX_CONTAINERS || '5');
    this.sandboxBaseDir = process.env.GRAINCHAIN_SANDBOX_DIR || '/tmp/grainchain-sandbox';
    this.defaultTimeout = parseInt(process.env.GRAINCHAIN_TIMEOUT_MINUTES || '30');
    
    // Initialize sandbox directory
    this.initializeSandboxDirectory();
  }

  private async initializeSandboxDirectory(): Promise<void> {
    try {
      // In a real implementation, this would create the sandbox directory
      console.log(`Initializing sandbox directory: ${this.sandboxBaseDir}`);
    } catch (error) {
      console.error('Failed to initialize sandbox directory:', error);
    }
  }

  private generateSandboxId(): string {
    return `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new sandbox environment
   */
  async createSandbox(request: CreateSandboxRequest): Promise<string> {
    // Check if we've reached the maximum number of concurrent sandboxes
    const runningSandboxes = Array.from(this.sandboxes.values())
      .filter(s => s.status === 'running' || s.status === 'creating');
    
    if (runningSandboxes.length >= this.maxConcurrentSandboxes) {
      throw new Error(`Maximum number of concurrent sandboxes (${this.maxConcurrentSandboxes}) reached`);
    }

    const sandboxId = this.generateSandboxId();
    const now = new Date().toISOString();

    const sandbox: SandboxEnvironment = {
      id: sandboxId,
      name: request.name,
      status: 'creating',
      created_at: now,
      updated_at: now,
      config: {
        image: request.image || 'node:18-alpine',
        ports: request.ports || [3000],
        environment_variables: {
          NODE_ENV: 'development',
          PORT: '3000',
          ...request.environment_variables,
        },
        volumes: [`${this.sandboxBaseDir}/${sandboxId}:/workspace`],
        memory_limit: '512m',
        cpu_limit: '0.5',
        timeout_minutes: request.timeout_minutes || this.defaultTimeout,
      },
      metadata: {
        repository: request.repository,
        branch: request.branch,
        commit_sha: request.commit_sha,
        purpose: request.purpose || 'testing',
      },
      network: {},
      logs: [],
    };

    this.sandboxes.set(sandboxId, sandbox);
    this.executionHistory.set(sandboxId, []);

    // Start sandbox creation asynchronously
    this.createSandboxContainer(sandboxId).catch(error => {
      console.error(`Failed to create sandbox ${sandboxId}:`, error);
      const failedSandbox = this.sandboxes.get(sandboxId);
      if (failedSandbox) {
        failedSandbox.status = 'failed';
        failedSandbox.error = error.message;
        failedSandbox.updated_at = new Date().toISOString();
      }
    });

    return sandboxId;
  }

  private async createSandboxContainer(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return;

    try {
      console.log(`Creating sandbox container: ${sandboxId}`);
      
      // Simulate container creation process
      sandbox.logs.push(`[${new Date().toISOString()}] Creating sandbox environment...`);
      
      // Step 1: Pull image (simulated)
      await new Promise(resolve => setTimeout(resolve, 2000));
      sandbox.logs.push(`[${new Date().toISOString()}] Pulling image: ${sandbox.config.image}`);
      
      // Step 2: Create container (simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      sandbox.logs.push(`[${new Date().toISOString()}] Creating container...`);
      
      // Step 3: Start container (simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      sandbox.logs.push(`[${new Date().toISOString()}] Starting container...`);
      
      // Step 4: Setup networking (simulated)
      const externalPort = 3000 + Math.floor(Math.random() * 1000);
      sandbox.network = {
        internal_ip: `172.17.0.${Math.floor(Math.random() * 254) + 2}`,
        external_ports: { 3000: externalPort },
        health_check_url: `http://localhost:${externalPort}/health`,
      };
      
      sandbox.logs.push(`[${new Date().toISOString()}] Container accessible at port ${externalPort}`);
      
      // Step 5: Clone repository if specified (simulated)
      if (sandbox.metadata.repository) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        sandbox.logs.push(`[${new Date().toISOString()}] Cloning repository: ${sandbox.metadata.repository}`);
        
        if (sandbox.metadata.branch) {
          sandbox.logs.push(`[${new Date().toISOString()}] Checking out branch: ${sandbox.metadata.branch}`);
        }
      }
      
      // Step 6: Install dependencies (simulated)
      await new Promise(resolve => setTimeout(resolve, 3000));
      sandbox.logs.push(`[${new Date().toISOString()}] Installing dependencies...`);
      
      // Step 7: Health check (simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
      sandbox.logs.push(`[${new Date().toISOString()}] Running health check...`);
      
      sandbox.status = 'running';
      sandbox.updated_at = new Date().toISOString();
      sandbox.logs.push(`[${new Date().toISOString()}] Sandbox is ready!`);
      
      console.log(`Sandbox ${sandboxId} created successfully`);
      
      // Set up automatic cleanup
      setTimeout(() => {
        this.destroySandbox(sandboxId).catch(error => {
          console.error(`Failed to auto-cleanup sandbox ${sandboxId}:`, error);
        });
      }, sandbox.config.timeout_minutes * 60 * 1000);
      
    } catch (error) {
      sandbox.status = 'failed';
      sandbox.error = error instanceof Error ? error.message : 'Unknown error';
      sandbox.updated_at = new Date().toISOString();
      sandbox.logs.push(`[${new Date().toISOString()}] ERROR: ${sandbox.error}`);
      throw error;
    }
  }

  /**
   * Execute a command in a sandbox
   */
  async executeCommand(request: ExecuteCommandRequest): Promise<SandboxExecutionResult> {
    const sandbox = this.sandboxes.get(request.sandbox_id);
    if (!sandbox) {
      throw new Error(`Sandbox ${request.sandbox_id} not found`);
    }

    if (sandbox.status !== 'running') {
      throw new Error(`Sandbox ${request.sandbox_id} is not running (status: ${sandbox.status})`);
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    console.log(`Executing command in sandbox ${request.sandbox_id}: ${request.command}`);
    
    try {
      // Simulate command execution
      const timeout = request.timeout_seconds || 30;
      const executionTime = Math.min(Math.random() * 5000 + 1000, timeout * 1000); // 1-5 seconds or timeout
      
      await new Promise(resolve => setTimeout(resolve, executionTime));
      
      // Simulate command results
      const isSuccess = Math.random() > 0.1; // 90% success rate
      const exitCode = isSuccess ? 0 : 1;
      
      const result: SandboxExecutionResult = {
        id: executionId,
        command: request.command,
        exit_code: exitCode,
        stdout: isSuccess 
          ? `Command executed successfully\nOutput from: ${request.command}\nWorking directory: ${request.working_directory || '/workspace'}`
          : '',
        stderr: isSuccess 
          ? '' 
          : `Error executing command: ${request.command}\nCommand failed with exit code 1`,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      // Store execution history
      const history = this.executionHistory.get(request.sandbox_id) || [];
      history.push(result);
      this.executionHistory.set(request.sandbox_id, history);

      // Update sandbox logs
      sandbox.logs.push(`[${result.timestamp}] Executed: ${request.command} (exit code: ${exitCode})`);
      sandbox.updated_at = new Date().toISOString();

      return result;
      
    } catch (error) {
      const result: SandboxExecutionResult = {
        id: executionId,
        command: request.command,
        exit_code: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      // Store execution history
      const history = this.executionHistory.get(request.sandbox_id) || [];
      history.push(result);
      this.executionHistory.set(request.sandbox_id, history);

      return result;
    }
  }

  /**
   * Get sandbox information
   */
  async getSandbox(sandboxId: string): Promise<SandboxEnvironment | null> {
    return this.sandboxes.get(sandboxId) || null;
  }

  /**
   * List all sandboxes
   */
  async listSandboxes(options: {
    status?: string;
    purpose?: string;
    repository?: string;
  } = {}): Promise<SandboxEnvironment[]> {
    let sandboxes = Array.from(this.sandboxes.values());

    if (options.status) {
      sandboxes = sandboxes.filter(s => s.status === options.status);
    }

    if (options.purpose) {
      sandboxes = sandboxes.filter(s => s.metadata.purpose === options.purpose);
    }

    if (options.repository) {
      sandboxes = sandboxes.filter(s => s.metadata.repository === options.repository);
    }

    return sandboxes;
  }

  /**
   * Get execution history for a sandbox
   */
  async getExecutionHistory(sandboxId: string): Promise<SandboxExecutionResult[]> {
    return this.executionHistory.get(sandboxId) || [];
  }

  /**
   * Stop a sandbox
   */
  async stopSandbox(sandboxId: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    if (sandbox.status !== 'running') return false;

    try {
      console.log(`Stopping sandbox: ${sandboxId}`);
      
      // Simulate stopping container
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      sandbox.status = 'stopped';
      sandbox.updated_at = new Date().toISOString();
      sandbox.logs.push(`[${new Date().toISOString()}] Sandbox stopped`);
      
      return true;
    } catch (error) {
      console.error(`Failed to stop sandbox ${sandboxId}:`, error);
      return false;
    }
  }

  /**
   * Destroy a sandbox (stop and remove)
   */
  async destroySandbox(sandboxId: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    try {
      console.log(`Destroying sandbox: ${sandboxId}`);
      
      // Stop if running
      if (sandbox.status === 'running') {
        await this.stopSandbox(sandboxId);
      }
      
      // Simulate container removal
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      sandbox.status = 'destroyed';
      sandbox.updated_at = new Date().toISOString();
      sandbox.logs.push(`[${new Date().toISOString()}] Sandbox destroyed`);
      
      // Clean up after a delay to allow final status checks
      setTimeout(() => {
        this.sandboxes.delete(sandboxId);
        this.executionHistory.delete(sandboxId);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to destroy sandbox ${sandboxId}:`, error);
      return false;
    }
  }

  /**
   * Get sandbox statistics
   */
  async getStats(): Promise<{
    total: number;
    running: number;
    stopped: number;
    failed: number;
    creating: number;
    max_concurrent: number;
    total_executions: number;
  }> {
    const sandboxes = Array.from(this.sandboxes.values());
    const totalExecutions = Array.from(this.executionHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    return {
      total: sandboxes.length,
      running: sandboxes.filter(s => s.status === 'running').length,
      stopped: sandboxes.filter(s => s.status === 'stopped').length,
      failed: sandboxes.filter(s => s.status === 'failed').length,
      creating: sandboxes.filter(s => s.status === 'creating').length,
      max_concurrent: this.maxConcurrentSandboxes,
      total_executions: totalExecutions,
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can create sandbox directories
      // Check if Docker/container runtime is available
      // For now, just return true
      return true;
    } catch (error) {
      console.error('Grainchain health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up old/expired sandboxes
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedUp = 0;

    for (const [sandboxId, sandbox] of this.sandboxes.entries()) {
      const age = now - new Date(sandbox.created_at).getTime();
      
      if (age > maxAge || sandbox.status === 'failed') {
        await this.destroySandbox(sandboxId);
        cleanedUp++;
      }
    }

    console.log(`Cleaned up ${cleanedUp} old sandboxes`);
    return cleanedUp;
  }
}

// Singleton instance
let grainchainService: GrainchainService | null = null;

export function getGrainchainService(): GrainchainService {
  if (!grainchainService) {
    grainchainService = new GrainchainService();
  }
  return grainchainService;
}

export default GrainchainService;

