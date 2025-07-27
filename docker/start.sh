#!/bin/bash

# Agent Run Manager Startup Script
# This script starts all services in the correct order

set -e

echo "🚀 Starting Agent Run Manager..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
python -c "
import time
import sys
import os
sys.path.append('/app/backend')
from app.database.connection import DatabaseManager

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        db_manager = DatabaseManager()
        if db_manager.health_check():
            print('✅ Database connection established')
            break
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
        retry_count += 1
        if retry_count >= max_retries:
            print('💥 Failed to connect to database after 30 attempts')
            sys.exit(1)
        time.sleep(2)
"

# Run database migrations
echo "🔄 Running database migrations..."
cd /app/backend
python -c "
import sys
sys.path.append('/app/backend')
from app.database.connection import DatabaseManager

try:
    db_manager = DatabaseManager()
    db_manager.create_tables()
    print('✅ Database migrations completed')
except Exception as e:
    print(f'❌ Migration failed: {e}')
    sys.exit(1)
"

# Start supervisor to manage all processes
echo "🎯 Starting all services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
