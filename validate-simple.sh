#!/bin/bash

# Simple deployment validation script for codegenApp
# Tests critical functionality using curl

BACKEND_PORT=3004
FRONTEND_PORT=8080
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${BLUE}[${timestamp}] ${message}${NC}" ;;
        "PASS")  echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}"; ((PASSED++)) ;;
        "FAIL")  echo -e "${RED}[${timestamp}] ❌ ${message}${NC}"; ((FAILED++)) ;;
        "WARN")  echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
    esac
}

test_endpoint() {
    local url=$1
    local test_name=$2
    local expected_status=${3:-200}
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null)
    local status_code=${response: -3}
    
    if [ "$status_code" = "$expected_status" ]; then
        log "PASS" "$test_name: Status $status_code"
        return 0
    else
        log "FAIL" "$test_name: Expected $expected_status, got $status_code"
        return 1
    fi
}

test_json_endpoint() {
    local url=$1
    local test_name=$2
    local expected_field=$3
    
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "\"$expected_field\""; then
        log "PASS" "$test_name: JSON contains '$expected_field'"
        return 0
    else
        log "FAIL" "$test_name: JSON missing '$expected_field'. Response: $response"
        return 1
    fi
}

check_port() {
    local port=$1
    local service_name=$2
    
    if ss -tln 2>/dev/null | grep -q ":$port "; then
        log "PASS" "$service_name running on port $port"
        return 0
    else
        log "FAIL" "$service_name not running on port $port"
        return 1
    fi
}

# Main validation
log "INFO" "🚀 Starting codegenApp Deployment Validation"
log "INFO" "============================================================"

# 1. Check if services are running
log "INFO" "📋 Checking running processes..."
check_port $BACKEND_PORT "Backend Server"
check_port $FRONTEND_PORT "Frontend Server"

# 2. Test basic connectivity
log "INFO" "🌐 Testing basic connectivity..."
test_endpoint "$BACKEND_URL" "Backend Connectivity (Root - Expected 404)" 404
test_endpoint "$FRONTEND_URL" "Frontend Connectivity"

# 3. Test API endpoints
log "INFO" "🔍 Testing API endpoints..."
test_json_endpoint "$BACKEND_URL/health" "Backend Health Check" "status"

# 4. Test proxy configuration
log "INFO" "🔄 Testing proxy configuration..."
# The backend health endpoint is at /health, but proxy routes are /api/v1/* and /v1/*
# Let's test if the proxy can reach the backend health endpoint through /v1/health
test_endpoint "$FRONTEND_URL/v1/health" "Frontend Proxy to Backend (/v1/health)"

# 5. Test CORS headers
log "INFO" "🌍 Testing CORS configuration..."
cors_headers=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$cors_headers" ]; then
    log "PASS" "CORS headers present: $cors_headers"
else
    log "FAIL" "CORS headers missing"
fi

# 6. Test if frontend serves content
log "INFO" "📄 Testing frontend content..."
frontend_content=$(curl -s "$FRONTEND_URL" | head -c 100)
if echo "$frontend_content" | grep -q -i "html\|react\|<!DOCTYPE"; then
    log "PASS" "Frontend serving HTML content"
else
    log "FAIL" "Frontend not serving expected content"
fi

# Results summary
log "INFO" "============================================================"
log "INFO" "📊 VALIDATION RESULTS"
log "INFO" "============================================================"

if [ $FAILED -eq 0 ]; then
    log "PASS" "🎉 All tests passed! Deployment is ready."
    log "INFO" "🌐 Frontend: $FRONTEND_URL"
    log "INFO" "🔧 Backend: $BACKEND_URL"
    log "INFO" "💡 Health Check: $BACKEND_URL/health"
    
    echo ""
    log "INFO" "🔗 Quick Test Commands:"
    echo "  curl $BACKEND_URL/health"
    echo "  curl $FRONTEND_URL/api/health"
    echo "  open $FRONTEND_URL"
    
    exit 0
else
    log "WARN" "⚠️  $FAILED tests failed, $PASSED tests passed"
    log "WARN" "Please check the issues above before proceeding"
    exit 1
fi
