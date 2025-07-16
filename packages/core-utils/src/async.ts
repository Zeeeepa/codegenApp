/**
 * Async utilities and helpers
 */

// Delay utility
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Timeout wrapper
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
};

// Retry utility
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoffFactor?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  const { maxAttempts, delay: initialDelay, backoffFactor = 2, maxDelay = 30000, retryCondition } = options;
  
  let lastError: any;
  let currentDelay = initialDelay;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      if (retryCondition && !retryCondition(error)) {
        throw error;
      }
      
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
    }
  }
  
  throw lastError;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): T => {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), waitMs);
  }) as T;
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): T => {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  }) as T;
};

// Batch processing
export const batch = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 10
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  
  return results;
};

// Queue implementation
export class AsyncQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = false;
  private concurrency: number;
  private activeCount = 0;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift()!;
    
    try {
      await task();
    } finally {
      this.activeCount--;
      this.process();
    }
  }

  get size(): number {
    return this.queue.length;
  }

  get pending(): number {
    return this.activeCount;
  }
}

// Event emitter
export class EventEmitter<T extends Record<string, any[]>> {
  private listeners: { [K in keyof T]?: ((...args: T[K]) => void)[] } = {};

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
    const onceListener = (...args: T[K]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }

  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

