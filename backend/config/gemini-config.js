/**
 * Gemini API Configuration
 * Configures Google Gemini API with no safety settings as requested
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('../logger');

class GeminiConfig {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    this.temperature = parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7;
    this.maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS) || 8192;
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    logger.info('Gemini API configured', { 
      model: this.model, 
      temperature: this.temperature,
      maxTokens: this.maxTokens 
    });
  }

  /**
   * Get Gemini model instance with no safety settings
   * @returns {Object} Configured Gemini model
   */
  getModel() {
    return this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        topP: 0.95,
        topK: 64,
      },
      // NO SAFETY SETTINGS - As requested by user
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
  }

  /**
   * Get configuration for chat sessions
   * @returns {Object} Chat configuration
   */
  getChatConfig() {
    return {
      history: [],
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        topP: 0.95,
        topK: 64,
      },
    };
  }
}

module.exports = GeminiConfig;

