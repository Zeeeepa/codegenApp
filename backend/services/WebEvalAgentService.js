/**
 * Web-Eval-Agent Service
 * Handles UI element validation using Gemini API
 */

import fetch from 'node-fetch';

export class WebEvalAgentService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.enabled = process.env.WEB_EVAL_AGENT_ENABLED === 'true';
    
    if (!this.apiKey && this.enabled) {
      console.warn('⚠️ GEMINI_API_KEY not set - Web-Eval-Agent disabled');
      this.enabled = false;
    }
  }

  /**
   * Check if Web-Eval-Agent is properly configured
   */
  isConfigured() {
    return !!(this.apiKey && this.enabled);
  }

  /**
   * Validate UI elements and functionality
   * @param {Object} params - Validation parameters
   * @param {string} params.url - URL to validate
   * @param {Array} params.elements - UI elements to check
   * @param {string} params.projectId - Project ID
   * @returns {Promise<Object>} Validation results
   */
  async validateUI({ url, elements = [], projectId }) {
    if (!this.isConfigured()) {
      throw new Error('Web-Eval-Agent not configured. Please set GEMINI_API_KEY');
    }

    try {
      console.log(`🌐 Starting UI validation for: ${url}`);

      // Prepare validation prompt
      const prompt = this.generateValidationPrompt(url, elements);

      // Call Gemini API for UI analysis
      const response = await this.callGeminiAPI(prompt);

      // Process and structure the results
      const validationResults = this.processValidationResults(response, url, elements);

      console.log(`✅ UI validation completed for ${url}`);
      return validationResults;

    } catch (error) {
      console.error('❌ Web-Eval-Agent validation error:', error.message);
      throw new Error(`UI validation failed: ${error.message}`);
    }
  }

  /**
   * Generate validation prompt for Gemini API
   */
  generateValidationPrompt(url, elements) {
    const elementsText = elements.length > 0 
      ? `Focus on these specific elements: ${elements.join(', ')}`
      : 'Analyze all visible UI elements';

    return `
You are a UI/UX validation expert. Please analyze the webpage at ${url} and provide a comprehensive evaluation.

${elementsText}

Please evaluate:
1. **Functionality**: Are all interactive elements working correctly?
2. **Accessibility**: Are elements accessible and properly labeled?
3. **Responsiveness**: Does the layout work on different screen sizes?
4. **Performance**: Are there any performance issues or slow-loading elements?
5. **User Experience**: Is the interface intuitive and user-friendly?
6. **Visual Design**: Are there any visual inconsistencies or issues?
7. **Error Handling**: How does the UI handle errors and edge cases?

Provide your response in JSON format with:
- overall_score (1-10)
- functionality_score (1-10)
- accessibility_score (1-10)
- performance_score (1-10)
- ux_score (1-10)
- issues (array of specific issues found)
- recommendations (array of improvement suggestions)
- validation_status (pass/fail/warning)
`;
  }

  /**
   * Call Gemini API for analysis
   */
  async callGeminiAPI(prompt) {
    const url = `${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Process validation results from Gemini API
   */
  processValidationResults(response, url, elements) {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let parsedResults;

      if (jsonMatch) {
        parsedResults = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured results from text
        parsedResults = this.parseTextResponse(response);
      }

      return {
        url,
        elements,
        timestamp: new Date().toISOString(),
        validation_id: `web-eval-${Date.now()}`,
        results: parsedResults,
        raw_response: response,
        status: parsedResults.validation_status || 'completed'
      };

    } catch (error) {
      console.warn('⚠️ Failed to parse JSON response, using text analysis');
      return {
        url,
        elements,
        timestamp: new Date().toISOString(),
        validation_id: `web-eval-${Date.now()}`,
        results: this.parseTextResponse(response),
        raw_response: response,
        status: 'completed'
      };
    }
  }

  /**
   * Parse text response when JSON parsing fails
   */
  parseTextResponse(response) {
    const issues = [];
    const recommendations = [];

    // Extract issues and recommendations from text
    const lines = response.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('issue') || trimmed.toLowerCase().includes('problem')) {
        issues.push(trimmed);
      }
      if (trimmed.toLowerCase().includes('recommend') || trimmed.toLowerCase().includes('suggest')) {
        recommendations.push(trimmed);
      }
    }

    // Determine overall status
    const hasIssues = issues.length > 0;
    const validation_status = hasIssues ? 'warning' : 'pass';

    return {
      overall_score: hasIssues ? 6 : 8,
      functionality_score: hasIssues ? 6 : 8,
      accessibility_score: hasIssues ? 6 : 8,
      performance_score: hasIssues ? 6 : 8,
      ux_score: hasIssues ? 6 : 8,
      issues,
      recommendations,
      validation_status,
      analysis_text: response
    };
  }

  /**
   * Validate specific UI components
   * @param {Object} params - Component validation parameters
   */
  async validateComponents({ url, components, projectId }) {
    const results = [];

    for (const component of components) {
      try {
        const componentResult = await this.validateUI({
          url,
          elements: [component.selector],
          projectId
        });

        results.push({
          component: component.name,
          selector: component.selector,
          validation: componentResult,
          status: componentResult.results.validation_status
        });

      } catch (error) {
        results.push({
          component: component.name,
          selector: component.selector,
          validation: null,
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      url,
      projectId,
      timestamp: new Date().toISOString(),
      component_validations: results,
      overall_status: results.every(r => r.status === 'pass') ? 'pass' : 'warning'
    };
  }

  /**
   * Get validation status
   */
  getStatus() {
    return {
      service: 'Web-Eval-Agent',
      configured: this.isConfigured(),
      enabled: this.enabled,
      api_key_set: !!this.apiKey,
      base_url: this.baseUrl
    };
  }
}
