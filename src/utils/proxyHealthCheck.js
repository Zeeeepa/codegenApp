// Proxy health check utility for monitoring backend connectivity
class ProxyHealthChecker {
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
  startHealthChecks() {
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
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Perform health check
  async performHealthCheck() {
    try {
      const response = await fetch('/automation/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000 // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        this.onHealthCheckSuccess(data);
      } else {
        this.onHealthCheckFailure(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.onHealthCheckFailure(error.message);
    }
  }

  // Handle successful health check
  onHealthCheckSuccess(data) {
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
  onHealthCheckFailure(error) {
    this.consecutiveFailures++;
    this.lastHealthCheck = new Date();

    if (this.consecutiveFailures >= this.maxFailures && this.isHealthy) {
      this.isHealthy = false;
      console.warn('❌ Automation backend is unhealthy after', this.consecutiveFailures, 'failures:', error);
      this.notifyListeners('unhealthy', { error, failures: this.consecutiveFailures });
    }
  }

  // Add health status listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove health status listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in health check listener:', error);
      }
    });
  }

  // Get current health status
  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.maxFailures
    };
  }

  // Manual health check (returns promise)
  async checkHealth() {
    try {
      const response = await fetch('/automation/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

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
        error: error.message 
      };
    }
  }
}

// Create singleton instance
const proxyHealthChecker = new ProxyHealthChecker();

export default proxyHealthChecker;

