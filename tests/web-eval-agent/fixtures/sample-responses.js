/**
 * Sample responses for testing web-eval-agent functionality
 */

export const sampleMCPResponses = {
  webEvalSuccess: {
    jsonrpc: '2.0',
    id: 'test-session-1',
    result: [
      {
        type: 'text',
        text: `# Web Evaluation Report

## Overview
Successfully evaluated the web application at http://localhost:3000

## Navigation Testing
✅ Main navigation menu is functional
✅ All primary links are accessible
✅ Page transitions work smoothly

## UI/UX Assessment
✅ Page loads within acceptable time (< 3 seconds)
✅ Responsive design works on different screen sizes
✅ No obvious visual glitches detected

## Issues Found
⚠️ Minor: Footer links could be more prominent
⚠️ Minor: Loading states could be improved

## Recommendations
1. Consider adding loading spinners for better user feedback
2. Improve footer visibility with better contrast
3. Add breadcrumb navigation for better user orientation

## Screenshots
Screenshots have been captured and saved for review.

## Performance Metrics
- Page Load Time: 2.1 seconds
- Time to Interactive: 2.8 seconds
- Largest Contentful Paint: 1.9 seconds`
      },
      {
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        mimeType: 'image/png'
      }
    ]
  },

  webEvalError: {
    jsonrpc: '2.0',
    id: 'test-session-error',
    error: {
      code: -32603,
      message: 'Failed to load the specified URL. The page may be unreachable or the server may be down.',
      data: {
        url: 'http://localhost:99999',
        error: 'ECONNREFUSED'
      }
    }
  },

  githubPRSuccess: {
    jsonrpc: '2.0',
    id: 'test-github-pr',
    result: [
      {
        type: 'text',
        text: `# GitHub PR Testing Report

## PR Information
- Repository: Zeeeepa/codegenApp
- PR Number: #100
- Branch: feature/web-eval-integration
- Deployment URL: https://deploy-preview-100--codegenapp.netlify.app

## Deployment Status
✅ PR deployment is live and accessible
✅ Build completed successfully
✅ No deployment errors detected

## Functional Testing
✅ Application loads correctly
✅ New features are working as expected
✅ No breaking changes detected in existing functionality

## UI/UX Testing
✅ New components render properly
✅ Styling is consistent with existing design
✅ Responsive behavior is maintained

## Performance Impact
✅ No significant performance degradation
✅ Bundle size increase is within acceptable limits
✅ Core Web Vitals remain good

## Issues Found
None - PR is ready for review and merge

## Test Coverage
- Navigation: ✅ Passed
- Form Interactions: ✅ Passed  
- API Integration: ✅ Passed
- Error Handling: ✅ Passed

## Recommendation
✅ **APPROVE** - This PR is ready for merge`
      }
    ]
  },

  githubBranchSuccess: {
    jsonrpc: '2.0',
    id: 'test-github-branch',
    result: [
      {
        type: 'text',
        text: `# GitHub Branch Testing Report

## Branch Information
- Repository: Zeeeepa/codegenApp
- Branch: main
- Deployment URL: https://codegenapp.netlify.app

## Deployment Status
✅ Branch deployment is live and accessible
✅ Latest commits are deployed
✅ No deployment issues detected

## Comprehensive Testing
✅ Core application functionality verified
✅ All major user flows tested
✅ Integration points working correctly

## Performance Metrics
- Page Load Time: 1.8 seconds
- Time to Interactive: 2.3 seconds
- First Contentful Paint: 1.2 seconds

## Browser Compatibility
✅ Chrome: Working correctly
✅ Firefox: Working correctly  
✅ Safari: Working correctly
✅ Edge: Working correctly

## Mobile Responsiveness
✅ Mobile layout renders correctly
✅ Touch interactions work properly
✅ Performance on mobile is acceptable

## Security Check
✅ No obvious security vulnerabilities
✅ HTTPS properly configured
✅ Content Security Policy in place

## Overall Assessment
The main branch deployment is stable and performing well.`
      }
    ]
  },

  browserSetupSuccess: {
    jsonrpc: '2.0',
    id: 'test-browser-setup',
    result: [
      {
        type: 'text',
        text: `# Browser State Setup Complete

## Setup Summary
✅ Browser launched successfully
✅ Navigation to target URL completed
✅ Browser state saved to local storage

## Authentication Status
✅ User can now perform authentication steps
✅ Cookies and session data will be preserved
✅ Browser state is ready for subsequent evaluations

## Next Steps
The browser is now ready for web evaluation tasks. Any authentication or setup performed in this session will be preserved for future evaluations.

## Session Details
- Browser Type: Chromium
- Viewport: 1280x720
- User Agent: Mozilla/5.0 (compatible; WebEvalAgent)
- State File: ~/.web-eval-agent/browser-state.json`
      }
    ]
  },

  toolsList: {
    jsonrpc: '2.0',
    id: 'tools-list',
    result: {
      tools: [
        {
          name: 'web_eval_agent',
          description: 'Evaluate the user experience / interface of a web application',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The localhost URL of the web application to evaluate'
              },
              task: {
                type: 'string',
                description: 'The specific UX/UI aspect to test'
              },
              headless_browser: {
                type: 'boolean',
                description: 'Whether to hide the browser window popup during evaluation',
                default: false
              }
            },
            required: ['url', 'task']
          }
        },
        {
          name: 'setup_browser_state',
          description: 'Sets up and saves browser state for future use',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Optional URL to navigate to upon opening the browser'
              }
            }
          }
        },
        {
          name: 'test_github_pr',
          description: 'Test UI from a GitHub Pull Request',
          inputSchema: {
            type: 'object',
            properties: {
              git_repo: {
                type: 'string',
                description: 'GitHub repository in format "owner/repo"'
              },
              pull_request: {
                type: 'integer',
                description: 'PR number to test'
              },
              task: {
                type: 'string',
                description: 'Natural language description of what to test'
              },
              headless_browser: {
                type: 'boolean',
                description: 'Whether to run browser in headless mode',
                default: true
              }
            },
            required: ['git_repo', 'pull_request', 'task']
          }
        },
        {
          name: 'test_github_branch',
          description: 'Test UI from a GitHub branch',
          inputSchema: {
            type: 'object',
            properties: {
              git_repo: {
                type: 'string',
                description: 'GitHub repository in format "owner/repo"'
              },
              branch: {
                type: 'string',
                description: 'Branch name to test'
              },
              task: {
                type: 'string',
                description: 'Natural language description of what to test'
              },
              headless_browser: {
                type: 'boolean',
                description: 'Whether to run browser in headless mode',
                default: true
              }
            },
            required: ['git_repo', 'branch', 'task']
          }
        }
      ]
    }
  }
};

