#!/bin/bash

# Fix NPM Vulnerabilities Script
# This script addresses security vulnerabilities in the project

echo "🔒 Fixing NPM Security Vulnerabilities..."

# Function to run npm audit fix safely
safe_audit_fix() {
    local dir=$1
    local service_name=$2
    
    echo "🔍 Checking vulnerabilities in $service_name..."
    cd "$dir"
    
    # First try regular audit fix
    if npm audit fix --no-fund 2>/dev/null; then
        echo "✅ Fixed vulnerabilities in $service_name with regular audit fix"
    else
        echo "⚠️  Regular audit fix failed for $service_name, trying force fix..."
        # Backup package-lock.json
        cp package-lock.json package-lock.json.backup 2>/dev/null || true
        
        # Try force fix
        if npm audit fix --force --no-fund; then
            echo "✅ Fixed vulnerabilities in $service_name with force fix"
        else
            echo "❌ Force fix failed for $service_name, restoring backup..."
            mv package-lock.json.backup package-lock.json 2>/dev/null || true
        fi
    fi
    
    cd - > /dev/null
}

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Fix vulnerabilities in root project
echo "📦 Fixing root project vulnerabilities..."
safe_audit_fix "." "Root Project"

# Fix vulnerabilities in server
echo "🌐 Fixing server vulnerabilities..."
safe_audit_fix "server" "Server"

# Fix vulnerabilities in backend
echo "🔧 Fixing backend vulnerabilities..."
safe_audit_fix "backend" "Backend"

# Update puppeteer in backend to latest secure version
echo "🎭 Updating Puppeteer to secure version..."
cd backend
npm install puppeteer@latest --save
cd ..

# Reinstall all dependencies to ensure consistency
echo "🔄 Reinstalling all dependencies..."
rm -rf node_modules package-lock.json
rm -rf server/node_modules server/package-lock.json
rm -rf backend/node_modules backend/package-lock.json

npm install
cd server && npm install && cd ..
cd backend && npm install && cd ..

echo ""
echo "🎉 Vulnerability fixes completed!"
echo "   Run 'npm audit' to verify remaining issues"
echo "   Use './start-dev.sh' to start the development environment"

