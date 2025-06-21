#!/bin/bash

# Demo Script for Agent Run Manager
# Shows the application capabilities

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=================================="
echo "  Agent Run Manager - Demo"
echo -e "==================================${NC}"
echo

echo -e "${GREEN}🚀 Starting the application...${NC}"
echo "This will:"
echo "  1. Check prerequisites"
echo "  2. Install dependencies"
echo "  3. Start backend and frontend"
echo "  4. Open browser"
echo

read -p "Press Enter to continue or Ctrl+C to cancel..."

# Start the application
./start.sh

echo -e "${YELLOW}Demo completed!${NC}"
