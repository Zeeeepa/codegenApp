#!/bin/bash

# Build script for CodegenApp Cloudflare Workers webhook handler
# Based on uv-cloudflare-workers-example pattern

set -e

echo "🚀 Building CodegenApp Webhook Gateway for Cloudflare Workers..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Please install it first:"
    echo "curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Navigate to cloudflare directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies with uv..."
uv sync

echo "🔧 Building Python dependencies for Cloudflare Workers..."
uv export --format requirements-txt --no-hashes > requirements.txt

# Create vendor directory for dependencies
echo "📁 Creating vendor directory..."
rm -rf vendor
mkdir -p vendor

# Install dependencies to vendor directory
echo "⬇️  Installing dependencies to vendor directory..."
uv pip install -r requirements.txt --target vendor --python-version 3.11

echo "🧹 Cleaning up build artifacts..."
find vendor -name "*.pyc" -delete
find vendor -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find vendor -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Build complete! Ready for deployment."
echo ""
echo "Next steps:"
echo "1. Set your secrets: wrangler secret put GITHUB_WEBHOOK_SECRET"
echo "2. Set your secrets: wrangler secret put GRAINCHAIN_API_URL"
echo "3. Deploy: wrangler deploy"
echo ""
echo "🌐 Your webhook will be available at: https://webhook-gateway.your-subdomain.workers.dev"

