/**
 * Error handling utilities
 */

import { ERROR_CODES } from './constants';

// Base error class
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string = ERROR_CODES.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, ERROR_CODES.UNAUTHORIZED, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, any>) {
    super(message, ERROR_CODES.FORBIDDEN, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, true, context);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ERROR_CODES.NETWORK_ERROR, 0, true, context);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out', context?: Record<string, any>) {
    super(message, ERROR_CODES.TIMEOUT_ERROR, 408, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, ERROR_CODES.RATE_LIMITED, 429, true, context);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', context?: Record<string, any>) {
    super(message, ERROR_CODES.SERVICE_UNAVAILABLE, 503, true, context);
  }
}

export class WorkflowError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ERROR_CODES.WORKFLOW_ERROR, 500, true, context);
  }
}

export class IntegrationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ERROR_CODES.INTEGRATION_ERROR, 500, true, context);
  }
}

// Error handler function
export type ErrorHandler = (error: Error) => void;

export class ErrorManager {
  private handlers: ErrorHandler[] = [];
  private globalHandler?: ErrorHandler;

  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: ErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  setGlobalHandler(handler: ErrorHandler): void {
    this.globalHandler = handler;
  }

  handle(error: Error): void {
    // Call specific handlers first
    this.handlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });

    // Call global handler if available
    if (this.globalHandler) {
      try {
        this.globalHandler(error);
      } catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
      }
    }
  }
}

// Global error manager instance
export const errorManager = new ErrorManager();

// Error utilities
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const isOperationalError = (error: any): boolean => {
  return isAppError(error) && error.isOperational;
};

export const getErrorMessage = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

export const getErrorCode = (error: any): string => {
  if (isAppError(error)) {
    return error.code;
  }
  return ERROR_CODES.UNKNOWN_ERROR;
};

export const getErrorStatusCode = (error: any): number => {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
};

export const formatError = (error: any): {
  message: string;
  code: string;
  statusCode: number;
  stack?: string;
  context?: Record<string, any>;
} => {
  return {
    message: getErrorMessage(error),
    code: getErrorCode(error),
    statusCode: getErrorStatusCode(error),
    stack: error?.stack,
    context: isAppError(error) ? error.context : undefined,
  };
};

// Async error wrapper
export const asyncErrorHandler = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): T => {
  return ((...args: any[]) => {
    const result = fn(...args);
    if (result && typeof result.catch === 'function') {
      return result.catch((error: any) => {
        errorManager.handle(error);
        throw error;
      });
    }
    return result;
  }) as T;
};

// Try-catch wrapper
export const tryCatch = <T>(
  fn: () => T,
  fallback?: T,
  onError?: (error: any) => void
): T | undefined => {
  try {
    return fn();
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      errorManager.handle(error as Error);
    }
    return fallback;
  }
};

// Async try-catch wrapper
export const asyncTryCatch = async <T>(
  fn: () => Promise<T>,
  fallback?: T,
  onError?: (error: any) => void
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      errorManager.handle(error as Error);
    }
    return fallback;
  }
};

// Result type for error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const createResult = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

export const createError = <E = Error>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const resultFromPromise = async <T>(
  promise: Promise<T>
): Promise<Result<T>> => {
  try {
    const data = await promise;
    return createResult(data);
  } catch (error) {
    return createError(error as Error);
  }
};

// Error boundary for React components (utility)
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export const createErrorBoundaryState = (): ErrorBoundaryState => ({
  hasError: false,
});

export const handleErrorBoundaryError = (
  error: Error,
  errorInfo: any
): ErrorBoundaryState => {
  errorManager.handle(error);
  return {
    hasError: true,
    error,
    errorInfo,
  };
};

// HTTP error utilities
export const createHttpError = (
  statusCode: number,
  message?: string,
  context?: Record<string, any>
): AppError => {
  const defaultMessages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  const errorMessage = message || defaultMessages[statusCode] || 'HTTP Error';
  const errorCode = `HTTP_${statusCode}`;

  return new AppError(errorMessage, errorCode, statusCode, true, context);
};

export const isHttpError = (error: any, statusCode?: number): boolean => {
  if (!isAppError(error)) {
    return false;
  }
  
  if (statusCode !== undefined) {
    return error.statusCode === statusCode;
  }
  
  return error.statusCode >= 400 && error.statusCode < 600;
};

