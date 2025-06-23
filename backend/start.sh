#!/bin/bash

# Automation Backend Service Startup Script
echo "🚀 Starting Automation Backend Service..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing instance
echo "🛑 Stopping existing instances..."
pm2 stop automation-backend 2>/dev/null || true
pm2 delete automation-backend 2>/dev/null || true

# Start the service with PM2
echo "▶️ Starting automation backend with PM2..."
pm2 start ecosystem.config.js

# Show status
echo "📊 Service Status:"
pm2 status

# Show logs
echo "📝 Recent logs:"
pm2 logs automation-backend --lines 10 --nostream

echo "✅ Automation Backend Service started successfully!"
echo "🔍 Monitor with: pm2 monit"
echo "📋 View logs with: pm2 logs automation-backend"
echo "🛑 Stop with: pm2 stop automation-backend"

