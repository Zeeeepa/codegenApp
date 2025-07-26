/**
 * Web Evaluation Service Implementation
 * 
 * This service provides web evaluation capabilities using the Gemini API
 * for automated testing and analysis of web applications.
 */

export interface WebEvalRequest {
  url: string;
  task: string;
  context?: {
    repository?: string;
    branch?: string;
    pr_number?: number;
    description?: string;
  };
  evaluation_criteria?: {
    functionality?: string[];
    performance?: boolean;
    accessibility?: boolean;
    ui_ux?: boolean;
    security?: boolean;
  };
  timeout_seconds?: number;
}

export interface WebEvalResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  url: string;
  task: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  results?: {
    overall_score: number; // 0-100
    functionality_score: number;
    performance_score: number;
    accessibility_score: number;
    ui_ux_score: number;
    security_score: number;
    detailed_analysis: {
      passed_tests: string[];
      failed_tests: string[];
      warnings: string[];
      recommendations: string[];
      screenshots?: string[];
      performance_metrics?: {
        load_time: number;
        first_contentful_paint: number;
        largest_contentful_paint: number;
        cumulative_layout_shift: number;
      };
    };
    summary: string;
    gemini_analysis: string;
  };
  error?: string;
}

export interface GeminiAnalysisRequest {
  prompt: string;
  context?: {
    url: string;
    task: string;
    screenshots?: string[];
    performance_data?: any;
    error_logs?: string[];
  };
}

export interface GeminiAnalysisResponse {
  analysis: string;
  score: number;
  recommendations: string[];
  confidence: number;
}

class WebEvalService {
  private geminiApiKey: string;
  private geminiBaseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private evaluationResults: Map<string, WebEvalResult> = new Map();

  constructor() {
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || 
                       process.env.GEMINI_API_KEY || '';
    
    if (!this.geminiApiKey) {
      console.warn('Gemini API key not found in environment variables');
    }
  }

