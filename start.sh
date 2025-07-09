#!/bin/bash

# =============================================================================
# Codegen App - Comprehensive Start Script
# Single entrypoint with fallback methods, error handling, and full deployment
# =============================================================================

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deployment.log"
PID_FILE="$SCRIPT_DIR/.pids"
HEALTH_CHECK_TIMEOUT=60
MAX_RETRIES=3
RETRY_DELAY=5

# Service configurations
FRONTEND_PORT=8080
SERVER_PORT=8001
BACKEND_PORT=3001

# Operation modes
MODE="full"  # full, minimal, debug, repair
VERBOSE=false
SKIP_DEPS=false
FORCE_RESTART=false

# =============================================================================
# Utility Functions
# =============================================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            if [ "$VERBOSE" = true ]; then
                echo -e "${BLUE}[DEBUG]${NC} $message"
            fi
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                        🚀 CODEGEN APP DEPLOYMENT 🚀                        ║"
    echo "║                                                                              ║"
    echo "║  Single Entrypoint Deployment with AI Agents & Comprehensive Fallbacks     ║"
    echo "║                                                                              ║"
    echo "║  Features:                                                                   ║"
    echo "║  • React Frontend (Port $FRONTEND_PORT)                                                    ║"
    echo "║  • Express Proxy Server (Port $SERVER_PORT)                                              ║"
    echo "║  • AI Automation Backend (Port $BACKEND_PORT)                                            ║"
    echo "║  • Google Gemini AI Agents (PMAgent, SchemaAgent, QAAgent)                  ║"
    echo "║  • Multi-Agent Workflow Orchestrator                                        ║"
    echo "║  • Comprehensive Error Handling & Recovery                                  ║"
    echo "║                                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE        Operation mode: full, minimal, debug, repair (default: full)"
    echo "  -v, --verbose          Enable verbose logging"
    echo "  -s, --skip-deps        Skip dependency installation"
    echo "  -f, --force-restart    Force restart all services"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Modes:"
    echo "  full      - Complete deployment with all services and AI agents"
    echo "  minimal   - Basic deployment without AI agents"
    echo "  debug     - Development mode with detailed logging"
    echo "  repair    - Attempt to repair and restart failed services"
    echo ""
    echo "Examples:"
    echo "  $0                     # Full deployment"
    echo "  $0 -m debug -v        # Debug mode with verbose logging"
    echo "  $0 -m repair -f       # Repair mode with force restart"
}

cleanup_on_exit() {
    log "INFO" "Cleaning up on exit..."
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                log "DEBUG" "Killing process $pid"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
}

trap cleanup_on_exit EXIT INT TERM

# =============================================================================
# System Validation Functions
# =============================================================================

check_system_requirements() {
    log "INFO" "🔍 Checking system requirements..."
    
    local errors=0
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        errors=$((errors + 1))
    else
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo "$node_version" | cut -d. -f1)
        if [ "$major_version" -lt 18 ]; then
            log "ERROR" "Node.js version $node_version is too old. Please install Node.js 18+"
            errors=$((errors + 1))
        else
            log "SUCCESS" "Node.js $node_version detected"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm is not installed. Please install npm"
        errors=$((errors + 1))
    else
        local npm_version=$(npm --version)
        log "SUCCESS" "npm $npm_version detected"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log "WARN" "Git is not installed. Some features may not work properly"
    else
        local git_version=$(git --version | cut -d' ' -f3)
        log "SUCCESS" "Git $git_version detected"
    fi
    
    # Check available ports
    check_port_availability $FRONTEND_PORT "Frontend"
    check_port_availability $SERVER_PORT "Proxy Server"
    check_port_availability $BACKEND_PORT "Backend"
    
    # Check disk space
    local available_space=$(df "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # 1GB in KB
        log "WARN" "Low disk space detected. Available: $(($available_space / 1024))MB"
    fi
    
    # Check memory
    if command -v free &> /dev/null; then
        local available_memory=$(free -m | awk 'NR==2{print $7}')
        if [ "$available_memory" -lt 512 ]; then
            log "WARN" "Low memory detected. Available: ${available_memory}MB"
        fi
    fi
    
    if [ $errors -gt 0 ]; then
        log "ERROR" "System requirements check failed with $errors errors"
        return 1
    fi
    
    log "SUCCESS" "✅ System requirements check passed"
    return 0
}

