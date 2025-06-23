// Retry utility with exponential backoff and circuit breaker pattern

class RetryError extends Error {
  constructor(message, attempts, lastError) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

// Exponential backoff retry function
export async function retryWithBackoff(
  fn,
  options = {}
) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    jitter = true,
    retryCondition = () => true,
    onRetry = () => {},
    abortSignal = null
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        throw new Error('Operation aborted');
      }

      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry if we've reached max attempts
      if (attempt >= maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!retryCondition(error, attempt)) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms delay:`, error.message);
      
      // Call retry callback
      onRetry(error, attempt, delay);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new RetryError(
    `Failed after ${attempt} attempts: ${lastError.message}`,
    attempt,
    lastError
  );
}

// Specific retry function for automation requests
export async function retryAutomationRequest(requestFn, options = {}) {
  const defaultOptions = {
    maxAttempts: 3,
    baseDelay: 2000, // Start with 2 seconds
    maxDelay: 30000, // Max 30 seconds
    backoffFactor: 2,
    retryCondition: (error, attempt) => {
      // Retry on network errors, timeouts, and 5xx server errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true; // Network error
      }
      if (error.message.includes('timeout')) {
        return true; // Timeout error
      }
      if (error.message.includes('503') || error.message.includes('502') || error.message.includes('504')) {
        return true; // Server errors
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return true; // Connection errors
      }
      return false; // Don't retry client errors (4xx) or other errors
    },
    onRetry: (error, attempt, delay) => {
      console.log(`🔄 Retrying automation request (attempt ${attempt}):`, {
        error: error.message,
        delay: Math.round(delay),
        timestamp: new Date().toISOString()
      });
    }
  };

  return retryWithBackoff(requestFn, { ...defaultOptions, ...options });
}

// Circuit breaker for automation service
export const automationCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  monitoringPeriod: 10000 // 10 seconds
});

// Helper function to classify errors
export function classifyError(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('econnrefused') || message.includes('enotfound')) {
    return {
      type: 'NETWORK_ERROR',
      temporary: true,
      retryable: true,
      userMessage: 'Network connection issue. Please check your internet connection.'
    };
  }
  
  if (message.includes('timeout')) {
    return {
      type: 'TIMEOUT_ERROR',
      temporary: true,
      retryable: true,
      userMessage: 'Request timed out. The service may be busy.'
    };
  }
  
  if (message.includes('503') || message.includes('service unavailable')) {
    return {
      type: 'SERVICE_UNAVAILABLE',
      temporary: true,
      retryable: true,
      userMessage: 'Service is temporarily unavailable. Please try again in a moment.'
    };
  }
  
  if (message.includes('502') || message.includes('bad gateway')) {
    return {
      type: 'BAD_GATEWAY',
      temporary: true,
      retryable: true,
      userMessage: 'Gateway error. The service may be restarting.'
    };
  }
  
  if (message.includes('504') || message.includes('gateway timeout')) {
    return {
      type: 'GATEWAY_TIMEOUT',
      temporary: true,
      retryable: true,
      userMessage: 'Gateway timeout. The service is taking too long to respond.'
    };
  }
  
  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return {
      type: 'CLIENT_ERROR',
      temporary: false,
      retryable: false,
      userMessage: 'Request error. Please check your input and try again.'
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    temporary: false,
    retryable: false,
    userMessage: 'An unexpected error occurred. Please try again or contact support.'
  };
}

// Helper function to determine if fallback should be used
export function shouldUseFallback(error, circuitBreakerState) {
  const errorClassification = classifyError(error);
  
  // Use fallback if circuit breaker is open
  if (circuitBreakerState.state === 'OPEN') {
    return {
      useFallback: true,
      reason: 'Circuit breaker is open - service is temporarily unavailable'
    };
  }
  
  // Use fallback for non-retryable errors
  if (!errorClassification.retryable) {
    return {
      useFallback: true,
      reason: errorClassification.userMessage
    };
  }
  
  // Use fallback if we've had too many recent failures
  if (circuitBreakerState.failureCount >= 2) {
    return {
      useFallback: true,
      reason: 'Multiple recent failures detected - switching to manual mode'
    };
  }
  
  return {
    useFallback: false,
    reason: null
  };
}

export { RetryError, CircuitBreaker };

