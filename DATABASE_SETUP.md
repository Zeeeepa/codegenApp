# Database Setup Guide

This guide will help you set up PostgreSQL database integration for the codegenApp.

## Quick Setup

### 1. Install PostgreSQL

**Windows:**
```bash
# Download and install from https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
# Using Homebrew:
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE codegenapp;
CREATE USER codegenuser WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE codegenapp TO codegenuser;
\q
```

### 3. Configure Environment Variables

Create or update `server/.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codegenapp
DB_USER=codegenuser
DB_PASSWORD=your_password_here
```

### 4. Install Dependencies and Start

```bash
# Install server dependencies
cd server
npm install

# Start the server
npm run dev
```

### 5. Test Database Connection

```bash
# Run the test script
node test-database.js
```

## Using the Database Features

### 1. Database Settings UI

1. Open the app: http://localhost:8000
2. Go to Settings → Database tab
3. Click "Create Database" to add a new configuration
4. Test the connection before saving

### 2. Agent Run Storage

Agent runs are automatically saved to the database when:
- You create new agent runs through the UI
- You use the API endpoints to save agent runs

### 3. Messaging Previous Agent Runs

- View stored agent runs in the main list
- Click on any agent run to see its details
- Send messages to previous agent runs using the API

## API Endpoints

### Database Health
```bash
GET /api/database/health
```

### Agent Runs
```bash
# Save agent run
POST /api/database/agent-runs
{
  "id": 12345,
  "organization_id": 323,
  "status": "COMPLETE",
  "prompt": "Your prompt",
  "result": "Result text",
  "web_url": "https://app.codegen.com/agent/12345"
}

# Get agent runs
GET /api/database/agent-runs/:organizationId?limit=50&offset=0

# Get single agent run
GET /api/database/agent-run/:id
```

### Messages
```bash
# Send message to agent run
POST /api/database/agent-runs/:id/messages
{
  "message": "Your message text",
  "messageType": "user"
}

# Get messages for agent run
GET /api/database/agent-runs/:id/messages
```

### Database Configuration
```bash
# Save database config
POST /api/database/config
{
  "name": "My Database",
  "host": "localhost",
  "port": 5432,
  "database_name": "codegenapp",
  "username": "codegenuser",
  "password": "password"
}

# Test connection
POST /api/database/test-connection
{
  "host": "localhost",
  "port": 5432,
  "database_name": "codegenapp",
  "username": "codegenuser",
  "password": "password"
}
```

## Troubleshooting

### Connection Issues

1. **PostgreSQL not running:**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql  # Linux
   brew services list | grep postgres  # macOS
   ```

2. **Authentication failed:**
   - Check username/password in `.env`
   - Verify user has access to the database
   - Check `pg_hba.conf` for authentication settings

3. **Database doesn't exist:**
   ```bash
   sudo -u postgres createdb codegenapp
   ```

### Schema Issues

If you encounter schema errors, the database will automatically initialize the schema on first connection. If you need to reset:

```bash
# Connect to database
psql -h localhost -U codegenuser -d codegenapp

# Drop and recreate tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS agent_runs CASCADE;
DROP TABLE IF EXISTS database_configs CASCADE;

# Restart the server to reinitialize schema
```

### Port Conflicts

If port 5432 is in use:
1. Change `DB_PORT` in `.env`
2. Update PostgreSQL configuration
3. Restart PostgreSQL service

## Production Considerations

1. **Security:**
   - Use strong passwords
   - Enable SSL connections
   - Restrict database access by IP
   - Encrypt sensitive data

2. **Performance:**
   - Configure connection pooling
   - Add appropriate indexes
   - Monitor query performance
   - Set up regular backups

3. **Monitoring:**
   - Set up database monitoring
   - Configure log rotation
   - Monitor disk space
   - Set up alerts for connection issues

## Database Schema

The application uses three main tables:

- `agent_runs` - Stores agent run information
- `messages` - Stores messages sent to agent runs  
- `database_configs` - Stores database configuration settings

See `server/database.sql` for the complete schema definition.
