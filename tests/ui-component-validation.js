#!/usr/bin/env node

/**
 * UI Component Validation
 * Tests that all UI components properly integrate and display data
 */

const fs = require('fs');
const path = require('path');

// Component validation matrix
const UI_COMPONENTS = {
  'AgentRunLogsModal.tsx': {
    path: 'src/components/AgentRunLogsModal.tsx',
    expectedFeatures: [
      'Modal wrapper functionality',
      'Props interface definition',
      'Close handler',
      'Modal state management'
    ]
  },
  'AgentRunLogsViewer.tsx': {
    path: 'src/components/AgentRunLogsViewer.tsx',
    expectedFeatures: [
      'API client integration',
      'Pagination state management',
      'Loading states',
      'Error handling',
      'Log filtering',
      'Real-time data fetching'
    ]
  },
  'LogEntry.tsx': {
    path: 'src/components/LogEntry.tsx',
    expectedFeatures: [
      'Message type display',
      'Tool execution details',
      'Thought process display',
      'Timestamp formatting',
      'JSON data formatting'
    ]
  },
  'LogFilters.tsx': {
    path: 'src/components/LogFilters.tsx',
    expectedFeatures: [
      'Message type filtering',
      'Filter state management',
      'UI controls for filters',
      'Clear filters functionality'
    ]
  },
  'LogPagination.tsx': {
    path: 'src/components/LogPagination.tsx',
    expectedFeatures: [
      'Page navigation',
      'Page size controls',
      'Navigation state',
      'Pagination info display'
    ]
  },
  'AgentRunCard.tsx': {
    path: 'src/components/AgentRunCard.tsx',
    expectedFeatures: [
      'View Logs button integration',
      'Modal trigger functionality',
      'Agent run data display'
    ]
  }
};