check_port_availability() {
    local port=$1
    local service_name=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log "WARN" "Port $port is already in use (needed for $service_name)"
            if [ "$FORCE_RESTART" = true ]; then
                log "INFO" "Force restart enabled, will attempt to kill process on port $port"
                local pid=$(lsof -ti:$port)
                if [ -n "$pid" ]; then
                    kill "$pid" 2>/dev/null || true
                    sleep 2
                fi
            fi
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -ln | grep ":$port " >/dev/null 2>&1; then
            log "WARN" "Port $port appears to be in use (needed for $service_name)"
        fi
    fi
}

# =============================================================================
# Environment Setup Functions
# =============================================================================

setup_environment() {
    log "INFO" "🔧 Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log "INFO" "Creating .env file from template..."
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            log "SUCCESS" "Created .env file from .env.example"
        else
            create_default_env_file
        fi
    fi
    
    # Validate environment variables
    validate_environment_variables
    
    # Setup backend environment
    setup_backend_environment
    
    # Setup server environment
    setup_server_environment
    
    log "SUCCESS" "✅ Environment setup completed"
}

create_default_env_file() {
    log "INFO" "Creating default .env file..."
    
    cat > "$SCRIPT_DIR/.env" << EOF
# Codegen API Configuration
REACT_APP_API_TOKEN=your_api_token_here
REACT_APP_DEFAULT_ORGANIZATION=your_org_id_here
REACT_APP_API_BASE_URL=http://localhost:$SERVER_PORT/api
REACT_APP_USER_ID=your_user_id_here
REACT_APP_DEMO_MODE=false

# Google Gemini API Configuration
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8192
GEMINI_SAFETY_SETTINGS=none

# Service Ports
FRONTEND_PORT=$FRONTEND_PORT
SERVER_PORT=$SERVER_PORT
BACKEND_PORT=$BACKEND_PORT
EOF
    
    log "SUCCESS" "Created default .env file"
    log "WARN" "⚠️  Please update .env file with your actual API keys and configuration"
}

validate_environment_variables() {
    log "INFO" "Validating environment variables..."
    
    # Source the .env file
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a  # automatically export all variables
        source "$SCRIPT_DIR/.env"
        set +a
    fi
    
    local warnings=0
    
    # Check critical variables
    if [ -z "$REACT_APP_API_TOKEN" ] || [ "$REACT_APP_API_TOKEN" = "your_api_token_here" ]; then
        log "WARN" "REACT_APP_API_TOKEN not configured - some features may not work"
        warnings=$((warnings + 1))
    fi
    
    if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "your_google_api_key_here" ]; then
        log "WARN" "GOOGLE_API_KEY not configured - AI agents will not work"
        warnings=$((warnings + 1))
    fi
    
    if [ $warnings -gt 0 ]; then
        log "WARN" "Environment validation completed with $warnings warnings"
        if [ "$MODE" != "debug" ]; then
            log "INFO" "Run with --mode debug for detailed environment information"
        fi
    else
        log "SUCCESS" "Environment validation passed"
    fi
}

setup_backend_environment() {
    log "INFO" "Setting up backend environment..."
    
    if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
        if [ -f "$SCRIPT_DIR/backend/.env.example" ]; then
            cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
            log "SUCCESS" "Created backend/.env from template"
        else
            # Create basic backend .env
            cat > "$SCRIPT_DIR/backend/.env" << EOF
PORT=$BACKEND_PORT
NODE_ENV=development
FRONTEND_URL=http://localhost:$FRONTEND_PORT
LOG_LEVEL=info
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
GOOGLE_API_KEY=${GOOGLE_API_KEY:-your_google_api_key_here}
GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.0-flash-exp}
GEMINI_TEMPERATURE=${GEMINI_TEMPERATURE:-0.7}
GEMINI_MAX_TOKENS=${GEMINI_MAX_TOKENS:-8192}
GEMINI_SAFETY_SETTINGS=${GEMINI_SAFETY_SETTINGS:-none}
EOF
            log "SUCCESS" "Created backend/.env file"
        fi
    fi
}

setup_server_environment() {
    log "INFO" "Setting up server environment..."
    
    if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
        if [ -f "$SCRIPT_DIR/server/.env.example" ]; then
            cp "$SCRIPT_DIR/server/.env.example" "$SCRIPT_DIR/server/.env"
            log "SUCCESS" "Created server/.env from template"
        else
            # Create basic server .env
            cat > "$SCRIPT_DIR/server/.env" << EOF
PORT=$SERVER_PORT
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:$FRONTEND_PORT
EOF
            log "SUCCESS" "Created server/.env file"
        fi
    fi
}

