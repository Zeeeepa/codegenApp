#!/usr/bin/env node

// Simple syntax validation for the updated component

const fs = require('fs');

function validateSyntax() {
  console.log('🔍 Validating Syntax of Updated Component');
  console.log('');

  try {
    // Read the updated file
    const content = fs.readFileSync('src/list-agent-runs.tsx', 'utf8');
    
    // Check for key changes
    const checks = [
      {
        name: 'Updated canRespond logic',
        pattern: /run\.status\.toLowerCase\(\) !== 'stopped'/,
        description: 'Excludes stopped runs from respond button'
      },
      {
        name: 'Enhanced resume button styling',
        pattern: /run\.status\.toLowerCase\(\) === 'stopped'/,
        description: 'Special styling for stopped runs'
      },
      {
        name: 'Resume button text for stopped runs',
        pattern: /'Resume Agent Run'/,
        description: 'Shows text for stopped runs'
      },
      {
        name: 'Gap spacing for button content',
        pattern: /gap-2/,
        description: 'Proper spacing between icon and text'
      }
    ];

    console.log('📋 Syntax Validation Results:');
    console.log('');

    let allPassed = true;
    checks.forEach(check => {
      const found = check.pattern.test(content);
      console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
      console.log(`   ${check.description}`);
      if (!found) allPassed = false;
    });

    console.log('');
    
    // Check for syntax issues
    const syntaxIssues = [
      {
        name: 'Unclosed brackets',
        pattern: /\{[^}]*$/m,
        shouldNotExist: true
      },
      {
        name: 'Unclosed parentheses',
        pattern: /\([^)]*$/m,
        shouldNotExist: true
      }
    ];

    console.log('🔧 Syntax Issue Check:');
    syntaxIssues.forEach(issue => {
      const found = issue.pattern.test(content);
      const passed = issue.shouldNotExist ? !found : found;
      console.log(`${passed ? '✅' : '❌'} ${issue.name}: ${passed ? 'OK' : 'ISSUE DETECTED'}`);
      if (!passed) allPassed = false;
    });

    console.log('');
    console.log('='.repeat(50));
    if (allPassed) {
      console.log('🎉 All syntax validations PASSED!');
      console.log('✅ Component is ready for testing');
    } else {
      console.log('❌ Some validations FAILED!');
      console.log('⚠️ Please review the issues above');
    }

    return allPassed;

  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    return false;
  }
}

const success = validateSyntax();
process.exit(success ? 0 : 1);

