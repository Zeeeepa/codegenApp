#!/bin/bash

# CI/CD Validation Environment Setup Script
echo "=========================================="
echo "🚀 Setting up CI/CD Validation Environment"
echo "=========================================="

# Set environment variables (replace with your actual values)
export GEMINI_API_KEY="your-gemini-api-key-here"
export CODEGEN_ORG_ID="your-codegen-org-id"
export CODEGEN_API_TOKEN="your-codegen-api-token"
export GITHUB_TOKEN="your-github-token"
export CLOUDFLARE_API_KEY="your-cloudflare-api-key"
export CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
export CLOUDFLARE_WORKER_URL="your-cloudflare-worker-url"

echo "✅ Environment variables set"

# Check Python version
echo "🐍 Checking Python version..."
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check Node.js version
echo "📦 Checking Node.js version..."
node --version
if [ $? -ne 0 ]; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip3 install --upgrade pip
pip3 install httpx asyncio browser-use playwright langchain-google-genai

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
playwright install chromium

# Check if backend is running
echo "🔍 Checking backend service..."
curl -s http://localhost:8000/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not running. Start it with: cd backend && python api.py"
fi

# Check if frontend is running
echo "🔍 Checking frontend service..."
curl -s http://localhost:3000/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend is not running. Start it with: cd frontend && npm run dev"
fi

# Check if required directories exist
echo "📁 Checking service directories..."
for dir in "backend" "frontend" "web-eval-agent" "grainchain"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir directory exists"
    else
        echo "⚠️  $dir directory not found"
    fi
done

# Make test scripts executable
echo "🔧 Setting up test scripts..."
chmod +x simple_cicd_test.py
chmod +x run_cicd_validation.py

echo ""
echo "=========================================="
echo "🎉 Environment setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Ensure backend is running: cd backend && python api.py"
echo "2. Ensure frontend is running: cd frontend && npm run dev"
echo "3. Run validation: python3 simple_cicd_test.py"
echo "4. For full testing: python3 run_cicd_validation.py"
echo ""
echo "📋 Remember to set your actual API keys in the environment variables!"

