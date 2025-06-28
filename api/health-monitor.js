const logger = require('./logger');

class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastHealthCheck = Date.now();
    this.isHealthy = true;
    this.services = {
      puppeteer: { status: 'unknown', lastCheck: null },
      memory: { status: 'unknown', lastCheck: null },
      disk: { status: 'unknown', lastCheck: null }
    };
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  // Increment request counter
  recordRequest() {
    this.requestCount++;
  }

  // Increment error counter
  recordError() {
    this.errorCount++;
  }

  // Get basic health status
  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        human: this.formatUptime(uptime)
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: Math.round(errorRate * 100) / 100
      },
      memory: this.getMemoryUsage(),
      services: this.services
    };
  }

  // Get detailed readiness status
  getReadinessStatus() {
    const health = this.getHealthStatus();
    const isReady = this.isHealthy && 
                   health.memory.usage < 90 && 
                   health.requests.errorRate < 50;
    
    return {
      ready: isReady,
      ...health,
      checks: {
        healthy: this.isHealthy,
        memoryOk: health.memory.usage < 90,
        errorRateOk: health.requests.errorRate < 50,
        servicesOk: Object.values(this.services).every(s => s.status === 'healthy')
      }
    };
  }

  // Get memory usage
  getMemoryUsage() {
    const used = process.memoryUsage();
    const total = require('os').totalmem();
    const free = require('os').freemem();
    
    return {
      heap: {
        used: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100
      },
      system: {
        used: Math.round((total - free) / 1024 / 1024 * 100) / 100,
        total: Math.round(total / 1024 / 1024 * 100) / 100,
        usage: Math.round((total - free) / total * 100 * 100) / 100
      }
    };
  }

  // Format uptime in human readable format
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

  // Start periodic health checks
  startPeriodicChecks() {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  // Perform comprehensive health check
  async performHealthCheck() {
    try {
      this.lastHealthCheck = Date.now();
      
      // Check Puppeteer
      await this.checkPuppeteer();
      
      // Check memory usage
      this.checkMemory();
      
      // Update overall health status
      this.updateOverallHealth();
      
      logger.info('Health check completed', {
        status: this.isHealthy ? 'healthy' : 'unhealthy',
        services: this.services
      });
      
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      this.isHealthy = false;
    }
  }

  // Check Puppeteer availability
  async checkPuppeteer() {
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      
      this.services.puppeteer = {
        status: 'healthy',
        lastCheck: Date.now()
      };
    } catch (error) {
      this.services.puppeteer = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: error.message
      };
    }
  }

  // Check memory usage
  checkMemory() {
    const memory = this.getMemoryUsage();
    const isHealthy = memory.system.usage < 90 && memory.heap.used < 500; // 500MB heap limit
    
    this.services.memory = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      lastCheck: Date.now(),
      usage: memory
    };
  }

  // Update overall health status
  updateOverallHealth() {
    const unhealthyServices = Object.values(this.services)
      .filter(service => service.status === 'unhealthy');
    
    this.isHealthy = unhealthyServices.length === 0;
    
    if (!this.isHealthy) {
      logger.warn('Service unhealthy', {
        unhealthyServices: unhealthyServices.map(s => s.error || 'Unknown error')
      });
    }
  }

  // Get metrics for monitoring
  getMetrics() {
    const health = this.getHealthStatus();
    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      requests_total: this.requestCount,
      errors_total: this.errorCount,
      error_rate_percent: health.requests.errorRate,
      memory_heap_used_mb: health.memory.heap.used,
      memory_system_usage_percent: health.memory.system.usage,
      healthy: this.isHealthy ? 1 : 0
    };
  }
}

module.exports = new HealthMonitor();

