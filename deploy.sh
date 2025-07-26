#!/bin/bash

# CodegenApp Full Deployment Script
# This script sets up and starts both UI and backend in fully working mode

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
UI_PORT=3002
SERVER_PORT=3001
BACKEND_PORT=8000
PROJECT_NAME="CodegenApp"
LOG_DIR="./logs"
PID_DIR="./pids"

# Create necessary directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to check system requirements
check_requirements() {
    print_header "CHECKING SYSTEM REQUIREMENTS"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_success "Node.js found: $node_version"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        print_success "npm found: $npm_version"
    else
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Python
    if command -v python3 >/dev/null 2>&1; then
        local python_version=$(python3 --version)
        print_success "Python found: $python_version"
    else
        print_error "Python 3 is not installed. Please install Python 3.8+ and try again."
        exit 1
    fi
    
    # Check pip
    if command -v pip3 >/dev/null 2>&1; then
        local pip_version=$(pip3 --version)
        print_success "pip found: $pip_version"
    else
        print_error "pip3 is not installed. Please install pip3 and try again."
        exit 1
    fi
    
    # Check curl
    if ! command -v curl >/dev/null 2>&1; then
        print_error "curl is not installed. Please install curl and try again."
        exit 1
    fi
    
    # Check lsof
    if ! command -v lsof >/dev/null 2>&1; then
        print_warning "lsof is not installed. Port checking may not work properly."
    fi
    
    print_success "All system requirements satisfied!"
}

# Function to setup environment
setup_environment() {
    print_header "SETTING UP ENVIRONMENT"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_status "Creating .env from .env.example..."
            cp .env.example .env
            print_warning "Please update .env with your actual API keys and configuration"
        else
            print_warning "No .env file found. Creating basic .env file..."
            cat > .env << EOF
# CodegenApp Environment Configuration
NODE_ENV=development

# API Configuration
REACT_APP_CODEGEN_API_BASE_URL=https://api.codegen.com
REACT_APP_CODEGEN_API_KEY=your-codegen-api-key-here
REACT_APP_CODEGEN_ORG_ID=your-org-id-here

# GitHub Configuration
REACT_APP_GITHUB_TOKEN=your-github-token-here
GITHUB_TOKEN=your-github-token-here

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
SERVER_PORT=3001
UI_PORT=3002
BACKEND_PORT=8000

# CORS Configuration
CORS_ORIGIN=http://localhost:3002
EOF
            print_warning "Created basic .env file. Please update with your actual API keys."
        fi
    else
        print_success ".env file already exists"
    fi
    
    # Setup server environment
    if [ ! -f "server/.env" ]; then
        print_status "Setting up server environment..."
        cp .env server/.env 2>/dev/null || true
        if [ -f "server/.env.example" ]; then
            cp server/.env.example server/.env
        fi
    fi
    
    # Setup backend environment
    if [ ! -f "backend/.env" ]; then
        print_status "Setting up backend environment..."
        cp .env backend/.env 2>/dev/null || true
    fi
}

# Function to install dependencies
install_dependencies() {
    print_header "INSTALLING DEPENDENCIES"
    
    # Install UI dependencies
    print_status "Installing UI dependencies..."
    if npm install; then
        print_success "UI dependencies installed successfully"
    else
        print_error "Failed to install UI dependencies"
        exit 1
    fi
    
    # Install server dependencies
    print_status "Installing server dependencies..."
    cd server
    if npm install; then
        print_success "Server dependencies installed successfully"
    else
        print_error "Failed to install server dependencies"
        exit 1
    fi
    cd ..
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    if python3 -m pip install -r requirements.txt; then
        print_success "Backend dependencies installed successfully"
    else
        print_warning "Some backend dependencies may have failed to install"
        print_status "Continuing with deployment..."
    fi
    cd ..
}

# Function to build UI
build_ui() {
    print_header "BUILDING UI"
    
    print_status "Building React application..."
    if npm run build; then
        print_success "UI build completed successfully"
    else
        print_error "UI build failed"
        exit 1
    fi
}

