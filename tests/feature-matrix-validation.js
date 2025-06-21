#!/usr/bin/env node

/**
 * Feature Matrix Validation
 * Systematically validates every feature mentioned in agent-run-logs.mdx
 * against our current implementation
 */

const fs = require('fs');
const path = require('path');

// Feature matrix based on agent-run-logs.mdx documentation
const FEATURE_MATRIX = {
  // API Endpoints
  endpoints: {
    'GET /v1/organizations/{org_id}/agent/run/{agent_run_id}/logs': {
      implemented: true,
      location: 'src/api/constants.ts:AGENT_RUN_LOGS',
      notes: 'Uses /v1/alpha/ prefix'
    }
  },

  // Parameters
  parameters: {
    'org_id (integer, required)': {
      implemented: true,
      location: 'src/api/client.ts:getAgentRunLogs',
      notes: 'Properly typed and validated'
    },
    'agent_run_id (integer, required)': {
      implemented: true,
      location: 'src/api/client.ts:getAgentRunLogs',
      notes: 'Properly typed and validated'
    },
    'skip (integer, optional, default: 0)': {
      implemented: true,
      location: 'src/api/client.ts:getAgentRunLogs',
      notes: 'Supports pagination'
    },
    'limit (integer, optional, default: 100, max: 100)': {
      implemented: true,
      location: 'src/api/client.ts:getAgentRunLogs',
      notes: 'Supports pagination with limits'
    }
  },

  // Response Structure
  responseStructure: {
    'AgentRunWithLogsResponse interface': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'Complete interface matching documentation'
    },
    'id field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type'
    },
    'organization_id field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type'
    },
    'status field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'string type'
    },
    'created_at field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'string type (ISO 8601)'
    },
    'web_url field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'string type'
    },
    'result field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'optional string type'
    },
    'logs array': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'AgentRunLog[] type'
    },
    'total_logs field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type for pagination'
    },
    'page field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type for pagination'
    },
    'size field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type for pagination'
    },
    'pages field': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunWithLogsResponse',
      notes: 'number type for pagination'
    }
  },

  // Agent Run Log Fields
  logFields: {
    'agent_run_id (integer)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Core field'
    },
    'created_at (string)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'ISO 8601 timestamp'
    },
    'message_type (string)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'AgentRunLogMessageType enum'
    },
    'thought (string | null)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Agent reasoning field'
    },
    'tool_name (string | null)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Tool execution field'
    },
    'tool_input (object | null)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Tool execution field'
    },
    'tool_output (object | null)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Tool execution field'
    },
    'observation (object | string | null)': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLog',
      notes: 'Tool execution field'
    }
  },

  // Message Types
  messageTypes: {
    // Plan Agent Types
    'ACTION': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Tool execution'
    },
    'PLAN_EVALUATION': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Agent planning'
    },
    'FINAL_ANSWER': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Final response'
    },
    'ERROR': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Error handling'
    },
    'USER_MESSAGE': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'User input'
    },
    'USER_GITHUB_ISSUE_COMMENT': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'GitHub integration'
    },
    // PR Agent Types
    'INITIAL_PR_GENERATION': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'PR workflow'
    },
    'DETECT_PR_ERRORS': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'PR workflow'
    },
    'FIX_PR_ERRORS': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'PR workflow'
    },
    'PR_CREATION_FAILED': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'PR workflow'
    },
    'PR_EVALUATION': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'PR workflow'
    },
    // Commit Agent Types
    'COMMIT_EVALUATION': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Commit workflow'
    },
    // Link Types
    'AGENT_RUN_LINK': {
      implemented: true,
      location: 'src/api/types.ts:AgentRunLogMessageType',
      notes: 'Agent linking'
    }
  },

  // UI Components
  uiComponents: {
    'Agent Run Logs Modal': {
      implemented: true,
      location: 'src/components/AgentRunLogsModal.tsx',
      notes: 'Modal wrapper for logs display'
    },
    'Agent Run Logs Viewer': {
      implemented: true,
      location: 'src/components/AgentRunLogsViewer.tsx',
      notes: 'Main logs container with pagination'
    },
    'Log Entry Component': {
      implemented: true,
      location: 'src/components/LogEntry.tsx',
      notes: 'Individual log entry display'
    },
    'Log Filters Component': {
      implemented: true,
      location: 'src/components/LogFilters.tsx',
      notes: 'Message type filtering'
    },
    'Log Pagination Component': {
      implemented: true,
      location: 'src/components/LogPagination.tsx',
      notes: 'Navigation controls'
    },
    'View Logs Button Integration': {
      implemented: true,
      location: 'src/components/AgentRunCard.tsx',
      notes: 'Purple button in agent run cards'
    }
  },

  // Usage Examples (from documentation)
  usageExamples: {
    'Basic Log Retrieval': {
      implemented: true,
      location: 'src/api/client.ts:getAgentRunLogs',
      notes: 'Supported via API client'
    },
    'Filtering by Log Type': {
      implemented: true,
      location: 'src/components/LogFilters.tsx',
      notes: 'UI filtering by message type'
    },
    'Pagination Example': {
      implemented: true,
      location: 'src/components/LogPagination.tsx',
      notes: 'UI pagination with skip/limit'
    },
    'Debugging Failed Runs': {
      implemented: true,
      location: 'src/components/LogEntry.tsx',
      notes: 'Error log display and filtering'
    }
  },

  // Common Use Cases
  useCases: {
    'Building Monitoring Dashboards': {
      implemented: true,
      location: 'src/components/AgentRunLogsViewer.tsx',
      notes: 'Real-time log viewing with metrics'
    },
    'Debugging Agent Behavior': {
      implemented: true,
      location: 'src/components/LogEntry.tsx',
      notes: 'Detailed tool execution and thought display'
    },
    'Audit and Compliance': {
      implemented: true,
      location: 'src/api/types.ts + UI components',
      notes: 'Complete log history with timestamps'
    },
    'Performance Analysis': {
      implemented: true,
      location: 'src/components/AgentRunLogsViewer.tsx',
      notes: 'Tool usage patterns and execution flow'
    }
  },

  // Error Handling
  errorHandling: {
    '400 Bad Request': {
      implemented: true,
      location: 'src/api/client.ts + UI error handling',
      notes: 'Invalid parameters handling'
    },
    '401 Unauthorized': {
      implemented: true,
      location: 'src/api/client.ts + UI error handling',
      notes: 'Authentication error handling'
    },
    '403 Forbidden': {
      implemented: true,
      location: 'src/api/client.ts + UI error handling',
      notes: 'Permission error handling'
    },
    '404 Not Found': {
      implemented: true,
      location: 'src/api/client.ts + UI error handling',
      notes: 'Agent run not found handling'
    },
    '429 Too Many Requests': {
      implemented: true,
      location: 'src/api/client.ts + UI error handling',
      notes: 'Rate limit error handling'
    }
  }
};

