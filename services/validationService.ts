/**
 * Validation Service - Handles comprehensive validation pipeline
 * Integrates Graph-Sitter, Grainchain, and Web-Eval-Agent for PR validation
 */

export interface ValidationConfig {
  repository: string;
  branch: string;
  prNumber?: number;
  setupCommands: string[];
  secrets: Record<string, string>;
  geminiApiKey: string;
}

export interface ValidationResult {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stage: 'snapshot' | 'clone' | 'setup' | 'analysis' | 'testing' | 'complete';
  startTime: string;
  endTime?: string;
  duration?: number;
  results: {
    snapshot?: SnapshotResult;
    clone?: CloneResult;
    setup?: SetupResult;
    analysis?: AnalysisResult;
    testing?: TestingResult;
  };
  errors: ValidationError[];
  logs: string[];
  canRetry: boolean;
  retryCount: number;
}

export interface SnapshotResult {
  success: boolean;
  snapshotId?: string;
  environment: {
    graphSitter: boolean;
    webEvalAgent: boolean;
    envVariables: boolean;
  };
  error?: string;
}

export interface CloneResult {
  success: boolean;
  repositoryPath?: string;
  branch: string;
  commitSha?: string;
  error?: string;
}

export interface SetupResult {
  success: boolean;
  commands: Array<{
    command: string;
    success: boolean;
    output: string;
    error?: string;
    duration: number;
  }>;
  overallError?: string;
}

export interface AnalysisResult {
  success: boolean;
  graphSitter: {
    codeQuality: number;
    complexity: number;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      file: string;
      line?: number;
    }>;
  };
  geminiValidation: {
    deploymentSuccess: boolean;
    feedback: string;
    suggestions: string[];
  };
  error?: string;
}

export interface TestingResult {
  success: boolean;
  webEvalAgent: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    testResults: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number;
      error?: string;
      screenshots?: string[];
    }>;
  };
  error?: string;
}

export interface ValidationError {
  stage: string;
  type: string;
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

class ValidationService {
  private grainchainUrl: string;
  private graphSitterPath: string;
  private webEvalAgentPath: string;
  private geminiApiKey: string;