# Function to start backend
start_backend() {
    print_header "STARTING BACKEND"
    
    # Kill any existing backend process
    kill_port $BACKEND_PORT
    
    print_status "Starting Python FastAPI backend on port $BACKEND_PORT..."
    cd backend
    
    # Start backend in background
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > "../$LOG_DIR/backend.log" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "../$PID_DIR/backend.pid"
    
    cd ..
    
    print_status "Backend started with PID: $backend_pid"
    
    # Wait for backend to be ready
    if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend API"; then
        print_success "Backend is running successfully on http://localhost:$BACKEND_PORT"
    else
        print_warning "Backend may not be fully ready, but continuing..."
    fi
}

# Function to start server
start_server() {
    print_header "STARTING SERVER"
    
    # Kill any existing server process
    kill_port $SERVER_PORT
    
    print_status "Starting Node.js proxy server on port $SERVER_PORT..."
    cd server
    
    # Start server in background
    nohup npm start > "../$LOG_DIR/server.log" 2>&1 &
    local server_pid=$!
    echo $server_pid > "../$PID_DIR/server.pid"
    
    cd ..
    
    print_status "Server started with PID: $server_pid"
    
    # Wait for server to be ready
    if wait_for_service "http://localhost:$SERVER_PORT" "Proxy Server"; then
        print_success "Server is running successfully on http://localhost:$SERVER_PORT"
    else
        print_warning "Server may not be fully ready, but continuing..."
    fi
}

# Function to start UI
start_ui() {
    print_header "STARTING UI"
    
    # Kill any existing UI process
    kill_port $UI_PORT
    
    print_status "Starting React development server on port $UI_PORT..."
    
    # Start UI in background
    nohup npm start > "$LOG_DIR/ui.log" 2>&1 &
    local ui_pid=$!
    echo $ui_pid > "$PID_DIR/ui.pid"
    
    print_status "UI started with PID: $ui_pid"
    
    # Wait for UI to be ready
    if wait_for_service "http://localhost:$UI_PORT" "React UI"; then
        print_success "UI is running successfully on http://localhost:$UI_PORT"
    else
        print_warning "UI may not be fully ready, but continuing..."
    fi
}

# Function to run health checks
run_health_checks() {
    print_header "RUNNING HEALTH CHECKS"
    
    local all_healthy=true
    
    # Check Backend
    print_status "Checking backend health..."
    if curl -s -f "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        print_success "✅ Backend is healthy"
    else
        print_warning "⚠️  Backend health check failed"
        all_healthy=false
    fi
    
    # Check Server
    print_status "Checking server health..."
    if curl -s -f "http://localhost:$SERVER_PORT" >/dev/null 2>&1; then
        print_success "✅ Server is healthy"
    else
        print_warning "⚠️  Server health check failed"
        all_healthy=false
    fi
    
    # Check UI
    print_status "Checking UI health..."
    if curl -s -f "http://localhost:$UI_PORT" >/dev/null 2>&1; then
        print_success "✅ UI is healthy"
    else
        print_warning "⚠️  UI health check failed"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        print_success "🎉 All services are healthy!"
    else
        print_warning "⚠️  Some services may have issues. Check logs for details."
    fi
}

# Function to run comprehensive tests
run_tests() {
    print_header "RUNNING COMPREHENSIVE TESTS"
    
    print_status "Running zero-error test suite..."
    if node zero-error-test.js; then
        print_success "✅ Zero-error tests passed"
    else
        print_warning "⚠️  Zero-error tests had issues"
    fi
    
    print_status "Running web evaluation tests..."
    if node web-eval-demo.js; then
        print_success "✅ Web evaluation tests passed"
    else
        print_warning "⚠️  Web evaluation tests had issues"
    fi
    
    print_status "Running detailed UI tests..."
    if node detailed-ui-test.js; then
        print_success "✅ Detailed UI tests passed"
    else
        print_warning "⚠️  Detailed UI tests had issues"
    fi
}