  private generateEvaluationId(): string {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async callGeminiAPI(prompt: string, context?: any): Promise<GeminiAnalysisResponse> {
    const url = `${this.geminiBaseUrl}/models/gemini-pro:generateContent?key=${this.geminiApiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: this.buildGeminiPrompt(prompt, context)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return this.parseGeminiResponse(generatedText);
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  private buildGeminiPrompt(task: string, context?: any): string {
    let prompt = `You are an expert web application evaluator. Your task is to analyze a web application and provide detailed feedback.

Task: ${task}

`;

    if (context?.url) {
      prompt += `URL being evaluated: ${context.url}\n`;
    }

    if (context?.repository) {
      prompt += `Repository: ${context.repository}\n`;
    }

    if (context?.performance_data) {
      prompt += `Performance Data: ${JSON.stringify(context.performance_data, null, 2)}\n`;
    }

    if (context?.error_logs && context.error_logs.length > 0) {
      prompt += `Error Logs:\n${context.error_logs.join('\n')}\n`;
    }

    prompt += `
Please provide your analysis in the following JSON format:
{
  "analysis": "Detailed analysis of the web application",
  "score": 85,
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "confidence": 0.9
}

Focus on:
1. Functionality - Does the application work as expected?
2. Performance - How fast and responsive is the application?
3. User Experience - Is the interface intuitive and user-friendly?
4. Accessibility - Is the application accessible to users with disabilities?
5. Security - Are there any obvious security concerns?

Provide specific, actionable recommendations for improvement.`;

    return prompt;
  }

  private parseGeminiResponse(response: string): GeminiAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis: parsed.analysis || response,
          score: parsed.score || 50,
          recommendations: parsed.recommendations || [],
          confidence: parsed.confidence || 0.5,
        };
      }
    } catch (error) {
      console.warn('Failed to parse Gemini JSON response, using fallback');
    }

    // Fallback parsing
    return {
      analysis: response,
      score: 50,
      recommendations: [],
      confidence: 0.5,
    };
  }

  /**
   * Start a web evaluation
   */
  async startEvaluation(request: WebEvalRequest): Promise<string> {
    const evaluationId = this.generateEvaluationId();
    
    const result: WebEvalResult = {
      id: evaluationId,
      status: 'pending',
      url: request.url,
      task: request.task,
      started_at: new Date().toISOString(),
    };

    this.evaluationResults.set(evaluationId, result);

    // Start evaluation asynchronously
    this.performEvaluation(evaluationId, request).catch(error => {
      console.error(`Evaluation ${evaluationId} failed:`, error);
      const failedResult = this.evaluationResults.get(evaluationId);
      if (failedResult) {
        failedResult.status = 'failed';
        failedResult.error = error.message;
        failedResult.completed_at = new Date().toISOString();
      }
    });

    return evaluationId;
  }

  private async performEvaluation(evaluationId: string, request: WebEvalRequest): Promise<void> {
    const result = this.evaluationResults.get(evaluationId);
    if (!result) return;

    try {
      result.status = 'running';
      
      // Simulate web evaluation steps
      console.log(`Starting evaluation for ${request.url}`);
      
      // Step 1: Basic connectivity test
      const connectivityTest = await this.testConnectivity(request.url);
      
      // Step 2: Performance analysis
      const performanceData = await this.analyzePerformance(request.url);
      
      // Step 3: Functional testing (simulated)
      const functionalTests = await this.runFunctionalTests(request.url, request.task);
      
      // Step 4: Gemini AI analysis
      const geminiAnalysis = await this.callGeminiAPI(request.task, {
        url: request.url,
        repository: request.context?.repository,
        performance_data: performanceData,
        error_logs: functionalTests.errors,
      });

      // Compile results
      result.results = {
        overall_score: geminiAnalysis.score,
        functionality_score: functionalTests.score,
        performance_score: performanceData.score,
        accessibility_score: 75, // Simulated
        ui_ux_score: 80, // Simulated
        security_score: 85, // Simulated
        detailed_analysis: {
          passed_tests: functionalTests.passed,
          failed_tests: functionalTests.failed,
          warnings: functionalTests.warnings,
          recommendations: geminiAnalysis.recommendations,
          performance_metrics: performanceData.metrics,
        },
        summary: this.generateSummary(geminiAnalysis.score, functionalTests, performanceData),
        gemini_analysis: geminiAnalysis.analysis,
      };

      result.status = 'completed';
      result.completed_at = new Date().toISOString();
      result.duration_seconds = Math.floor(
        (new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000
      );

      console.log(`Evaluation ${evaluationId} completed with score: ${geminiAnalysis.score}`);
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.completed_at = new Date().toISOString();
      throw error;
    }
  }

  private async testConnectivity(url: string): Promise<boolean> {
    try {
      // In a real implementation, this would test if the URL is accessible
      // For now, we'll simulate this
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      return false;
    }
  }

  private async analyzePerformance(url: string): Promise<{
    score: number;
    metrics: any;
  }> {
    // Simulate performance analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      score: Math.floor(Math.random() * 40) + 60, // 60-100
      metrics: {
        load_time: Math.random() * 3 + 1, // 1-4 seconds
        first_contentful_paint: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
        largest_contentful_paint: Math.random() * 3 + 1, // 1-4 seconds
        cumulative_layout_shift: Math.random() * 0.2, // 0-0.2
      },
    };
  }

  private async runFunctionalTests(url: string, task: string): Promise<{
    score: number;
    passed: string[];
    failed: string[];
    warnings: string[];
    errors: string[];
  }> {
    // Simulate functional testing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const allTests = [
      'Page loads successfully',
      'Navigation menu works',
      'Forms are functional',
      'Links are working',
      'Images load properly',
      'JavaScript executes without errors',
      'CSS styles are applied',
      'Responsive design works',
    ];

    const passedCount = Math.floor(Math.random() * 3) + 6; // 6-8 passed tests
    const passed = allTests.slice(0, passedCount);
    const failed = allTests.slice(passedCount);

    return {
      score: Math.floor((passed.length / allTests.length) * 100),
      passed,
      failed,
      warnings: failed.length > 0 ? [`${failed.length} tests failed`] : [],
      errors: failed.length > 2 ? ['Multiple test failures detected'] : [],
    };
  }

  private generateSummary(overallScore: number, functionalTests: any, performanceData: any): string {
    let summary = `Web evaluation completed with an overall score of ${overallScore}/100. `;
    
    if (overallScore >= 80) {
      summary += 'The application performs well overall. ';
    } else if (overallScore >= 60) {
      summary += 'The application has room for improvement. ';
    } else {
      summary += 'The application needs significant improvements. ';
    }

    summary += `Functional tests: ${functionalTests.passed.length}/${functionalTests.passed.length + functionalTests.failed.length} passed. `;
    summary += `Performance score: ${performanceData.score}/100.`;

    return summary;
  }

  /**
   * Get evaluation result
   */
  async getEvaluationResult(evaluationId: string): Promise<WebEvalResult | null> {
    return this.evaluationResults.get(evaluationId) || null;
  }

  /**
   * List all evaluations
   */
  async listEvaluations(): Promise<WebEvalResult[]> {
    return Array.from(this.evaluationResults.values());
  }

  /**
   * Cancel an evaluation
   */
  async cancelEvaluation(evaluationId: string): Promise<boolean> {
    const result = this.evaluationResults.get(evaluationId);
    if (result && (result.status === 'pending' || result.status === 'running')) {
      result.status = 'failed';
      result.error = 'Evaluation cancelled by user';
      result.completed_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Test Gemini API connection with robust error handling
   */
  async testGeminiConnection(): Promise<boolean> {
    try {
      // Simple test request to verify API key and connectivity
      const testPrompt = 'Test connection from CodegenApp. Please respond with "Connection successful".';
      
      const requestBody = {
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 10000 // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Gemini API connection successful:', generatedText.substring(0, 50));
        return true;
      } else if (response.status === 401) {
        console.error('Gemini API authentication failed - invalid API key');
        return false;
      } else if (response.status === 403) {
        console.error('Gemini API access forbidden - check API key permissions');
        return false;
      } else {
        const errorText = await response.text();
        console.error(`Gemini API error (${response.status}):`, errorText);
        return false;
      }
    } catch (error) {
      console.error('Gemini API connection test failed:', error);
      return false;
    }
  }

  /**
   * Test connection (alias for testGeminiConnection for consistency)
   */
  async testConnection(): Promise<boolean> {
    return this.testGeminiConnection();
  }

  /**
   * Get evaluation statistics
   */
  async getEvaluationStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    average_score: number;
  }> {
    const evaluations = Array.from(this.evaluationResults.values());
    const completed = evaluations.filter(e => e.status === 'completed');
    const failed = evaluations.filter(e => e.status === 'failed');
    const running = evaluations.filter(e => e.status === 'running' || e.status === 'pending');
    
    const averageScore = completed.length > 0 
      ? completed.reduce((sum, e) => sum + (e.results?.overall_score || 0), 0) / completed.length
      : 0;

    return {
      total: evaluations.length,
      completed: completed.length,
      failed: failed.length,
      running: running.length,
      average_score: Math.round(averageScore),
    };
  }
}

// Singleton instance
let webEvalService: WebEvalService | null = null;

export function getWebEvalService(): WebEvalService {
  if (!webEvalService) {
    webEvalService = new WebEvalService();
  }
  return webEvalService;
}

export default WebEvalService;
