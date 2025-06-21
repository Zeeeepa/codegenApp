-- Simple PostgreSQL schema for codegenApp
-- Stores agent runs, messages, and basic configuration

-- Agent runs table - stores basic agent run information
CREATE TABLE IF NOT EXISTS agent_runs (
    id SERIAL PRIMARY KEY,
    external_id INTEGER UNIQUE, -- ID from Codegen API
    organization_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    prompt TEXT,
    result TEXT,
    web_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB -- Store additional data as JSON
);

-- Messages table - stores messages sent to agent runs
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    agent_run_id INTEGER REFERENCES agent_runs(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'user', -- 'user' or 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB -- Store additional message data
);

-- Database configurations table - stores database connection settings
CREATE TABLE IF NOT EXISTS database_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255),
    port INTEGER DEFAULT 5432,
    database_name VARCHAR(100),
    username VARCHAR(100),
    password_encrypted TEXT, -- Store encrypted passwords
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_runs_external_id ON agent_runs(external_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_organization_id ON agent_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_agent_run_id ON messages(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_database_configs_updated_at BEFORE UPDATE ON database_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
