const healthMonitor = require('./health-monitor');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {}
      },
      automation: {
        attempts: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      system: {
        startTime: Date.now(),
        restarts: 0
      }
    };
  }

  // Record HTTP request
  recordRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    // Track by endpoint
    const key = `${method} ${endpoint}`;
    if (!this.metrics.requests.byEndpoint[key]) {
      this.metrics.requests.byEndpoint[key] = {
        count: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0,
        responseTimes: []
      };
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint[key];
    endpointMetrics.count++;
    
    if (statusCode >= 200 && statusCode < 400) {
      endpointMetrics.success++;
    } else {
      endpointMetrics.errors++;
    }
    
    if (responseTime) {
      endpointMetrics.responseTimes.push(responseTime);
      if (endpointMetrics.responseTimes.length > 100) {
        endpointMetrics.responseTimes.shift(); // Keep only last 100
      }
      endpointMetrics.avgResponseTime = this.calculateAverage(endpointMetrics.responseTimes);
    }
  }

  // Record automation attempt
  recordAutomationAttempt(success, responseTime, error = null) {
    this.metrics.automation.attempts++;
    
    if (success) {
      this.metrics.automation.successes++;
    } else {
      this.metrics.automation.failures++;
    }
    
    if (responseTime) {
      this.metrics.automation.responseTimes.push(responseTime);
      if (this.metrics.automation.responseTimes.length > 50) {
        this.metrics.automation.responseTimes.shift(); // Keep only last 50
      }
      this.metrics.automation.averageResponseTime = this.calculateAverage(this.metrics.automation.responseTimes);
    }
  }

  // Record system restart
  recordRestart() {
    this.metrics.system.restarts++;
  }

  // Calculate average of array
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((sum, val) => sum + val, 0) / arr.length);
  }

  // Get all metrics
  getAllMetrics() {
    const uptime = Date.now() - this.metrics.system.startTime;
    const healthStatus = healthMonitor.getHealthStatus();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        human: this.formatUptime(uptime)
      },
      requests: {
        ...this.metrics.requests,
        errorRate: this.metrics.requests.total > 0 
          ? Math.round((this.metrics.requests.errors / this.metrics.requests.total) * 100 * 100) / 100
          : 0
      },
      automation: {
        ...this.metrics.automation,
        successRate: this.metrics.automation.attempts > 0
          ? Math.round((this.metrics.automation.successes / this.metrics.automation.attempts) * 100 * 100) / 100
          : 0
      },
      system: {
        ...this.metrics.system,
        uptime: uptime
      },
      health: healthStatus
    };
  }

  // Get metrics in Prometheus format
  getPrometheusMetrics() {
    const metrics = this.getAllMetrics();
    const lines = [];
    
    // Request metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total ${metrics.requests.total}`);
    
    lines.push(`# HELP http_requests_success_total Total number of successful HTTP requests`);
    lines.push(`# TYPE http_requests_success_total counter`);
    lines.push(`http_requests_success_total ${metrics.requests.success}`);
    
    lines.push(`# HELP http_requests_errors_total Total number of HTTP request errors`);
    lines.push(`# TYPE http_requests_errors_total counter`);
    lines.push(`http_requests_errors_total ${metrics.requests.errors}`);
    
    // Automation metrics
    lines.push(`# HELP automation_attempts_total Total number of automation attempts`);
    lines.push(`# TYPE automation_attempts_total counter`);
    lines.push(`automation_attempts_total ${metrics.automation.attempts}`);
    
    lines.push(`# HELP automation_success_rate Automation success rate percentage`);
    lines.push(`# TYPE automation_success_rate gauge`);
    lines.push(`automation_success_rate ${metrics.automation.successRate}`);
    
    lines.push(`# HELP automation_response_time_avg Average automation response time in ms`);
    lines.push(`# TYPE automation_response_time_avg gauge`);
    lines.push(`automation_response_time_avg ${metrics.automation.averageResponseTime}`);
    
    // System metrics
    lines.push(`# HELP system_uptime_seconds System uptime in seconds`);
    lines.push(`# TYPE system_uptime_seconds gauge`);
    lines.push(`system_uptime_seconds ${Math.floor(metrics.uptime.ms / 1000)}`);
    
    lines.push(`# HELP system_restarts_total Total number of system restarts`);
    lines.push(`# TYPE system_restarts_total counter`);
    lines.push(`system_restarts_total ${metrics.system.restarts}`);
    
    // Health metrics
    lines.push(`# HELP service_healthy Service health status (1=healthy, 0=unhealthy)`);
    lines.push(`# TYPE service_healthy gauge`);
    lines.push(`service_healthy ${metrics.health.status === 'healthy' ? 1 : 0}`);
    
    return lines.join('\n');
  }

  // Format uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {}
      },
      automation: {
        attempts: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      system: {
        startTime: Date.now(),
        restarts: 0
      }
    };
  }
}

module.exports = new MetricsCollector();

