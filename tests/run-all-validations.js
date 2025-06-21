#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all validation tests and generates a comprehensive report
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Running Comprehensive Agent Run Logs Validation Suite\n');
console.log('='.repeat(70));

const tests = [
  {
    name: 'Feature Matrix Validation',
    script: 'node tests/feature-matrix-validation.js',
    description: 'Validates all documented features are implemented'
  },
  {
    name: 'UI Component Validation',
    script: 'node tests/ui-component-validation.js',
    description: 'Tests UI component integration and functionality'
  }
];

const results = [];

// Run each test
for (const test of tests) {
  console.log(`\n📋 Running: ${test.name}`);
  console.log(`📝 ${test.description}`);
  console.log('─'.repeat(50));
  
  try {
    const output = execSync(test.script, { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    console.log(output);
    results.push({
      name: test.name,
      status: 'PASSED',
      output: output
    });
  } catch (error) {
    console.log(error.stdout || error.message);
    results.push({
      name: test.name,
      status: 'FAILED',
      output: error.stdout || error.message,
      error: error.message
    });
  }
}

// Generate summary report
console.log('\n📊 VALIDATION SUITE SUMMARY');
console.log('='.repeat(70));

const passed = results.filter(r => r.status === 'PASSED').length;
const failed = results.filter(r => r.status === 'FAILED').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${results.length}`);
console.log(`🎯 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

results.forEach(result => {
  const status = result.status === 'PASSED' ? '✅' : '❌';
  console.log(`${status} ${result.name}`);
});

// Save comprehensive report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    passed,
    failed,
    total: results.length,
    successRate: ((passed / results.length) * 100).toFixed(1)
  },
  results
};

fs.writeFileSync('tests/comprehensive-validation-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Comprehensive report saved to tests/comprehensive-validation-report.json');

// Load individual reports for summary
const reports = {
  featureMatrix: JSON.parse(fs.readFileSync('tests/feature-matrix-report.json', 'utf8')),
  uiValidation: JSON.parse(fs.readFileSync('tests/ui-validation-report.json', 'utf8'))
};

console.log('\n🎯 DETAILED METRICS');
console.log('='.repeat(70));
console.log(`📋 Feature Matrix: ${reports.featureMatrix.summary.implementedFeatures}/${reports.featureMatrix.summary.totalFeatures} features (${reports.featureMatrix.summary.completionRate}%)`);
console.log(`🖥️  UI Components: ${reports.uiValidation.summary.implementedFeatures}/${reports.uiValidation.summary.totalFeatures} features (${reports.uiValidation.summary.overallCompletion}%)`);

if (failed === 0) {
  console.log('\n🎉 ALL VALIDATIONS PASSED!');
  console.log('✅ Agent Run Logs implementation is fully compliant with documentation');
  process.exit(0);
} else {
  console.log('\n⚠️  Some validations failed. Check individual reports for details.');
  process.exit(1);
}

