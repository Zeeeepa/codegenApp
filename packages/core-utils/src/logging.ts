/**
 * Logging utilities
 */

import { LOG_LEVELS } from './constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  correlationId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  source?: string;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  formatters: LogFormatter[];
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export class ConsoleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${timestamp} ${level} ${source} ${entry.message}${data}`;
  }
}

export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }
}

export class Logger {
  private config: LoggerConfig;
  private storage: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: false,
      maxStorageEntries: 1000,
      formatters: [new ConsoleFormatter()],
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private createEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source: this.config.source,
      correlationId: this.getCorrelationId(),
    };
  }

  private getCorrelationId(): string | undefined {
    // In a real implementation, this would get the correlation ID from context
    return undefined;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createEntry(level, message, data);

    // Console logging
    if (this.config.enableConsole) {
      const formatted = this.config.formatters[0]?.format(entry) || entry.message;
      
      switch (level) {
        case 'debug':
          console.debug(formatted);
          break;
        case 'info':
          console.info(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
        case 'fatal':
          console.error(formatted);
          break;
      }
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.storage.push(entry);
      if (this.storage.length > this.config.maxStorageEntries) {
        this.storage.shift();
      }
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any): void {
    const data = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    this.log('error', message, data);
  }

  fatal(message: string, error?: Error | any): void {
    const data = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    this.log('fatal', message, data);
  }

  // Utility methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  setSource(source: string): void {
    this.config.source = source;
  }

  getEntries(): LogEntry[] {
    return [...this.storage];
  }

  clearEntries(): void {
    this.storage = [];
  }

  // Create child logger with additional context
  child(source: string): Logger {
    return new Logger({
      ...this.config,
      source: this.config.source ? `${this.config.source}:${source}` : source,
    });
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  // Structured logging helpers
  logApiRequest(method: string, url: string, statusCode?: number, duration?: number): void {
    this.info('API Request', {
      method,
      url,
      statusCode,
      duration,
      type: 'api_request',
    });
  }

  logApiResponse(method: string, url: string, statusCode: number, duration: number): void {
    const level = statusCode >= 400 ? 'error' : 'info';
    this.log(level, 'API Response', {
      method,
      url,
      statusCode,
      duration,
      type: 'api_response',
    });
  }

  logWorkflowStep(stepName: string, status: string, duration?: number): void {
    this.info('Workflow Step', {
      stepName,
      status,
      duration,
      type: 'workflow_step',
    });
  }

  logValidation(type: string, result: boolean, errors?: any[]): void {
    const level = result ? 'info' : 'warn';
    this.log(level, 'Validation', {
      type,
      result,
      errors,
      type: 'validation',
    });
  }

  logIntegration(integration: string, action: string, success: boolean, error?: string): void {
    const level = success ? 'info' : 'error';
    this.log(level, 'Integration', {
      integration,
      action,
      success,
      error,
      type: 'integration',
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Specialized loggers
export const apiLogger = logger.child('api');
export const workflowLogger = logger.child('workflow');
export const validationLogger = logger.child('validation');
export const integrationLogger = logger.child('integration');

// Logger factory
export const createLogger = (source: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger({ ...config, source });
};

// Performance measurement decorator
export const logPerformance = (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = method.apply(this, args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.debug(`${target.constructor.name}.${propertyName} completed`, { duration });
      });
    } else {
      const duration = performance.now() - start;
      logger.debug(`${target.constructor.name}.${propertyName} completed`, { duration });
      return result;
    }
  };
  
  return descriptor;
};

// Log level utilities
export const setGlobalLogLevel = (level: LogLevel): void => {
  logger.setLevel(level);
};

export const getGlobalLogLevel = (): LogLevel => {
  return logger.getLevel();
};

// Environment-based logging configuration
export const configureLogging = (environment: string): void => {
  switch (environment) {
    case 'development':
      logger.setLevel('debug');
      break;
    case 'staging':
      logger.setLevel('info');
      break;
    case 'production':
      logger.setLevel('warn');
      break;
    case 'test':
      logger.setLevel('error');
      break;
    default:
      logger.setLevel('info');
  }
};

