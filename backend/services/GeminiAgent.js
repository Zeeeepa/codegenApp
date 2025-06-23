/**
 * Base Gemini Agent Service
 * Foundation class for all AI agents using Google Gemini API
 * Configured with NO SAFETY SETTINGS as requested
 */

const GeminiConfig = require('../config/gemini-config');
const logger = require('../logger');

class GeminiAgent {
  constructor(agentName = 'BaseAgent', systemPrompt = '') {
    this.agentName = agentName;
    this.systemPrompt = systemPrompt;
    this.config = new GeminiConfig();
    this.model = this.config.getModel();
    this.conversationHistory = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    logger.info(`${this.agentName} initialized`, {
      model: this.config.model,
      systemPrompt: systemPrompt ? 'Set' : 'None'
    });
  }

  /**
   * Generate response from Gemini API
   * @param {string} prompt - User prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // Prepare the full prompt with system context
      const fullPrompt = this.systemPrompt 
        ? `${this.systemPrompt}\n\nUser: ${prompt}`
        : prompt;

      logger.info(`${this.agentName} generating response`, {
        promptLength: fullPrompt.length,
        options
      });

      // Generate response with retry logic
      const response = await this.generateWithRetry(fullPrompt, options);
      
      // Store in conversation history
      this.conversationHistory.push({
        timestamp: new Date().toISOString(),
        prompt: prompt,
        response: response,
        duration: Date.now() - startTime
      });

      logger.info(`${this.agentName} response generated`, {
        responseLength: response.length,
        duration: Date.now() - startTime
      });

      return response;
    } catch (error) {
      logger.error(`${this.agentName} generation failed`, {
        error: error.message,
        prompt: prompt.substring(0, 100) + '...',
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Generate response with retry logic
   * @param {string} prompt - Full prompt
   * @param {Object} options - Options
   * @returns {Promise<string>} Generated response
   */
  async generateWithRetry(prompt, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        
        if (!response || !response.text) {
          throw new Error('Empty response from Gemini API');
        }
        
        return response.text();
      } catch (error) {
        lastError = error;
        logger.warn(`${this.agentName} attempt ${attempt} failed`, {
          error: error.message,
          attempt,
          maxRetries: this.maxRetries
        });
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`${this.agentName} failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Start a chat session for multi-turn conversations
   * @returns {Object} Chat session
   */
  async startChatSession() {
    try {
      const chatConfig = this.config.getChatConfig();
      
      // Add system prompt to chat history if provided
      if (this.systemPrompt) {
        chatConfig.history.push({
          role: 'user',
          parts: [{ text: this.systemPrompt }]
        });
        chatConfig.history.push({
          role: 'model',
          parts: [{ text: 'I understand. I\'m ready to assist you.' }]
        });
      }
      
      const chat = this.model.startChat(chatConfig);
      
      logger.info(`${this.agentName} chat session started`);
      return chat;
    } catch (error) {
      logger.error(`${this.agentName} chat session failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send message in chat session
   * @param {Object} chat - Chat session
   * @param {string} message - Message to send
   * @returns {Promise<string>} Response
   */
  async sendChatMessage(chat, message) {
    try {
      const result = await chat.sendMessage(message);
      const response = result.response.text();
      
      logger.info(`${this.agentName} chat message sent`, {
        messageLength: message.length,
        responseLength: response.length
      });
      
      return response;
    } catch (error) {
      logger.error(`${this.agentName} chat message failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    logger.info(`${this.agentName} conversation history cleared`);
  }

  /**
   * Get agent statistics
   * @returns {Object} Agent statistics
   */
  getStats() {
    const totalConversations = this.conversationHistory.length;
    const totalDuration = this.conversationHistory.reduce((sum, conv) => sum + conv.duration, 0);
    const avgDuration = totalConversations > 0 ? totalDuration / totalConversations : 0;
    
    return {
      agentName: this.agentName,
      totalConversations,
      totalDuration,
      avgDuration,
      model: this.config.model,
      lastActivity: totalConversations > 0 
        ? this.conversationHistory[totalConversations - 1].timestamp 
        : null
    };
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and sanitize input
   * @param {string} input - Input to validate
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Basic sanitization - remove excessive whitespace
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Format response for API
   * @param {string} response - Raw response
   * @returns {Object} Formatted response
   */
  formatResponse(response) {
    return {
      agent: this.agentName,
      response: response,
      timestamp: new Date().toISOString(),
      model: this.config.model,
      conversationId: this.conversationHistory.length
    };
  }
}

module.exports = GeminiAgent;