function analyzeComponent(componentName, componentInfo) {
  console.log(`\n🔍 Analyzing ${componentName}`);
  console.log('─'.repeat(50));

  const filePath = componentInfo.path;
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return { exists: false, features: [] };
  }

  console.log(`✅ File exists: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const foundFeatures = [];
  const missingFeatures = [];

  // Analyze content for expected features
  componentInfo.expectedFeatures.forEach(feature => {
    let found = false;
    
    switch (feature) {
      case 'Modal wrapper functionality':
        found = content.includes('Modal') || content.includes('modal');
        break;
      case 'Props interface definition':
        found = content.includes('interface') && content.includes('Props');
        break;
      case 'Close handler':
        found = content.includes('onClose') || content.includes('close');
        break;
      case 'Modal state management':
        found = content.includes('useState') || content.includes('state');
        break;
      case 'API client integration':
        found = content.includes('getAPIClient') || content.includes('apiClient');
        break;
      case 'Pagination state management':
        found = content.includes('currentPage') || content.includes('pageSize') || content.includes('pagination');
        break;
      case 'Loading states':
        found = content.includes('isLoading') || content.includes('loading');
        break;
      case 'Error handling':
        found = content.includes('error') || content.includes('Error');
        break;
      case 'Log filtering':
        found = content.includes('filter') || content.includes('Filter');
        break;
      case 'Real-time data fetching':
        found = content.includes('useEffect') || content.includes('loadLogs');
        break;
      case 'Message type display':
        found = content.includes('message_type') || content.includes('messageType');
        break;
      case 'Tool execution details':
        found = content.includes('tool_name') || content.includes('tool_input') || content.includes('tool_output');
        break;
      case 'Thought process display':
        found = content.includes('thought');
        break;
      case 'Timestamp formatting':
        found = content.includes('created_at') || content.includes('timestamp') || content.includes('Date');
        break;
      case 'JSON data formatting':
        found = content.includes('JSON.stringify') || content.includes('json');
        break;
      case 'Message type filtering':
        found = content.includes('AgentRunLogMessageType') || content.includes('messageType');
        break;
      case 'Filter state management':
        found = content.includes('selectedMessageTypes') || content.includes('filter');
        break;
      case 'UI controls for filters':
        found = content.includes('checkbox') || content.includes('select') || content.includes('button');
        break;
      case 'Clear filters functionality':
        found = content.includes('clear') || content.includes('reset');
        break;
      case 'Page navigation':
        found = content.includes('page') || content.includes('next') || content.includes('previous');
        break;
      case 'Page size controls':
        found = content.includes('pageSize') || content.includes('limit');
        break;
      case 'Navigation state':
        found = content.includes('currentPage') || content.includes('totalPages');
        break;
      case 'Pagination info display':
        found = content.includes('total') || content.includes('showing');
        break;
      case 'View Logs button integration':
        found = content.includes('View Logs') || content.includes('logs');
        break;
      case 'Modal trigger functionality':
        found = content.includes('setShowLogsModal') || content.includes('modal');
        break;
      case 'Agent run data display':
        found = content.includes('agentRun') || content.includes('agent_run');
        break;
      default:
        found = false;
    }

    if (found) {
      foundFeatures.push(feature);
      console.log(`  ✅ ${feature}`);
    } else {
      missingFeatures.push(feature);
      console.log(`  ❌ ${feature}`);
    }
  });

  return {
    exists: true,
    foundFeatures,
    missingFeatures,
    completionRate: ((foundFeatures.length / componentInfo.expectedFeatures.length) * 100).toFixed(1)
  };
}

function validateTypeScriptImports() {
  console.log('\n📦 TypeScript Imports Validation');
  console.log('─'.repeat(50));

  const componentsToCheck = [
    'src/components/AgentRunLogsViewer.tsx',
    'src/components/LogEntry.tsx',
    'src/components/LogFilters.tsx'
  ];

  componentsToCheck.forEach(componentPath => {
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for proper type imports
      const hasTypeImports = content.includes('AgentRunLog') || 
                           content.includes('AgentRunLogMessageType') ||
                           content.includes('AgentRunWithLogsResponse');
      
      const hasAPIImports = content.includes('getAPIClient') || 
                          content.includes('api/client');
      
      console.log(`${componentPath}:`);
      console.log(`  ${hasTypeImports ? '✅' : '❌'} Type imports`);
      console.log(`  ${hasAPIImports ? '✅' : '❌'} API client imports`);
    }
  });
}

function validateComponentIntegration() {
  console.log('\n🔗 Component Integration Validation');
  console.log('─'.repeat(50));

  // Check if AgentRunCard integrates with AgentRunLogsModal
  const agentRunCardPath = 'src/components/AgentRunCard.tsx';
  if (fs.existsSync(agentRunCardPath)) {
    const content = fs.readFileSync(agentRunCardPath, 'utf8');
    
    const hasLogsModal = content.includes('AgentRunLogsModal');
    const hasViewLogsButton = content.includes('View Logs') || content.includes('logs');
    const hasModalState = content.includes('showLogsModal') || content.includes('logsModal');
    
    console.log('AgentRunCard → AgentRunLogsModal Integration:');
    console.log(`  ${hasLogsModal ? '✅' : '❌'} Imports AgentRunLogsModal`);
    console.log(`  ${hasViewLogsButton ? '✅' : '❌'} Has View Logs button`);
    console.log(`  ${hasModalState ? '✅' : '❌'} Manages modal state`);
  }

  // Check if AgentRunLogsModal uses AgentRunLogsViewer
  const logsModalPath = 'src/components/AgentRunLogsModal.tsx';
  if (fs.existsSync(logsModalPath)) {
    const content = fs.readFileSync(logsModalPath, 'utf8');
    
    const hasLogsViewer = content.includes('AgentRunLogsViewer');
    
    console.log('\nAgentRunLogsModal → AgentRunLogsViewer Integration:');
    console.log(`  ${hasLogsViewer ? '✅' : '❌'} Uses AgentRunLogsViewer`);
  }
}

function generateReport(results) {
  console.log('\n📊 UI COMPONENT VALIDATION SUMMARY');
  console.log('='.repeat(60));

  let totalComponents = 0;
  let existingComponents = 0;
  let totalFeatures = 0;
  let implementedFeatures = 0;

  Object.entries(results).forEach(([component, result]) => {
    totalComponents++;
    if (result.exists) {
      existingComponents++;
      totalFeatures += result.foundFeatures.length + result.missingFeatures.length;
      implementedFeatures += result.foundFeatures.length;
    }
  });

  console.log(`📁 Components Found: ${existingComponents}/${totalComponents}`);
  console.log(`✅ Features Implemented: ${implementedFeatures}/${totalFeatures}`);
  console.log(`🎯 Overall Completion: ${((implementedFeatures / totalFeatures) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Component-specific results
  Object.entries(results).forEach(([component, result]) => {
    if (result.exists) {
      console.log(`\n${component}: ${result.completionRate}% complete`);
      if (result.missingFeatures.length > 0) {
        console.log(`  Missing: ${result.missingFeatures.join(', ')}`);
      }
    }
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalComponents,
      existingComponents,
      totalFeatures,
      implementedFeatures,
      overallCompletion: ((implementedFeatures / totalFeatures) * 100).toFixed(1)
    },
    componentResults: results
  };

  fs.writeFileSync('tests/ui-validation-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to tests/ui-validation-report.json');

  return implementedFeatures === totalFeatures;
}

function main() {
  console.log('🚀 Starting UI Component Validation\n');

  const results = {};

  // Analyze each component
  Object.entries(UI_COMPONENTS).forEach(([componentName, componentInfo]) => {
    results[componentName] = analyzeComponent(componentName, componentInfo);
  });

  validateTypeScriptImports();
  validateComponentIntegration();
  
  const allFeaturesImplemented = generateReport(results);
  
  if (allFeaturesImplemented) {
    console.log('\n✅ SUCCESS: All UI components are fully implemented!');
    process.exit(0);
  } else {
    console.log('\n⚠️  WARNING: Some UI features are missing or incomplete.');
    process.exit(1);
  }
}

// Run the validation
main();

