#!/usr/bin/env node

/**
 * Comprehensive Health Check and Monitoring System
 * Monitors all services and integrations for production readiness
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  services: {
    frontend: { url: 'http://localhost:3002', name: 'Frontend (React)' },
    server: { url: 'http://localhost:3001/health', name: 'Server (Node.js)' },
    backend: { url: 'http://localhost:8000/health', name: 'Backend (FastAPI)' }
  },
  apis: {
    codegen: {
      url: 'https://api.codegen.com/v1/organizations/323/agent/runs?limit=1',
      headers: { 'Authorization': `Bearer ${process.env.CODEGEN_API_KEY}` },
      name: 'Codegen API'
    },
    github: {
      url: 'https://api.github.com/zen',
      name: 'GitHub API'
    },
    gemini: {
      url: 'https://generativelanguage.googleapis.com/v1/models',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      name: 'Gemini AI API'
    }
  },
  thresholds: {
    responseTime: 5000, // 5 seconds
    uptime: 99.9, // 99.9%
    errorRate: 0.1 // 0.1%
  }
};

class HealthMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      services: {},
      apis: {},
      overall: { status: 'unknown', score: 0 }
    };
  }

  async checkService(key, config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(config.url, {
        timeout: CONFIG.thresholds.responseTime,
        headers: config.headers || {}
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        statusCode: response.status,
        message: `${config.name} is operational`,
        details: {
          url: config.url,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        statusCode: error.response?.status || 0,
        message: `${config.name} is not responding`,
        error: error.message,
        details: {
          url: config.url,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async checkAllServices() {
    console.log('🏥 Starting comprehensive health check...\n');
    
    // Check services
    console.log('📊 Checking Services:');
    for (const [key, config] of Object.entries(CONFIG.services)) {
      process.stdout.write(`  ${config.name}... `);
      this.results.services[key] = await this.checkService(key, config);
      
      if (this.results.services[key].status === 'healthy') {
        console.log(`✅ OK (${this.results.services[key].responseTime}ms)`);
      } else {
        console.log(`❌ FAILED (${this.results.services[key].error})`);
      }
    }
    
    console.log('\n🌐 Checking APIs:');
    // Check APIs
    for (const [key, config] of Object.entries(CONFIG.apis)) {
      process.stdout.write(`  ${config.name}... `);
      this.results.apis[key] = await this.checkService(key, config);
      
      if (this.results.apis[key].status === 'healthy') {
        console.log(`✅ OK (${this.results.apis[key].responseTime}ms)`);
      } else {
        console.log(`❌ FAILED (${this.results.apis[key].error})`);
      }
    }
  }

  calculateOverallHealth() {
    const allChecks = [...Object.values(this.results.services), ...Object.values(this.results.apis)];
    const healthyCount = allChecks.filter(check => check.status === 'healthy').length;
    const totalCount = allChecks.length;
    
    const score = (healthyCount / totalCount) * 100;
    
    let status = 'critical';
    if (score >= 95) status = 'healthy';
    else if (score >= 80) status = 'degraded';
    else if (score >= 50) status = 'unhealthy';
    
    this.results.overall = {
      status,
      score: Math.round(score * 100) / 100,
      healthy: healthyCount,
      total: totalCount,
      message: `${healthyCount}/${totalCount} services healthy`
    };
  }

  generateReport() {
    console.log('\n📋 HEALTH CHECK REPORT');
    console.log('='.repeat(50));
    
    // Overall status
    const statusEmoji = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🟠',
      critical: '🔴'
    };
    
    console.log(`\n${statusEmoji[this.results.overall.status]} Overall Status: ${this.results.overall.status.toUpperCase()}`);
    console.log(`📊 Health Score: ${this.results.overall.score}%`);
    console.log(`✅ Services: ${this.results.overall.healthy}/${this.results.overall.total} healthy`);
    
    // Service details
    console.log('\n🔍 Service Details:');
    for (const [key, result] of Object.entries(this.results.services)) {
      const emoji = result.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${emoji} ${CONFIG.services[key].name}: ${result.message}`);
      if (result.status === 'healthy') {
        console.log(`     Response Time: ${result.responseTime}ms`);
      }
    }
    
    // API details
    console.log('\n🌐 API Details:');
    for (const [key, result] of Object.entries(this.results.apis)) {
      const emoji = result.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${emoji} ${CONFIG.apis[key].name}: ${result.message}`);
      if (result.status === 'healthy') {
        console.log(`     Response Time: ${result.responseTime}ms`);
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    const unhealthyServices = Object.entries(this.results.services)
      .filter(([_, result]) => result.status !== 'healthy');
    const unhealthyApis = Object.entries(this.results.apis)
      .filter(([_, result]) => result.status !== 'healthy');
    
    if (unhealthyServices.length === 0 && unhealthyApis.length === 0) {
      console.log('  🎉 All systems operational! No action required.');
    } else {
      if (unhealthyServices.length > 0) {
        console.log('  🔧 Service Issues:');
        unhealthyServices.forEach(([key, result]) => {
          console.log(`     - Restart ${CONFIG.services[key].name}`);
        });
      }
      if (unhealthyApis.length > 0) {
        console.log('  🌐 API Issues:');
        unhealthyApis.forEach(([key, result]) => {
          console.log(`     - Check ${CONFIG.apis[key].name} connectivity`);
        });
      }
    }
  }

  async saveReport() {
    const reportDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `health-check-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    
    console.log(`\n💾 Report saved: ${reportFile}`);
    return reportFile;
  }

  async createCodegenMonitoringRun() {
    if (!process.env.CODEGEN_API_KEY) {
      console.log('\n⚠️  Skipping Codegen monitoring run (no API key)');
      return;
    }

    try {
      const response = await axios.post(
        'https://api.codegen.com/v1/organizations/323/agent/run',
        {
          prompt: `🏥 Health Check Report - ${new Date().toISOString()}

**Overall System Status: ${this.results.overall.status.toUpperCase()}**
- Health Score: ${this.results.overall.score}%
- Services: ${this.results.overall.healthy}/${this.results.overall.total} healthy

**Service Status:**
${Object.entries(this.results.services).map(([key, result]) => 
  `- ${CONFIG.services[key].name}: ${result.status === 'healthy' ? '✅' : '❌'} ${result.message}`
).join('\n')}

**API Status:**
${Object.entries(this.results.apis).map(([key, result]) => 
  `- ${CONFIG.apis[key].name}: ${result.status === 'healthy' ? '✅' : '❌'} ${result.message}`
).join('\n')}

Please monitor the system and provide recommendations for any issues detected.`,
          images: []
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.CODEGEN_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`\n🤖 Codegen monitoring run created: ${response.data.id}`);
      console.log(`🔗 View at: ${response.data.web_url}`);
    } catch (error) {
      console.log(`\n❌ Failed to create Codegen monitoring run: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const monitor = new HealthMonitor();
  
  try {
    await monitor.checkAllServices();
    monitor.calculateOverallHealth();
    monitor.generateReport();
    await monitor.saveReport();
    await monitor.createCodegenMonitoringRun();
    
    // Exit with appropriate code
    process.exit(monitor.results.overall.status === 'healthy' ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = HealthMonitor;
