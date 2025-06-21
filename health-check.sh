#!/bin/bash

# Health Check Script for Agent Run Manager
# Checks if both frontend and backend are running properly

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FRONTEND_PORT=8000
BACKEND_PORT=8001

check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name is running on port $port"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is not responding on port $port"
        return 1
    fi
}

echo "Agent Run Manager - Health Check"
echo "================================"

# Check backend
if check_service "Backend" $BACKEND_PORT "http://localhost:$BACKEND_PORT/health"; then
    BACKEND_OK=true
else
    BACKEND_OK=false
fi

# Check frontend
if check_service "Frontend" $FRONTEND_PORT "http://localhost:$FRONTEND_PORT"; then
    FRONTEND_OK=true
else
    FRONTEND_OK=false
fi

echo

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}All services are healthy!${NC}"
    echo "Frontend: http://localhost:$FRONTEND_PORT"
    echo "Backend:  http://localhost:$BACKEND_PORT"
    exit 0
else
    echo -e "${RED}Some services are not responding${NC}"
    echo "Run './start.sh' to start all services"
    exit 1
fi