# =============================================================================
# Dependency Management Functions
# =============================================================================

install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log "INFO" "Skipping dependency installation"
        return 0
    fi
    
    log "INFO" "📦 Installing dependencies..."
    
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if install_dependencies_attempt; then
            log "SUCCESS" "✅ Dependencies installed successfully"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log "WARN" "Dependency installation failed, retrying in $RETRY_DELAY seconds... (attempt $retry_count/$MAX_RETRIES)"
            sleep $RETRY_DELAY
        fi
    done
    
    log "ERROR" "Failed to install dependencies after $MAX_RETRIES attempts"
    return 1
}

install_dependencies_attempt() {
    log "INFO" "Installing root dependencies..."
    if ! npm install; then
        log "ERROR" "Failed to install root dependencies"
        return 1
    fi
    
    log "INFO" "Installing server dependencies..."
    if ! (cd "$SCRIPT_DIR/server" && npm install); then
        log "ERROR" "Failed to install server dependencies"
        return 1
    fi
    
    log "INFO" "Installing backend dependencies..."
    if ! (cd "$SCRIPT_DIR/backend" && npm install); then
        log "ERROR" "Failed to install backend dependencies"
        return 1
    fi
    
    return 0
}

# =============================================================================
# Service Management Functions
# =============================================================================

start_services() {
    log "INFO" "🚀 Starting services..."
    
    # Clear PID file
    > "$PID_FILE"
    
    # Start services in order
    start_backend_service
    sleep 3
    
    start_server_service
    sleep 3
    
    start_frontend_service
    
    # Wait for all services to be healthy
    wait_for_services_health
    
    log "SUCCESS" "✅ All services started successfully"
}

start_backend_service() {
    log "INFO" "Starting backend automation service..."
    
    cd "$SCRIPT_DIR/backend"
    
    # Start backend service
    if [ "$MODE" = "debug" ]; then
        npm run dev > "$SCRIPT_DIR/backend.log" 2>&1 &
    else
        npm start > "$SCRIPT_DIR/backend.log" 2>&1 &
    fi
    
    local backend_pid=$!
    echo "$backend_pid" >> "$PID_FILE"
    
    log "SUCCESS" "Backend service started (PID: $backend_pid)"
    
    # Wait for backend to be ready
    wait_for_service_health "http://localhost:$BACKEND_PORT/health" "Backend" 30
}

start_server_service() {
    log "INFO" "Starting proxy server..."
    
    cd "$SCRIPT_DIR/server"
    
    # Start server service
    if [ "$MODE" = "debug" ]; then
        npm run dev > "$SCRIPT_DIR/server.log" 2>&1 &
    else
        npm start > "$SCRIPT_DIR/server.log" 2>&1 &
    fi
    
    local server_pid=$!
    echo "$server_pid" >> "$PID_FILE"
    
    log "SUCCESS" "Proxy server started (PID: $server_pid)"
    
    # Wait for server to be ready
    wait_for_service_health "http://localhost:$SERVER_PORT" "Proxy Server" 30
}

start_frontend_service() {
    log "INFO" "Starting frontend application..."
    
    cd "$SCRIPT_DIR"
    
    # Set the port for React
    export PORT=$FRONTEND_PORT
    
    # Start frontend service
    if [ "$MODE" = "debug" ]; then
        npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &
    else
        npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &
    fi
    
    local frontend_pid=$!
    echo "$frontend_pid" >> "$PID_FILE"
    
    log "SUCCESS" "Frontend application started (PID: $frontend_pid)"
    
    # Wait for frontend to be ready
    wait_for_service_health "http://localhost:$FRONTEND_PORT" "Frontend" 60
}

wait_for_service_health() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    local elapsed=0
    
    log "INFO" "Waiting for $service_name to be healthy..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log "SUCCESS" "$service_name is healthy"
            return 0
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
        
        if [ $((elapsed % 10)) -eq 0 ]; then
            log "DEBUG" "Still waiting for $service_name... (${elapsed}s/${timeout}s)"
        fi
    done
    
    log "ERROR" "$service_name failed to become healthy within ${timeout}s"
    return 1
}

