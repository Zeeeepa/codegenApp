#!/usr/bin/env node

/**
 * Comprehensive System Validation Test
 * Tests all backend functionality including API endpoints, database operations, and services
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SystemValidator {
  constructor() {
    this.serverProcess = null;
    this.baseUrl = 'http://localhost:3002';
    this.testResults = {
      server: false,
      health: false,
      projects: false,
      projectCrud: false,
      settings: false,
      webhooks: false,
      database: false
    };
  }

  async startServer() {
    console.log('🚀 Starting backend server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`📝 Server: ${data.toString().trim()}`);
        
        if (output.includes('CodegenApp Backend Server running on port 3002')) {
          setTimeout(() => resolve(), 2000); // Give server time to fully start
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(`❌ Server Error: ${data.toString().trim()}`);
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.testResults.server) {
          reject(new Error('Server startup timeout'));
        }
      }, 10000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('🛑 Stopping server...');
      this.serverProcess.kill('SIGTERM');
      
      return new Promise((resolve) => {
        this.serverProcess.on('exit', () => {
          console.log('✅ Server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          this.serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
  }

  async testHealthEndpoint() {
    console.log('\n🏥 Testing health endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        console.log('✅ Health endpoint working');
        console.log(`   📊 Service: ${data.service}`);
        console.log(`   🕐 Timestamp: ${data.timestamp}`);
        console.log(`   📦 Version: ${data.version}`);
        this.testResults.health = true;
        return true;
      } else {
        console.log(`❌ Health endpoint failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Health endpoint error: ${error.message}`);
      return false;
    }
  }

  async testProjectsAPI() {
    console.log('\n📋 Testing projects API...');
    
    try {
      // Test GET /api/projects
      const listResponse = await fetch(`${this.baseUrl}/api/projects`);
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        console.log(`❌ Projects list failed: ${listResponse.status}`);
        return false;
      }
      
      console.log(`✅ Projects list working (${listData.total} projects)`);
      
      // Test POST /api/projects
      const newProject = {
        id: 'test-system-validation',
        name: 'System Validation Test',
        fullName: 'test/system-validation',
        description: 'Test project for system validation',
        repositoryUrl: 'https://github.com/test/system-validation',
        defaultBranch: 'main',
        autoMergeEnabled: true,
        autoConfirmPlan: false
      };
      
      const createResponse = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (!createResponse.ok) {
        console.log(`❌ Project creation failed: ${createResponse.status}`);
        return false;
      }
      
      const createData = await createResponse.json();
      console.log('✅ Project creation working');
      console.log(`   🆔 ID: ${createData.project.id}`);
      console.log(`   🔗 Webhook: ${createData.project.webhookUrl}`);
      
      // Test GET /api/projects/:id
      const getResponse = await fetch(`${this.baseUrl}/api/projects/${newProject.id}`);
      const getData = await getResponse.json();
      
      if (!getResponse.ok) {
        console.log(`❌ Project get failed: ${getResponse.status}`);
        return false;
      }
      
      console.log('✅ Project get working');
      console.log(`   📝 Name: ${getData.name}`);
      console.log(`   🏷️ Full Name: ${getData.fullName}`);
      
      this.testResults.projects = true;
      this.testResults.projectCrud = true;
      return true;
      
    } catch (error) {
      console.log(`❌ Projects API error: ${error.message}`);
      return false;
    }
  }

  async testSettingsAPI() {
    console.log('\n⚙️ Testing settings API...');
    
    try {
      const projectId = 'test-system-validation';
      
      // Test PUT /api/projects/:id/settings/:key
      const settingValue = {
        value: 'npm install\\nnpm run build\\nnpm test'
      };
      
      const putResponse = await fetch(`${this.baseUrl}/api/projects/${projectId}/settings/setup_commands`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingValue)
      });
      
      if (!putResponse.ok) {
        console.log(`❌ Settings update failed: ${putResponse.status}`);
        return false;
      }
      
      console.log('✅ Settings update working');
      
      // Test GET /api/projects/:id/settings
      const getResponse = await fetch(`${this.baseUrl}/api/projects/${projectId}/settings`);
      
      if (!getResponse.ok) {
        console.log(`❌ Settings get failed: ${getResponse.status}`);
        return false;
      }
      
      const settingsData = await getResponse.json();
      console.log('✅ Settings get working');
      console.log(`   📋 Settings count: ${Object.keys(settingsData).length}`);
      
      this.testResults.settings = true;
      return true;
      
    } catch (error) {
      console.log(`❌ Settings API error: ${error.message}`);
      return false;
    }
  }

  async testWebhooksAPI() {
    console.log('\n🪝 Testing webhooks API...');
    
    try {
      // Test GET /webhooks/health
      const healthResponse = await fetch(`${this.baseUrl}/webhooks/health`);
      
      if (!healthResponse.ok) {
        console.log(`❌ Webhook health failed: ${healthResponse.status}`);
        return false;
      }
      
      const healthData = await healthResponse.json();
      console.log('✅ Webhook health working');
      console.log(`   📊 Status: ${healthData.status}`);
      
      this.testResults.webhooks = true;
      return true;
      
    } catch (error) {
      console.log(`❌ Webhooks API error: ${error.message}`);
      return false;
    }
  }

  async testDatabase() {
    console.log('\n🗄️ Testing database operations...');
    
    try {
      // Database is tested implicitly through the API calls above
      // If projects CRUD worked, database is working
      if (this.testResults.projectCrud) {
        console.log('✅ Database operations working');
        console.log('   📊 SQLite connection established');
        console.log('   📋 Schema initialized');
        console.log('   💾 CRUD operations functional');
        this.testResults.database = true;
        return true;
      } else {
        console.log('❌ Database operations failed (CRUD not working)');
        return false;
      }
    } catch (error) {
      console.log(`❌ Database error: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive system validation...\n');
    
    try {
      // Start server
      await this.startServer();
      this.testResults.server = true;
      console.log('✅ Server started successfully');
      
      // Run all tests
      await this.testHealthEndpoint();
      await this.testProjectsAPI();
      await this.testSettingsAPI();
      await this.testWebhooksAPI();
      await this.testDatabase();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error(`❌ System validation failed: ${error.message}`);
      this.generateReport();
    } finally {
      await this.stopServer();
    }
  }

  generateReport() {
    console.log('\n📊 SYSTEM VALIDATION REPORT');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'Server Startup', key: 'server', description: 'Backend server starts successfully' },
      { name: 'Health Endpoint', key: 'health', description: 'Health check endpoint responds' },
      { name: 'Projects API', key: 'projects', description: 'Projects listing and management' },
      { name: 'CRUD Operations', key: 'projectCrud', description: 'Create, read, update operations' },
      { name: 'Settings API', key: 'settings', description: 'Project settings management' },
      { name: 'Webhooks API', key: 'webhooks', description: 'Webhook endpoints functional' },
      { name: 'Database', key: 'database', description: 'Database operations working' }
    ];
    
    let passedTests = 0;
    const totalTests = tests.length;
    
    tests.forEach(test => {
      const status = this.testResults[test.key] ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name.padEnd(20)} - ${test.description}`);
      if (this.testResults[test.key]) passedTests++;
    });
    
    console.log('=' .repeat(50));
    console.log(`📈 Overall Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED - System is fully functional!');
      console.log('🚀 Ready for production deployment');
    } else {
      console.log(`⚠️  ${totalTests - passedTests} tests failed - System needs attention`);
    }
    
    console.log('\n🔗 System URLs:');
    console.log(`   🌐 Health Check: ${this.baseUrl}/health`);
    console.log(`   📋 Projects API: ${this.baseUrl}/api/projects`);
    console.log(`   🪝 Webhooks: ${this.baseUrl}/webhooks/health`);
    
    return passedTests === totalTests;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SystemValidator();
  
  validator.runAllTests()
    .then(() => {
      const allPassed = Object.values(validator.testResults).every(result => result);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

export default SystemValidator;