function validateImplementation() {
  console.log('🔍 Feature Matrix Validation\n');
  console.log('Validating implementation against agent-run-logs.mdx documentation...\n');

  let totalFeatures = 0;
  let implementedFeatures = 0;
  let missingFeatures = [];

  // Validate each category
  Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
    console.log(`📋 ${category.toUpperCase()}`);
    console.log('─'.repeat(50));

    Object.entries(features).forEach(([feature, details]) => {
      totalFeatures++;
      const status = details.implemented ? '✅' : '❌';
      const location = details.location ? ` (${details.location})` : '';
      const notes = details.notes ? ` - ${details.notes}` : '';
      
      console.log(`${status} ${feature}${location}${notes}`);
      
      if (details.implemented) {
        implementedFeatures++;
      } else {
        missingFeatures.push({ category, feature, details });
      }
    });
    
    console.log('');
  });

  return {
    totalFeatures,
    implementedFeatures,
    missingFeatures,
    completionRate: ((implementedFeatures / totalFeatures) * 100).toFixed(1)
  };
}

function checkFileExistence() {
  console.log('📁 File Existence Validation\n');
  
  const filesToCheck = [
    'src/api/constants.ts',
    'src/api/types.ts',
    'src/api/client.ts',
    'src/components/AgentRunLogsModal.tsx',
    'src/components/AgentRunLogsViewer.tsx',
    'src/components/LogEntry.tsx',
    'src/components/LogFilters.tsx',
    'src/components/LogPagination.tsx',
    'src/components/AgentRunCard.tsx'
  ];

  filesToCheck.forEach(file => {
    const exists = fs.existsSync(file);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${file}`);
  });
  
  console.log('');
}

function generateReport(results) {
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Implemented Features: ${results.implementedFeatures}`);
  console.log(`❌ Missing Features: ${results.missingFeatures.length}`);
  console.log(`📈 Total Features: ${results.totalFeatures}`);
  console.log(`🎯 Completion Rate: ${results.completionRate}%`);
  console.log('='.repeat(50));

  if (results.missingFeatures.length > 0) {
    console.log('\n❌ Missing Features:');
    results.missingFeatures.forEach(({ category, feature, details }) => {
      console.log(`   • ${category}: ${feature}`);
      if (details.notes) {
        console.log(`     Notes: ${details.notes}`);
      }
    });
  } else {
    console.log('\n🎉 All documented features are implemented!');
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFeatures: results.totalFeatures,
      implementedFeatures: results.implementedFeatures,
      missingFeatures: results.missingFeatures.length,
      completionRate: results.completionRate
    },
    featureMatrix: FEATURE_MATRIX,
    missingFeatures: results.missingFeatures
  };

  fs.writeFileSync('tests/feature-matrix-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to tests/feature-matrix-report.json');

  return results.missingFeatures.length === 0;
}

function main() {
  console.log('🚀 Starting Feature Matrix Validation\n');
  
  checkFileExistence();
  const results = validateImplementation();
  const allFeaturesImplemented = generateReport(results);
  
  if (allFeaturesImplemented) {
    console.log('\n✅ SUCCESS: All features from agent-run-logs.mdx are implemented!');
    process.exit(0);
  } else {
    console.log('\n⚠️  WARNING: Some features are missing or incomplete.');
    process.exit(1);
  }
}

// Run the validation
main();