wait_for_services_health() {
    log "INFO" "Performing final health checks..."
    
    local all_healthy=true
    
    # Check backend
    if ! curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        log "ERROR" "Backend service is not healthy"
        all_healthy=false
    fi
    
    # Check server
    if ! curl -s "http://localhost:$SERVER_PORT" >/dev/null 2>&1; then
        log "ERROR" "Proxy server is not healthy"
        all_healthy=false
    fi
    
    # Check frontend
    if ! curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        log "ERROR" "Frontend is not healthy"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        log "SUCCESS" "All services are healthy"
        return 0
    else
        log "ERROR" "Some services are not healthy"
        return 1
    fi
}

# =============================================================================
# AI Agents Testing Functions
# =============================================================================

test_ai_agents() {
    if [ "$MODE" = "minimal" ]; then
        log "INFO" "Skipping AI agents testing in minimal mode"
        return 0
    fi
    
    log "INFO" "🤖 Testing AI agents..."
    
    # Test agents status
    test_agents_status
    
    # Test individual agents if in debug mode
    if [ "$MODE" = "debug" ]; then
        test_individual_agents
    fi
    
    log "SUCCESS" "✅ AI agents testing completed"
}

test_agents_status() {
    log "INFO" "Testing AI agents status endpoint..."
    
    local response=$(curl -s "http://localhost:$BACKEND_PORT/api/agents/status" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | grep -q '"success":true'; then
        log "SUCCESS" "AI agents status endpoint is working"
        
        if [ "$VERBOSE" = true ]; then
            log "DEBUG" "Agents status response: $response"
        fi
    else
        log "ERROR" "AI agents status endpoint failed"
        return 1
    fi
}

test_individual_agents() {
    log "INFO" "Testing individual AI agents..."
    
    # Test PMAgent
    test_agent_endpoint "pm-agent" "stats"
    
    # Test SchemaAgent
    test_agent_endpoint "schema-agent" "stats"
    
    # Test QAAgent
    test_agent_endpoint "qa-agent" "stats"
    
    # Test Orchestrator
    test_agent_endpoint "orchestrator" "stats"
}

test_agent_endpoint() {
    local agent=$1
    local endpoint=$2
    
    log "DEBUG" "Testing $agent/$endpoint endpoint..."
    
    local response=$(curl -s "http://localhost:$BACKEND_PORT/api/$agent/$endpoint" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | grep -q '"success":true'; then
        log "SUCCESS" "$agent/$endpoint endpoint is working"
    else
        log "WARN" "$agent/$endpoint endpoint failed or returned error"
    fi
}

# =============================================================================
# Monitoring and Status Functions
# =============================================================================

show_deployment_status() {
    log "INFO" "📊 Deployment Status Report"
    echo ""
    
    # Service status
    echo -e "${CYAN}🔧 Service Status:${NC}"
    check_service_status "Frontend" "http://localhost:$FRONTEND_PORT"
    check_service_status "Proxy Server" "http://localhost:$SERVER_PORT"
    check_service_status "Backend" "http://localhost:$BACKEND_PORT/health"
    echo ""
    
    # AI Agents status
    if [ "$MODE" != "minimal" ]; then
        echo -e "${CYAN}🤖 AI Agents Status:${NC}"
        check_ai_agents_status
        echo ""
    fi
    
    # URLs
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "  Frontend:      ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  API Proxy:     ${GREEN}http://localhost:$SERVER_PORT${NC}"
    echo -e "  Backend API:   ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    if [ "$MODE" != "minimal" ]; then
        echo -e "  AI Agents:     ${GREEN}http://localhost:$BACKEND_PORT/api/agents/status${NC}"
    fi
    echo ""
    
    # Logs
    echo -e "${CYAN}📋 Log Files:${NC}"
    echo -e "  Deployment:    ${BLUE}$LOG_FILE${NC}"
    echo -e "  Frontend:      ${BLUE}$SCRIPT_DIR/frontend.log${NC}"
    echo -e "  Server:        ${BLUE}$SCRIPT_DIR/server.log${NC}"
    echo -e "  Backend:       ${BLUE}$SCRIPT_DIR/backend.log${NC}"
    echo ""
    
    # Process information
    if [ -f "$PID_FILE" ] && [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}🔍 Process Information:${NC}"
        while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                local cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                echo -e "  PID $pid: $cmd"
            fi
        done < "$PID_FILE"
        echo ""
    fi
}

check_service_status() {
    local service_name=$1
    local url=$2
    
    if curl -s "$url" >/dev/null 2>&1; then
        echo -e "  ✅ $service_name: ${GREEN}Running${NC}"
    else
        echo -e "  ❌ $service_name: ${RED}Not responding${NC}"
    fi
}

check_ai_agents_status() {
    local response=$(curl -s "http://localhost:$BACKEND_PORT/api/agents/status" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$response" | grep -q '"success":true'; then
        echo -e "  ✅ AI Agents API: ${GREEN}Available${NC}"
        
        # Check Gemini API configuration
        if echo "$response" | grep -q '"configured":true'; then
            echo -e "  ✅ Gemini API: ${GREEN}Configured${NC}"
        else
            echo -e "  ⚠️  Gemini API: ${YELLOW}Not configured${NC}"
        fi
        
        # List available agents
        echo -e "  📋 Available Agents:"
        echo -e "     • PMAgent (Project Manager)"
        echo -e "     • SchemaAgent (Database Schema Builder)"
        echo -e "     • QAAgent (SQL Query & DDL Generator)"
        echo -e "     • Orchestrator (Multi-Agent Workflows)"
    else
        echo -e "  ❌ AI Agents API: ${RED}Not available${NC}"
    fi
}

# =============================================================================
# Repair and Recovery Functions
# =============================================================================

repair_services() {
    log "INFO" "🔧 Attempting to repair services..."
    
    # Stop all services first
    stop_all_services
    
    # Clear logs
    rm -f "$SCRIPT_DIR"/*.log
    
    # Reinstall dependencies if needed
    if [ "$SKIP_DEPS" != true ]; then
        log "INFO" "Reinstalling dependencies..."
        install_dependencies
    fi
    
    # Restart services
    start_services
    
    log "SUCCESS" "✅ Service repair completed"
}

stop_all_services() {
    log "INFO" "Stopping all services..."
    
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                log "DEBUG" "Stopping process $pid"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining processes on our ports
    for port in $FRONTEND_PORT $SERVER_PORT $BACKEND_PORT; do
        if command -v lsof &> /dev/null; then
            local pids=$(lsof -ti:$port 2>/dev/null || true)
            if [ -n "$pids" ]; then
                echo "$pids" | xargs kill 2>/dev/null || true
            fi
        fi
    done
    
    sleep 3
    log "SUCCESS" "All services stopped"
}

# =============================================================================
# Main Execution Functions
# =============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--mode)
                MODE="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            -f|--force-restart)
                FORCE_RESTART=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate mode
    case $MODE in
        full|minimal|debug|repair)
            ;;
        *)
            log "ERROR" "Invalid mode: $MODE"
            show_usage
            exit 1
            ;;
    esac
}

main() {
    # Initialize logging
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Starting Codegen App deployment..." > "$LOG_FILE"
    
    print_banner
    
    log "INFO" "🚀 Starting Codegen App deployment in $MODE mode..."
    log "INFO" "📝 Logging to: $LOG_FILE"
    
    # Phase 1: System Validation
    log "INFO" "📋 Phase 1: System Validation"
    if ! check_system_requirements; then
        log "ERROR" "System requirements check failed"
        exit 1
    fi
    
    # Phase 2: Environment Setup
    log "INFO" "📋 Phase 2: Environment Setup"
    setup_environment
    
    # Phase 3: Dependency Installation
    log "INFO" "📋 Phase 3: Dependency Installation"
    if ! install_dependencies; then
        log "ERROR" "Dependency installation failed"
        exit 1
    fi
    
    # Phase 4: Service Management
    log "INFO" "📋 Phase 4: Service Management"
    case $MODE in
        repair)
            repair_services
            ;;
        *)
            start_services
            ;;
    esac
    
    # Phase 5: AI Agents Testing
    log "INFO" "📋 Phase 5: AI Agents Testing"
    test_ai_agents
    
    # Phase 6: Final Status Report
    log "INFO" "📋 Phase 6: Deployment Complete"
    show_deployment_status
    
    log "SUCCESS" "🎉 Codegen App deployment completed successfully!"
    log "INFO" "🌐 Application is now available at: http://localhost:$FRONTEND_PORT"
    
    if [ "$MODE" = "debug" ]; then
        log "INFO" "🔍 Debug mode: Monitoring services... (Press Ctrl+C to stop)"
        while true; do
            sleep 30
            log "DEBUG" "Service health check..."
            if ! wait_for_services_health; then
                log "WARN" "Some services are unhealthy, attempting repair..."
                repair_services
            fi
        done
    fi
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Parse command line arguments
parse_arguments "$@"

# Change to script directory
cd "$SCRIPT_DIR"

# Run main function
main

exit 0

