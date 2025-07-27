-- Initial schema migration for Agent Run Manager
-- Creates tables for projects, agent runs, validation pipelines, and audit logs

-- Create enum types
CREATE TYPE project_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE agent_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'waiting_input');
CREATE TYPE validation_status AS ENUM ('pending', 'running', 'passed', 'failed', 'cancelled');

-- Projects table
CREATE TABLE projects (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    webhook_url VARCHAR(500) NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    status project_status DEFAULT 'active',
    deployment_settings JSONB DEFAULT '{}',
    validation_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_run TIMESTAMP WITH TIME ZONE
);

-- Agent runs table
CREATE TABLE agent_runs (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_text TEXT NOT NULL,
    status agent_run_status DEFAULT 'pending',
    progress_percentage FLOAT DEFAULT 0.0,
    current_step VARCHAR(255),
    response_type VARCHAR(50),
    response_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Validation pipelines table
CREATE TABLE validation_pipelines (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_run_id VARCHAR REFERENCES agent_runs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status validation_status DEFAULT 'pending',
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    error_message TEXT,
    duration_seconds FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_github_repo ON projects(github_repo);
CREATE INDEX idx_projects_status_created ON projects(status, created_at);

CREATE INDEX idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_session_id ON agent_runs(session_id);
CREATE INDEX idx_agent_runs_status_created ON agent_runs(status, created_at);
CREATE INDEX idx_agent_runs_project_status ON agent_runs(project_id, status);

CREATE INDEX idx_validation_pipelines_project_id ON validation_pipelines(project_id);
CREATE INDEX idx_validation_pipelines_agent_run_id ON validation_pipelines(agent_run_id);
CREATE INDEX idx_validation_pipelines_status ON validation_pipelines(status);
CREATE INDEX idx_validation_pipelines_status_created ON validation_pipelines(status, created_at);

CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity_action ON audit_logs(entity_type, action);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_pipelines_updated_at BEFORE UPDATE ON validation_pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
