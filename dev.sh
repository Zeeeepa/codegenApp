#!/bin/bash

# CodegenApp - Development Quick Start Script
# This script starts all services in development mode with hot reloading

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[DEV]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Cleanup function
cleanup() {
    print_status "Stopping development servers..."
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

print_status "🚀 Starting CodegenApp in development mode..."

# Create logs directory
mkdir -p logs

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        print_status "Using .env.production for actual API keys"
        cp .env.production .env
    else
        cp .env.example .env
        print_status "Created .env file from .env.example"
        print_status "Edit .env with your actual API keys or use .env.production"
    fi
fi

# Start all services using npm scripts
print_status "Starting all services with hot reloading..."

# Use the existing npm dev script which uses concurrently
npm run dev

cleanup