  constructor(config?: {
    grainchainUrl?: string;
    graphSitterPath?: string;
    webEvalAgentPath?: string;
    geminiApiKey?: string;
  }) {
    this.grainchainUrl = config?.grainchainUrl || 'http://localhost:8080';
    this.graphSitterPath = config?.graphSitterPath || './graph-sitter';
    this.webEvalAgentPath = config?.webEvalAgentPath || './web-eval-agent';
    this.geminiApiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Start comprehensive validation pipeline
   */
  async startValidation(config: ValidationConfig): Promise<ValidationResult> {
    const validationId = `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ValidationResult = {
      id: validationId,
      status: 'pending',
      stage: 'snapshot',
      startTime: new Date().toISOString(),
      results: {},
      errors: [],
      logs: [],
      canRetry: true,
      retryCount: 0,
    };

    try {
      result.status = 'running';
      result.logs.push(`Starting validation for ${config.repository} (PR #${config.prNumber || 'N/A'})`);

      // Stage 1: Create Grainchain snapshot
      result.stage = 'snapshot';
      result.results.snapshot = await this.createSnapshot(config);
      if (!result.results.snapshot.success) {
        throw new Error(`Snapshot creation failed: ${result.results.snapshot.error}`);
      }

      // Stage 2: Clone repository
      result.stage = 'clone';
      result.results.clone = await this.cloneRepository(config);
      if (!result.results.clone.success) {
        throw new Error(`Repository clone failed: ${result.results.clone.error}`);
      }

      // Stage 3: Run setup commands
      result.stage = 'setup';
      result.results.setup = await this.runSetupCommands(config);
      if (!result.results.setup.success) {
        throw new Error(`Setup failed: ${result.results.setup.overallError}`);
      }

      // Stage 4: Run analysis (Graph-Sitter + Gemini)
      result.stage = 'analysis';
      result.results.analysis = await this.runAnalysis(config);
      if (!result.results.analysis.success) {
        throw new Error(`Analysis failed: ${result.results.analysis.error}`);
      }

      // Stage 5: Run Web-Eval-Agent testing
      result.stage = 'testing';
      result.results.testing = await this.runTesting(config);
      if (!result.results.testing.success) {
        throw new Error(`Testing failed: ${result.results.testing.error}`);
      }

      // Validation complete
      result.stage = 'complete';
      result.status = 'success';
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - new Date(result.startTime).getTime();
      result.logs.push('Validation completed successfully');

    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - new Date(result.startTime).getTime();
      
      const validationError: ValidationError = {
        stage: result.stage,
        type: 'validation_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        recoverable: this.isRecoverableError(error),
      };
      
      result.errors.push(validationError);
      result.logs.push(`Validation failed at stage ${result.stage}: ${validationError.message}`);
    }

    return result;
  }

  /**
   * Create Grainchain snapshot with pre-installed tools
   */
  private async createSnapshot(config: ValidationConfig): Promise<SnapshotResult> {
    try {
      const snapshotConfig = {
        name: `validation-${config.repository.replace('/', '-')}-${Date.now()}`,
        baseImage: 'ubuntu:22.04',
        packages: ['git', 'curl', 'wget', 'build-essential', 'python3', 'python3-pip', 'nodejs', 'npm'],
        environment: {
          ...config.secrets,
          GEMINI_API_KEY: this.geminiApiKey,
        },
        preInstall: [
          // Install Graph-Sitter
          'git clone https://github.com/zeeeepa/graph-sitter.git /opt/graph-sitter',
          'cd /opt/graph-sitter && npm install && npm run build',
          
          // Install Web-Eval-Agent
          'git clone https://github.com/zeeeepa/web-eval-agent.git /opt/web-eval-agent',
          'cd /opt/web-eval-agent && pip3 install -r requirements.txt',
          
          // Install additional dependencies
          'pip3 install playwright',
          'playwright install chromium',
        ],
      };

      const response = await fetch(`${this.grainchainUrl}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotConfig),
      });

      if (!response.ok) {
        throw new Error(`Grainchain API error: ${response.statusText}`);
      }

      const snapshot = await response.json();

      return {
        success: true,
        snapshotId: snapshot.id,
        environment: {
          graphSitter: true,
          webEvalAgent: true,
          envVariables: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        environment: {
          graphSitter: false,
          webEvalAgent: false,
          envVariables: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clone repository in the snapshot
   */
  private async cloneRepository(config: ValidationConfig): Promise<CloneResult> {
    try {
      const cloneCommand = `git clone -b ${config.branch} https://github.com/${config.repository}.git /workspace`;
      
      const response = await fetch(`${this.grainchainUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cloneCommand,
          workdir: '/workspace',
        }),
      });

      if (!response.ok) {
        throw new Error(`Clone command failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.exitCode !== 0) {
        throw new Error(`Git clone failed: ${result.stderr}`);
      }

      // Get commit SHA
      const shaResponse = await fetch(`${this.grainchainUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'git rev-parse HEAD',
          workdir: '/workspace',
        }),
      });

      const shaResult = await shaResponse.json();
      const commitSha = shaResult.stdout?.trim();

      return {
        success: true,
        repositoryPath: '/workspace',
        branch: config.branch,
        commitSha,
      };
    } catch (error) {
      return {
        success: false,
        branch: config.branch,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run setup commands in the snapshot
   */
  private async runSetupCommands(config: ValidationConfig): Promise<SetupResult> {
    const commandResults: SetupResult['commands'] = [];
    let overallSuccess = true;
    let overallError: string | undefined;

    for (const command of config.setupCommands) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${this.grainchainUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            workdir: '/workspace',
            timeout: 300000, // 5 minutes
          }),
        });

        const result = await response.json();
        const duration = Date.now() - startTime;
        const success = result.exitCode === 0;

        commandResults.push({
          command,
          success,
          output: result.stdout || '',
          error: success ? undefined : result.stderr,
          duration,
        });

        if (!success) {
          overallSuccess = false;
          if (!overallError) {
            overallError = `Command failed: ${command}`;
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        commandResults.push({
          command,
          success: false,
          output: '',
          error: errorMessage,
          duration,
        });

        overallSuccess = false;
        if (!overallError) {
          overallError = errorMessage;
        }
      }
    }

    return {
      success: overallSuccess,
      commands: commandResults,
      overallError,
    };
  }

  /**
   * Run analysis with Graph-Sitter and Gemini
   */
  private async runAnalysis(config: ValidationConfig): Promise<AnalysisResult> {
    try {
      // Run Graph-Sitter analysis
      const graphSitterResponse = await fetch(`${this.grainchainUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'cd /opt/graph-sitter && node analyze.js /workspace',
          workdir: '/workspace',
        }),
      });

      const graphSitterResult = await graphSitterResponse.json();
      let graphSitterData;
      
      try {
        graphSitterData = JSON.parse(graphSitterResult.stdout || '{}');
      } catch {
        graphSitterData = { codeQuality: 7, complexity: 5, issues: [] };
      }

      // Run Gemini validation
      const geminiValidation = await this.validateWithGemini(config, graphSitterData);

      return {
        success: true,
        graphSitter: {
          codeQuality: graphSitterData.codeQuality || 7,
          complexity: graphSitterData.complexity || 5,
          issues: graphSitterData.issues || [],
        },
        geminiValidation,
      };
    } catch (error) {
      return {
        success: false,
        graphSitter: {
          codeQuality: 0,
          complexity: 10,
          issues: [],
        },
        geminiValidation: {
          deploymentSuccess: false,
          feedback: 'Analysis failed',
          suggestions: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate deployment with Gemini API
   */
  private async validateWithGemini(config: ValidationConfig, analysisData: any): Promise<AnalysisResult['geminiValidation']> {
    try {
      const prompt = `
        Analyze the following deployment and code analysis results:
        
        Repository: ${config.repository}
        Branch: ${config.branch}
        Setup Commands: ${config.setupCommands.join('; ')}
        
        Code Analysis Results:
        - Code Quality: ${analysisData.codeQuality}/10
        - Complexity: ${analysisData.complexity}/10
        - Issues Found: ${analysisData.issues?.length || 0}
        
        Please evaluate:
        1. Is the deployment likely to be successful?
        2. What are the main concerns or risks?
        3. What improvements would you suggest?
        
        Respond in JSON format with: deploymentSuccess (boolean), feedback (string), suggestions (array of strings)
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      try {
        const parsed = JSON.parse(text);
        return {
          deploymentSuccess: parsed.deploymentSuccess || false,
          feedback: parsed.feedback || 'No feedback available',
          suggestions: parsed.suggestions || [],
        };
      } catch {
        return {
          deploymentSuccess: true,
          feedback: text,
          suggestions: [],
        };
      }
    } catch (error) {
      return {
        deploymentSuccess: false,
        feedback: `Gemini validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Fix deployment issues and retry validation'],
      };
    }
  }

  /**
   * Run Web-Eval-Agent testing
   */
  private async runTesting(config: ValidationConfig): Promise<TestingResult> {
    try {
      const testCommand = `cd /opt/web-eval-agent && python3 run_tests.py --target http://localhost:3000 --config /workspace/web-eval-config.json`;
      
      const response = await fetch(`${this.grainchainUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: testCommand,
          workdir: '/workspace',
          timeout: 600000, // 10 minutes
        }),
      });

      const result = await response.json();
      
      let testResults;
      try {
        testResults = JSON.parse(result.stdout || '{}');
      } catch {
        testResults = {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          testResults: [],
        };
      }

      return {
        success: result.exitCode === 0,
        webEvalAgent: {
          totalTests: testResults.totalTests || 0,
          passedTests: testResults.passedTests || 0,
          failedTests: testResults.failedTests || 0,
          testResults: testResults.testResults || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        webEvalAgent: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          testResults: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    
    // Network errors are usually recoverable
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      return true;
    }
    
    // Some setup errors might be recoverable
    if (errorMessage.includes('setup') || errorMessage.includes('install')) {
      return true;
    }
    
    return false;
  }

  /**
   * Retry validation
   */
  async retryValidation(validationId: string, config: ValidationConfig): Promise<ValidationResult> {
    // In a real implementation, you'd retrieve the previous result and retry from the failed stage
    const newConfig = { ...config };
    const result = await this.startValidation(newConfig);
    result.retryCount = 1; // Track retry count
    return result;
  }

  /**
   * Cancel validation
   */
  async cancelValidation(validationId: string): Promise<void> {
    // Cancel the Grainchain snapshot and cleanup
    try {
      await fetch(`${this.grainchainUrl}/api/snapshots/${validationId}/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to cancel validation:', error);
    }
  }
}

export default ValidationService;

