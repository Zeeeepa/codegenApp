#!/bin/bash

# Start Development Environment Script
# This script ensures all services start in the correct order

echo "🚀 Starting CodegenApp Development Environment..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to start on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health >/dev/null 2>&1 || curl -s http://localhost:$port >/dev/null 2>&1; then
            echo "✅ $service_name is ready on port $port"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start within expected time"
    return 1
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start backend automation service (port 3500)
echo "🔧 Starting backend automation service..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
if ! wait_for_service 3500 "Backend Automation Service"; then
    echo "❌ Failed to start backend service"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start server proxy (port 3001)
echo "🌐 Starting server proxy..."
cd server
npm start &
SERVER_PID=$!
cd ..

# Wait for server to be ready
if ! wait_for_service 3001 "Server Proxy"; then
    echo "❌ Failed to start server proxy"
    kill $BACKEND_PID $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start React frontend (port 8080)
echo "⚛️  Starting React frontend..."
PORT=8080 npm start &
FRONTEND_PID=$!

# Wait for frontend to be ready
if ! wait_for_service 8080 "React Frontend"; then
    echo "❌ Failed to start React frontend"
    kill $BACKEND_PID $SERVER_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 All services are running!"
echo "   📱 Frontend: http://localhost:8080"
echo "   🌐 Server Proxy: http://localhost:3001"
echo "   🔧 Backend Automation: http://localhost:3500"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $SERVER_PID $FRONTEND_PID 2>/dev/null || true
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "node.*index.js" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait

