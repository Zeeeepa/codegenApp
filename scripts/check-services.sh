#!/bin/bash

# Service status check script for CodegenApp
echo "🔍 Checking CodegenApp Services Status..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Check backend service
check_backend() {
    echo ""
    print_status "Backend Automation Service Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check PM2 status
    if command -v pm2 &> /dev/null; then
        if pm2 status automation-backend 2>/dev/null | grep -q "automation-backend"; then
            pm2 status automation-backend
            echo ""
            
            # Check if service is actually responding
            if curl -s http://localhost:3001/health > /dev/null; then
                print_success "Backend service is running and responding"
                
                # Get health details
                HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
                echo "Health Status: $HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "Health Status: $HEALTH_RESPONSE"
            else
                print_error "Backend service is running but not responding to health checks"
            fi
        else
            print_error "Backend service is not running in PM2"
        fi
    else
        print_warning "PM2 not found - cannot check backend service status"
    fi
    
    # Check if port is in use
    if lsof -i :3002 > /dev/null 2>&1; then
        print_info "Port 3002 is in use"
        lsof -i :3002
    else
        print_warning "Port 3002 is not in use"
    fi
}

# Check frontend service
check_frontend() {
    echo ""
    print_status "Frontend Development Server Status:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check PID file
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend service is running (PID: $FRONTEND_PID)"
        else
            print_error "Frontend PID file exists but process is not running"
            rm -f .frontend.pid
        fi
    else
        print_warning "Frontend PID file not found"
    fi
    
    # Check for React dev server processes
    if pgrep -f "react-scripts start" > /dev/null; then
        print_info "React development server processes found:"
        pgrep -f "react-scripts start" | while read pid; do
            echo "  PID: $pid"
        done
    else
        print_warning "No React development server processes found"
    fi
    
    # Check if frontend is responding
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Frontend is responding on port 3000"
    else
        print_error "Frontend is not responding on port 3000"
    fi
    
    # Check if port is in use
    if lsof -i :3000 > /dev/null 2>&1; then
        print_info "Port 3000 is in use"
        lsof -i :3000
    else
        print_warning "Port 3000 is not in use"
    fi
}

# Check service connectivity
check_connectivity() {
    echo ""
    print_status "Service Connectivity Check:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Test backend endpoints
    echo "Testing backend endpoints:"
    
    # Health endpoint
    if curl -s -w "Response time: %{time_total}s\n" http://localhost:3001/health > /dev/null; then
        print_success "Health endpoint: OK"
        RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3001/health)
        echo "  Response time: ${RESPONSE_TIME}s"
    else
        print_error "Health endpoint: FAILED"
    fi
    
    # Metrics endpoint
    if curl -s http://localhost:3001/metrics > /dev/null; then
        print_success "Metrics endpoint: OK"
    else
        print_error "Metrics endpoint: FAILED"
    fi
    
    # Ready endpoint
    if curl -s http://localhost:3001/ready > /dev/null; then
        print_success "Ready endpoint: OK"
    else
        print_warning "Ready endpoint: Not ready or failed"
    fi
    
    echo ""
    echo "Testing frontend proxy connectivity:"
    
    # Test proxy to backend through frontend
    if curl -s http://localhost:3000/automation/health > /dev/null; then
        print_success "Frontend -> Backend proxy: OK"
    else
        print_error "Frontend -> Backend proxy: FAILED"
    fi
}

# Check system resources
check_resources() {
    echo ""
    print_status "System Resources:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Memory usage
    echo "Memory Usage:"
    free -h | head -2
    echo ""
    
    # Disk usage for logs
    echo "Log Directory Disk Usage:"
    if [ -d "backend/logs" ]; then
        du -sh backend/logs/*
    else
        print_warning "Backend logs directory not found"
    fi
    echo ""
    
    # Node.js processes
    echo "Node.js Processes:"
    ps aux | grep -E "(node|npm)" | grep -v grep | head -10
}

# Check logs
check_logs() {
    echo ""
    print_status "Recent Log Entries:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Backend logs
    if [ -d "backend/logs" ]; then
        echo "Recent backend errors (last 5):"
        find backend/logs -name "error-*.log" -type f -exec tail -5 {} \; 2>/dev/null | tail -5
        echo ""
        
        echo "Recent backend activity (last 10):"
        find backend/logs -name "combined-*.log" -type f -exec tail -10 {} \; 2>/dev/null | tail -10
    else
        print_warning "Backend logs directory not found"
    fi
    
    # PM2 logs
    if command -v pm2 &> /dev/null; then
        echo ""
        echo "Recent PM2 logs (last 5):"
        pm2 logs automation-backend --lines 5 --nostream 2>/dev/null || print_warning "No PM2 logs available"
    fi
}

# Generate summary report
generate_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_status "SUMMARY REPORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Overall status
    BACKEND_OK=false
    FRONTEND_OK=false
    PROXY_OK=false
    
    # Check backend
    if curl -s http://localhost:3001/health > /dev/null; then
        BACKEND_OK=true
        print_success "Backend Service: HEALTHY"
    else
        print_error "Backend Service: UNHEALTHY"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null; then
        FRONTEND_OK=true
        print_success "Frontend Service: HEALTHY"
    else
        print_error "Frontend Service: UNHEALTHY"
    fi
    
    # Check proxy
    if curl -s http://localhost:3000/automation/health > /dev/null; then
        PROXY_OK=true
        print_success "Proxy Connection: HEALTHY"
    else
        print_error "Proxy Connection: UNHEALTHY"
    fi
    
    echo ""
    
    # Service URLs
    echo "🔗 Service URLs:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:3001"
    echo "   Health:    http://localhost:3001/health"
    echo "   Metrics:   http://localhost:3001/metrics"
    echo ""
    
    # Recommendations
    echo "📋 Recommendations:"
    if [ "$BACKEND_OK" = false ]; then
        echo "   • Start backend service: cd backend && ./start.sh"
    fi
    if [ "$FRONTEND_OK" = false ]; then
        echo "   • Start frontend service: npm start"
    fi
    if [ "$PROXY_OK" = false ] && [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
        echo "   • Check proxy configuration in src/setupProxy.js"
    fi
    
    if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ] && [ "$PROXY_OK" = true ]; then
        print_success "All services are healthy! 🎉"
    fi
}

# Main execution
main() {
    print_status "CodegenApp Service Status Check"
    
    case "$1" in
        --backend|-b)
            check_backend
            ;;
        --frontend|-f)
            check_frontend
            ;;
        --connectivity|-c)
            check_connectivity
            ;;
        --resources|-r)
            check_resources
            ;;
        --logs|-l)
            check_logs
            ;;
        --summary|-s)
            generate_summary
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backend, -b      Check backend service only"
            echo "  --frontend, -f     Check frontend service only"
            echo "  --connectivity, -c Check service connectivity"
            echo "  --resources, -r    Check system resources"
            echo "  --logs, -l         Check recent logs"
            echo "  --summary, -s      Generate summary report only"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 # Full status check"
            echo "  $0 --backend       # Check backend only"
            echo "  $0 --summary       # Quick summary"
            exit 0
            ;;
        *)
            # Full check by default
            check_backend
            check_frontend
            check_connectivity
            check_resources
            check_logs
            generate_summary
            ;;
    esac
}

# Run main function
main "$@"