# Function to display deployment summary
show_deployment_summary() {
    print_header "DEPLOYMENT SUMMARY"
    
    echo -e "${CYAN}🚀 CodegenApp Deployment Complete!${NC}"
    echo ""
    echo -e "${GREEN}📱 UI (React):${NC}          http://localhost:$UI_PORT"
    echo -e "${GREEN}🔧 Server (Node.js):${NC}    http://localhost:$SERVER_PORT"
    echo -e "${GREEN}🐍 Backend (FastAPI):${NC}   http://localhost:$BACKEND_PORT"
    echo ""
    echo -e "${YELLOW}📊 Service Status:${NC}"
    
    # Check and display service status
    if check_port $UI_PORT; then
        echo -e "   UI:      ${GREEN}✅ Running${NC}"
    else
        echo -e "   UI:      ${RED}❌ Not Running${NC}"
    fi
    
    if check_port $SERVER_PORT; then
        echo -e "   Server:  ${GREEN}✅ Running${NC}"
    else
        echo -e "   Server:  ${RED}❌ Not Running${NC}"
    fi
    
    if check_port $BACKEND_PORT; then
        echo -e "   Backend: ${GREEN}✅ Running${NC}"
    else
        echo -e "   Backend: ${RED}❌ Not Running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📁 Log Files:${NC}"
    echo -e "   UI:      $LOG_DIR/ui.log"
    echo -e "   Server:  $LOG_DIR/server.log"
    echo -e "   Backend: $LOG_DIR/backend.log"
    echo ""
    echo -e "${BLUE}🔧 PID Files:${NC}"
    echo -e "   UI:      $PID_DIR/ui.pid"
    echo -e "   Server:  $PID_DIR/server.pid"
    echo -e "   Backend: $PID_DIR/backend.pid"
    echo ""
    echo -e "${PURPLE}🛠️  Management Commands:${NC}"
    echo -e "   Stop all:    ./deploy.sh stop"
    echo -e "   Restart:     ./deploy.sh restart"
    echo -e "   Status:      ./deploy.sh status"
    echo -e "   Logs:        ./deploy.sh logs"
    echo -e "   Test:        ./deploy.sh test"
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${CYAN}Visit http://localhost:$UI_PORT to access the application${NC}"
}

# Function to stop all services
stop_services() {
    print_header "STOPPING ALL SERVICES"
    
    # Stop UI
    if [ -f "$PID_DIR/ui.pid" ]; then
        local ui_pid=$(cat "$PID_DIR/ui.pid")
        if kill -0 $ui_pid 2>/dev/null; then
            print_status "Stopping UI (PID: $ui_pid)..."
            kill $ui_pid 2>/dev/null || true
            rm -f "$PID_DIR/ui.pid"
        fi
    fi
    kill_port $UI_PORT
    
    # Stop Server
    if [ -f "$PID_DIR/server.pid" ]; then
        local server_pid=$(cat "$PID_DIR/server.pid")
        if kill -0 $server_pid 2>/dev/null; then
            print_status "Stopping Server (PID: $server_pid)..."
            kill $server_pid 2>/dev/null || true
            rm -f "$PID_DIR/server.pid"
        fi
    fi
    kill_port $SERVER_PORT
    
    # Stop Backend
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            print_status "Stopping Backend (PID: $backend_pid)..."
            kill $backend_pid 2>/dev/null || true
            rm -f "$PID_DIR/backend.pid"
        fi
    fi
    kill_port $BACKEND_PORT
    
    print_success "All services stopped"
}

