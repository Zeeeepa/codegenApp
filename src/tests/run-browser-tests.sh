#!/bin/bash

# Browser Automation Test Runner
# This script runs all browser automation tests and provides detailed output

echo "🤖 Running Browser Automation Tests..."
echo "======================================"

# Set test environment
export NODE_ENV=test
export CI=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "  - Environment: $NODE_ENV"
echo "  - Test Framework: Jest with React Testing Library"
echo "  - Browser Simulation: JSDOM"
echo "  - XPath Support: Native DOM evaluation"
echo ""

echo -e "${BLUE}🧪 Running Test Suites:${NC}"
echo ""

# Run browser automation tests
echo -e "${YELLOW}1. Browser Automation Component Tests${NC}"
npm test -- tests/browser-automation.test.tsx --verbose --watchAll=false

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Browser automation component tests passed${NC}"
else
    echo -e "${RED}❌ Browser automation component tests failed${NC}"
    exit 1
fi

echo ""

# Run list agent runs automation tests
echo -e "${YELLOW}2. List Agent Runs Automation Tests${NC}"
npm test -- tests/list-agent-runs-automation.test.tsx --verbose --watchAll=false

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ List agent runs automation tests passed${NC}"
else
    echo -e "${RED}❌ List agent runs automation tests failed${NC}"
    exit 1
fi

echo ""

# Run integration tests
echo -e "${YELLOW}3. Browser Automation Integration Tests${NC}"
npm test -- tests/browser-automation-integration.test.tsx --verbose --watchAll=false

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Browser automation integration tests passed${NC}"
else
    echo -e "${RED}❌ Browser automation integration tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All Browser Automation Tests Passed!${NC}"
echo ""

echo -e "${BLUE}📊 Test Coverage Summary:${NC}"
echo "  ✅ XPath element selection"
echo "  ✅ CSS selector fallbacks"
echo "  ✅ React event triggering"
echo "  ✅ Browser window management"
echo "  ✅ Error handling and fallbacks"
echo "  ✅ Timing and async behavior"
echo "  ✅ Element interaction simulation"
echo "  ✅ Complete automation flow"
echo ""

echo -e "${BLUE}🔧 What These Tests Validate:${NC}"
echo "  • Invisible browser window opens with correct parameters"
echo "  • XPath selectors find chat input and send button"
echo "  • CSS selectors work as fallbacks when XPath fails"
echo "  • Text input is set correctly and React events are triggered"
echo "  • Send button is clicked after proper timing delays"
echo "  • Browser window is closed after successful automation"
echo "  • Graceful fallback to manual approach on failures"
echo "  • Clipboard functionality works for fallback scenarios"
echo "  • All timing constants are reasonable and tested"
echo ""

echo -e "${GREEN}✨ Browser automation is ready for production use!${NC}"

