#!/bin/bash

# CodegenApp Deployment Test Script
# This script deploys and tests the application using web-eval-agent

set -e

echo "🚀 Starting CodegenApp Deployment Test..."

# Check if required environment variables are set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY environment variable is required"
    exit 1
fi

if [ -z "$CODEGEN_API_TOKEN" ]; then
    echo "❌ CODEGEN_API_TOKEN environment variable is required"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN environment variable is required"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application in background
echo "🚀 Starting application..."
npm start &
APP_PID=$!

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if application is running
if curl -f http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ Application is running on http://localhost:3002"
else
    echo "❌ Application failed to start"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi

# Install web-eval-agent if not already installed
echo "🔧 Installing web-eval-agent..."
npm run web-eval:install

# Run comprehensive tests
echo "🧪 Running web-eval-agent tests..."
if npm run web-eval:test; then
    echo "✅ All tests passed!"
    TEST_RESULT=0
else
    echo "❌ Some tests failed"
    TEST_RESULT=1
fi

# Cleanup
echo "🧹 Cleaning up..."
kill $APP_PID 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 Deployment test completed successfully!"
    echo "📋 Summary:"
    echo "   - Application builds successfully"
    echo "   - Application starts on port 3002"
    echo "   - All UI components pass web-eval-agent testing"
    echo "   - Ready for production deployment"
else
    echo "💥 Deployment test failed!"
    echo "📋 Issues found:"
    echo "   - Check web-eval-agent test results above"
    echo "   - Fix failing components before deployment"
    exit 1
fi