# Function to show service status
show_status() {
    print_header "SERVICE STATUS"
    
    echo -e "${CYAN}CodegenApp Service Status${NC}"
    echo ""
    
    # Check UI
    if check_port $UI_PORT; then
        echo -e "${GREEN}✅ UI (React):${NC}          Running on http://localhost:$UI_PORT"
    else
        echo -e "${RED}❌ UI (React):${NC}          Not running"
    fi
    
    # Check Server
    if check_port $SERVER_PORT; then
        echo -e "${GREEN}✅ Server (Node.js):${NC}    Running on http://localhost:$SERVER_PORT"
    else
        echo -e "${RED}❌ Server (Node.js):${NC}    Not running"
    fi
    
    # Check Backend
    if check_port $BACKEND_PORT; then
        echo -e "${GREEN}✅ Backend (FastAPI):${NC}   Running on http://localhost:$BACKEND_PORT"
    else
        echo -e "${RED}❌ Backend (FastAPI):${NC}   Not running"
    fi
    
    echo ""
    
    # Show process information
    echo -e "${BLUE}Process Information:${NC}"
    if [ -f "$PID_DIR/ui.pid" ]; then
        local ui_pid=$(cat "$PID_DIR/ui.pid")
        if kill -0 $ui_pid 2>/dev/null; then
            echo -e "   UI PID:      $ui_pid (running)"
        else
            echo -e "   UI PID:      $ui_pid (not running)"
        fi
    else
        echo -e "   UI PID:      No PID file"
    fi
    
    if [ -f "$PID_DIR/server.pid" ]; then
        local server_pid=$(cat "$PID_DIR/server.pid")
        if kill -0 $server_pid 2>/dev/null; then
            echo -e "   Server PID:  $server_pid (running)"
        else
            echo -e "   Server PID:  $server_pid (not running)"
        fi
    else
        echo -e "   Server PID:  No PID file"
    fi
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            echo -e "   Backend PID: $backend_pid (running)"
        else
            echo -e "   Backend PID: $backend_pid (not running)"
        fi
    else
        echo -e "   Backend PID: No PID file"
    fi
}

# Function to show logs
show_logs() {
    print_header "SERVICE LOGS"
    
    local service=${1:-"all"}
    
    case $service in
        "ui")
            if [ -f "$LOG_DIR/ui.log" ]; then
                echo -e "${CYAN}UI Logs (last 50 lines):${NC}"
                tail -n 50 "$LOG_DIR/ui.log"
            else
                print_warning "UI log file not found"
            fi
            ;;
        "server")
            if [ -f "$LOG_DIR/server.log" ]; then
                echo -e "${CYAN}Server Logs (last 50 lines):${NC}"
                tail -n 50 "$LOG_DIR/server.log"
            else
                print_warning "Server log file not found"
            fi
            ;;
        "backend")
            if [ -f "$LOG_DIR/backend.log" ]; then
                echo -e "${CYAN}Backend Logs (last 50 lines):${NC}"
                tail -n 50 "$LOG_DIR/backend.log"
            else
                print_warning "Backend log file not found"
            fi
            ;;
        "all"|*)
            show_logs "ui"
            echo ""
            show_logs "server"
            echo ""
            show_logs "backend"
            ;;
    esac
}

# Function to show help
show_help() {
    echo -e "${CYAN}CodegenApp Deployment Script${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ./deploy.sh [command]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}     Start all services (default)"
    echo -e "  ${GREEN}stop${NC}      Stop all services"
    echo -e "  ${GREEN}restart${NC}   Restart all services"
    echo -e "  ${GREEN}status${NC}    Show service status"
    echo -e "  ${GREEN}logs${NC}      Show logs for all services"
    echo -e "  ${GREEN}logs ui${NC}   Show UI logs only"
    echo -e "  ${GREEN}logs server${NC} Show server logs only"
    echo -e "  ${GREEN}logs backend${NC} Show backend logs only"
    echo -e "  ${GREEN}test${NC}      Run comprehensive tests"
    echo -e "  ${GREEN}health${NC}    Run health checks"
    echo -e "  ${GREEN}help${NC}      Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ./deploy.sh              # Start all services"
    echo -e "  ./deploy.sh stop         # Stop all services"
    echo -e "  ./deploy.sh restart      # Restart all services"
    echo -e "  ./deploy.sh status       # Check service status"
    echo -e "  ./deploy.sh logs ui      # Show UI logs"
    echo -e "  ./deploy.sh test         # Run tests"
}

# Main deployment function
main_deploy() {
    print_header "CODEGENAPP FULL DEPLOYMENT"
    
    check_requirements
    setup_environment
    install_dependencies
    build_ui
    start_backend
    start_server
    start_ui
    
    # Wait a bit for all services to stabilize
    print_status "Waiting for services to stabilize..."
    sleep 5
    
    run_health_checks
    show_deployment_summary
}

# Main script logic
case "${1:-start}" in
    "start")
        main_deploy
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 3
        main_deploy
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "test")
        run_tests
        ;;
    "health")
        run_health_checks
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

