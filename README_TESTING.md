# CodegenApp Testing Infrastructure

This directory contains comprehensive testing infrastructure for the CodegenApp with real API integration capabilities.

## Environment Setup

Before running tests, set the following environment variables:

```bash
export CODEGEN_ORG_ID=your_org_id
export CODEGEN_API_TOKEN=your_api_token
export GITHUB_TOKEN=your_github_token
export GEMINI_API_KEY=your_gemini_api_key
```

## Test Scripts

### `test_full_cicd_workflow.py`
Comprehensive test of the complete CI/CD workflow:
1. Add project "https://github.com/Zeeeepa/windcode"
2. Create task with input "fix imports"
3. Generate and display plan
4. Confirm plan
5. Generate PR
6. Execute validation sequence
7. Merge PR to main

### Usage

1. Start the application servers:
```bash
# Terminal 1 - Main app
npm start

# Terminal 2 - Proxy server
cd server && node index.js
```

2. Run the full CI/CD workflow test:
```bash
export PYTHONPATH=/tmp/Zeeeepa/web-eval-agent:$PYTHONPATH
python test_full_cicd_workflow.py
```

## Testing Features

- **Real API Integration**: Uses actual GitHub, Gemini, and Codegen APIs
- **Browser Automation**: Playwright-based UI testing
- **AI Analysis**: Gemini-powered comprehensive evaluation
- **Screenshot Documentation**: Visual verification of each step
- **Complete Workflow Testing**: End-to-end CI/CD pipeline validation

## Requirements

- Python 3.8+
- Node.js 16+
- All environment variables configured
- Web-eval-agent installed and configured
- Playwright browsers installed

## Security Note

This testing infrastructure uses real API credentials. Ensure all sensitive data is properly configured through environment variables and never committed to version control.

