// Proxy health check utility for monitoring backend connectivity
interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date | null;
  consecutiveFailures: number;
  lastError?: string;
}

type HealthListener = (event: string, data: any) => void;

class ProxyHealthChecker {
  private isHealthy: boolean;
  private lastHealthCheck: Date | null;
  private consecutiveFailures: number;
  private maxFailures: number;
  private healthCheckInterval: number;
  private healthCheckTimer: NodeJS.Timeout | null;
  private listeners: HealthListener[];

  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimer = null;
    this.listeners = [];
  }

  // Start periodic health checks
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  // Stop health checks
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Perform health check
  async performHealthCheck(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/automation/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.onHealthCheckSuccess(data);
      } else {
        this.onHealthCheckFailure(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.onHealthCheckFailure(error instanceof Error ? error.message : String(error));
    }
  }

  // Handle successful health check
  private onHealthCheckSuccess(data: any): void {
    const wasUnhealthy = !this.isHealthy;
    this.isHealthy = true;
    this.consecutiveFailures = 0;
    this.lastHealthCheck = new Date();

    if (wasUnhealthy) {
      console.log('🎉 Automation backend is back online!', data);
      this.notifyListeners('recovered', { data });
    }
  }

  // Handle failed health check
  private onHealthCheckFailure(error: any): void {
    this.consecutiveFailures++;
    this.lastHealthCheck = new Date();

    if (this.consecutiveFailures >= this.maxFailures && this.isHealthy) {
      this.isHealthy = false;
      console.warn('❌ Automation backend is unhealthy after', this.consecutiveFailures, 'failures:', error);
      this.notifyListeners('unhealthy', { error, failures: this.consecutiveFailures });
    }
  }

  // Add health status listener
  addListener(callback: HealthListener): void {
    this.listeners.push(callback);
  }

  // Remove health status listener
  removeListener(callback: HealthListener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in health check listener:', error);
      }
    });
  }

  // Get current health status
  getHealthStatus(): HealthStatus {
    return {
      isHealthy: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  // Manual health check (returns promise)
  async checkHealth(): Promise<{ healthy: boolean; data?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/automation/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { healthy: true, data };
      } else {
        return { 
          healthy: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create singleton instance
const proxyHealthChecker = new ProxyHealthChecker();

export default proxyHealthChecker;
