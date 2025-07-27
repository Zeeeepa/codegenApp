#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Validates that all required environment variables are set
 * and have valid values for the CI/CD pipeline.
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Validate a required environment variable
   */
  validateRequired(name, description, validator = null) {
    const value = process.env[name];
    
    if (!value) {
      this.errors.push(`❌ ${name} is required but not set. ${description}`);
      return false;
    }

    if (validator && !validator(value)) {
      this.errors.push(`❌ ${name} has invalid value: ${value}. ${description}`);
      return false;
    }

    console.log(`✅ ${name} is set`);
    return true;
  }

  /**
   * Validate an optional environment variable
   */
  validateOptional(name, description, validator = null) {
    const value = process.env[name];
    
    if (!value) {
      this.warnings.push(`⚠️ ${name} is not set. ${description}`);
      return false;
    }

    if (validator && !validator(value)) {
      this.warnings.push(`⚠️ ${name} has invalid value: ${value}. ${description}`);
      return false;
    }

    console.log(`✅ ${name} is set`);
    return true;
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate port number
   */
  isValidPort(port) {
    const num = parseInt(port, 10);
    return !isNaN(num) && num > 0 && num <= 65535;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate log level
   */
  isValidLogLevel(level) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    return validLevels.includes(level.toLowerCase());
  }

  /**
   * Validate environment name
   */
  isValidEnvironment(env) {
    const validEnvs = ['development', 'test', 'staging', 'production'];
    return validEnvs.includes(env.toLowerCase());
  }

  /**
   * Validate all core application variables
   */
  validateCore() {
    console.log('\n🔍 Validating Core Configuration...');
    
    this.validateRequired(
      'NODE_ENV',
      'Environment name (development, test, staging, production)',
      this.isValidEnvironment
    );

    this.validateOptional(
      'PORT',
      'Application port number',
      this.isValidPort
    );

    this.validateOptional(
      'API_PORT',
      'API server port number',
      this.isValidPort
    );
  }

  /**
   * Validate Codegen API configuration
   */
  validateCodegenAPI() {
    console.log('\n🤖 Validating Codegen API Configuration...');
    
    this.validateRequired(
      'CODEGEN_API_TOKEN',
      'Your Codegen API token from https://app.codegen.com/settings'
    );

    this.validateRequired(
      'CODEGEN_API_BASE_URL',
      'Codegen API base URL (should be https://api.codegen.com)',
      this.isValidUrl
    );

    this.validateOptional(
      'CODEGEN_ORGANIZATION_ID',
      'Your Codegen organization ID'
    );

    this.validateOptional(
      'CODEGEN_USER_ID',
      'Your Codegen user ID'
    );
  }

  /**
   * Validate React app configuration
   */
  validateReactApp() {
    console.log('\n⚛️ Validating React App Configuration...');
    
    this.validateOptional(
      'REACT_APP_API_TOKEN',
      'React app API token (should match CODEGEN_API_TOKEN)'
    );

    this.validateOptional(
      'REACT_APP_API_BASE_URL',
      'React app API base URL',
      this.isValidUrl
    );

    this.validateOptional(
      'REACT_APP_DEFAULT_ORGANIZATION',
      'Default organization for React app'
    );
  }

  /**
   * Validate GitHub integration
   */
  validateGitHub() {
    console.log('\n🐙 Validating GitHub Integration...');
    
    const hasToken = this.validateOptional(
      'GITHUB_TOKEN',
      'GitHub personal access token for API access'
    );

    const hasAppId = this.validateOptional(
      'GITHUB_APP_ID',
      'GitHub App ID for app-based authentication'
    );

    const hasPrivateKey = this.validateOptional(
      'GITHUB_PRIVATE_KEY',
      'GitHub App private key'
    );

    if (!hasToken && (!hasAppId || !hasPrivateKey)) {
      this.warnings.push('⚠️ Neither GitHub token nor GitHub App credentials are configured. GitHub integration will be limited.');
    }

    this.validateOptional(
      'GITHUB_WEBHOOK_SECRET',
      'GitHub webhook secret for validating webhook payloads'
    );
  }

  /**
   * Validate database configuration
   */
  validateDatabase() {
    console.log('\n🗄️ Validating Database Configuration...');
    
    this.validateOptional(
      'DATABASE_URL',
      'PostgreSQL database connection URL'
    );

    this.validateOptional(
      'REDIS_URL',
      'Redis connection URL for caching'
    );
  }

  /**
   * Validate external services
   */
  validateExternalServices() {
    console.log('\n🌐 Validating External Services...');
    
    this.validateOptional(
      'GEMINI_API_KEY',
      'Google Gemini API key for Web-Eval-Agent'
    );

    this.validateOptional(
      'SENTRY_DSN',
      'Sentry DSN for error tracking',
      this.isValidUrl
    );

    this.validateOptional(
      'SMTP_HOST',
      'SMTP server hostname for email notifications'
    );

    if (process.env.SMTP_HOST) {
      this.validateOptional(
        'SMTP_PORT',
        'SMTP server port',
        this.isValidPort
      );

      this.validateOptional(
        'SMTP_USER',
        'SMTP username'
      );

      this.validateOptional(
        'FROM_EMAIL',
        'From email address for notifications',
        this.isValidEmail
      );
    }
  }

  /**
   * Validate logging configuration
   */
  validateLogging() {
    console.log('\n📝 Validating Logging Configuration...');
    
    this.validateOptional(
      'LOG_LEVEL',
      'Logging level (error, warn, info, debug, trace)',
      this.isValidLogLevel
    );

    this.validateOptional(
      'LOG_FORMAT',
      'Log format (json or text)'
    );
  }

  /**
   * Validate CI/CD specific configuration
   */
  validateCICD() {
    console.log('\n🚀 Validating CI/CD Configuration...');
    
    if (process.env.CI_ENVIRONMENT === 'true') {
      console.log('📊 CI environment detected');
      
      this.validateOptional('GITHUB_RUN_NUMBER', 'GitHub Actions run number');
      this.validateOptional('GITHUB_SHA', 'GitHub commit SHA');
      this.validateOptional('GITHUB_REF_NAME', 'GitHub branch name');
      this.validateOptional('GITHUB_REPOSITORY', 'GitHub repository name');
    }
  }

  /**
   * Check for common configuration issues
   */
  checkCommonIssues() {
    console.log('\n🔧 Checking for Common Issues...');
    
    // Check for token consistency
    const codegenToken = process.env.CODEGEN_API_TOKEN;
    const reactToken = process.env.REACT_APP_API_TOKEN;
    
    if (codegenToken && reactToken && codegenToken !== reactToken) {
      this.warnings.push('⚠️ CODEGEN_API_TOKEN and REACT_APP_API_TOKEN should match');
    }

    // Check for organization consistency
    const codegenOrg = process.env.CODEGEN_ORGANIZATION_ID;
    const reactOrg = process.env.REACT_APP_DEFAULT_ORGANIZATION;
    
    if (codegenOrg && reactOrg && codegenOrg !== reactOrg) {
      this.warnings.push('⚠️ CODEGEN_ORGANIZATION_ID and REACT_APP_DEFAULT_ORGANIZATION should match');
    }

    // Check for development vs production settings
    if (this.environment === 'production') {
      if (process.env.DEBUG === 'true') {
        this.warnings.push('⚠️ DEBUG mode is enabled in production');
      }
      
      if (process.env.ENABLE_DEBUG_MODE === 'true') {
        this.warnings.push('⚠️ Debug mode is enabled in production');
      }
    }

    // Check for required production settings
    if (this.environment === 'production') {
      if (!process.env.JWT_SECRET) {
        this.errors.push('❌ JWT_SECRET is required in production');
      }
      
      if (!process.env.ENCRYPTION_KEY) {
        this.warnings.push('⚠️ ENCRYPTION_KEY should be set in production');
      }
    }
  }

  /**
   * Generate environment report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      validation_status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      errors: this.errors,
      warnings: this.warnings,
      environment_variables: {
        total: Object.keys(process.env).length,
        codegen_related: Object.keys(process.env).filter(key => 
          key.includes('CODEGEN') || key.includes('REACT_APP')
        ).length,
        github_related: Object.keys(process.env).filter(key => 
          key.includes('GITHUB')
        ).length
      }
    };

    const reportPath = path.join(process.cwd(), 'environment-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Environment validation report saved to: ${reportPath}`);
    
    return report;
  }

  /**
   * Run complete validation
   */
  validate() {
    console.log('🔍 Starting Environment Validation...');
    console.log(`📍 Environment: ${this.environment}`);
    
    this.validateCore();
    this.validateCodegenAPI();
    this.validateReactApp();
    this.validateGitHub();
    this.validateDatabase();
    this.validateExternalServices();
    this.validateLogging();
    this.validateCICD();
    this.checkCommonIssues();
    
    const report = this.generateReport();
    
    console.log('\n📋 Validation Summary:');
    console.log(`✅ Status: ${report.validation_status}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log(`⚠️ Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.errors.length === 0) {
      console.log('\n🎉 Environment validation passed!');
      return true;
    } else {
      console.log('\n💥 Environment validation failed!');
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const success = validator.validate();
  process.exit(success ? 0 : 1);
}

module.exports = EnvironmentValidator;