export const sampleAPIResponses = {
  evaluateSuccess: {
    sessionId: 'eval_1234567890_abc123def',
    status: 'completed',
    result: sampleMCPResponses.webEvalSuccess.result,
    metadata: {
      url: 'http://localhost:3000',
      task: 'Test the homepage navigation and user interface',
      duration: 15420
    }
  },

  evaluateError: {
    sessionId: 'eval_1234567890_error123',
    status: 'failed',
    error: 'Failed to load the specified URL. The page may be unreachable or the server may be down.',
    timestamp: '2024-07-14T16:09:17.000Z'
  },

  githubPRSuccess: {
    sessionId: 'eval_1234567890_pr100',
    status: 'completed',
    result: sampleMCPResponses.githubPRSuccess.result,
    metadata: {
      git_repo: 'Zeeeepa/codegenApp',
      pull_request: 100,
      task: 'Test the new web-eval-agent integration features'
    }
  },

  activeEvaluations: {
    count: 2,
    maxConcurrent: 3,
    evaluations: [
      {
        sessionId: 'eval_1234567890_running1',
        url: 'http://localhost:3000',
        task: 'Test navigation flow',
        startTime: 1721059757000,
        status: 'running',
        duration: 5420
      },
      {
        sessionId: 'eval_1234567890_completed1',
        url: 'http://localhost:8080',
        task: 'Test form validation',
        startTime: 1721059700000,
        status: 'completed',
        endTime: 1721059715000,
        duration: 15000
      }
    ]
  },

  healthCheck: {
    status: 'healthy',
    timestamp: '2024-07-14T16:09:17.000Z',
    config: {
      timeout: 300000,
      maxConcurrent: 3
    },
    activeEvaluations: 1
  }
};

export const sampleErrorScenarios = {
  missingParameters: {
    error: 'Missing required parameters',
    message: 'Both url and task are required'
  },

  invalidRepository: {
    error: 'Invalid repository format',
    message: 'Repository must be in format "owner/repo"'
  },

  concurrencyLimit: {
    error: 'Too many concurrent evaluations',
    message: 'Maximum 3 evaluations allowed'
  },

  sessionNotFound: {
    error: 'Evaluation not found',
    message: 'No evaluation found with session ID: non-existent-session'
  },

  unhealthyService: {
    status: 'unhealthy',
    error: 'Missing required environment variables',
    missing: ['GEMINI_API_KEY']
  }
};

