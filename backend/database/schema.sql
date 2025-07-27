-- CodegenApp Database Schema
-- SQLite schema for development, PostgreSQL compatible for production

-- Projects table - stores project information and settings
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT NOT NULL,
    webhook_url TEXT,
    default_branch TEXT DEFAULT 'main',
    auto_merge_enabled BOOLEAN DEFAULT FALSE,
    auto_confirm_plan BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project settings table - stores configuration for each project
CREATE TABLE IF NOT EXISTS project_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, setting_key)
);

-- Agent runs table - stores all agent run information
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    target_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    response_type TEXT, -- 'regular', 'plan', 'pr'
    response_data TEXT, -- JSON data for response
    progress_percentage INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Validation pipelines table - stores PR validation information
CREATE TABLE IF NOT EXISTS validation_pipelines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_run_id TEXT,
    pull_request_id INTEGER NOT NULL,
    pull_request_url TEXT,
    status TEXT DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0,
    current_step TEXT,
    deployment_url TEXT,
    validation_results TEXT, -- JSON data for validation results
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL
);

-- Webhook events table - stores incoming webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL, -- JSON data
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- System settings table - stores global application settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_validation_pipelines_project_id ON validation_pipelines(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_pipelines_status ON validation_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES
('codegen_api_key', ''),
('codegen_org_id', ''),
('github_token', ''),
('gemini_api_key', ''),
('webhook_secret', ''),
('default_planning_statement', 'Analyze the requirements and create a detailed implementation plan. Consider architecture, dependencies, testing, and deployment aspects.');
