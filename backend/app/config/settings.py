"""
CodegenApp CI/CD Flow Management System Configuration
Comprehensive settings management with environment variable support
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, Field


class CodegenAPISettings(BaseSettings):
    """Codegen API configuration"""
    api_token: str = Field(..., env="CODEGEN_API_TOKEN")
    org_id: str = Field(..., env="CODEGEN_ORG_ID")
    api_base: str = Field("https://api.codegen.com", env="CODEGEN_API_BASE")
    timeout: int = Field(60, env="CODEGEN_TIMEOUT")
    max_retries: int = Field(3, env="CODEGEN_MAX_RETRIES")


class GitHubSettings(BaseSettings):
    """GitHub API configuration"""
    token: str = Field(..., env="GITHUB_TOKEN")
    api_base: str = Field("https://api.github.com", env="GITHUB_API_BASE")
    webhook_secret: str = Field(..., env="GITHUB_WEBHOOK_SECRET")
    timeout: int = Field(30, env="GITHUB_TIMEOUT")


class GeminiSettings(BaseSettings):
    """Gemini AI API configuration"""
    api_key: str = Field(..., env="GEMINI_API_KEY")
    model: str = Field("gemini-1.5-pro-latest", env="GEMINI_MODEL")
    temperature: float = Field(0.1, env="GEMINI_TEMPERATURE")
    max_tokens: int = Field(8192, env="GEMINI_MAX_TOKENS")
    timeout: int = Field(60, env="GEMINI_TIMEOUT")


class CloudflareSettings(BaseSettings):
    """Cloudflare Workers configuration"""
    api_key: str = Field(..., env="CLOUDFLARE_API_KEY")
    account_id: str = Field(..., env="CLOUDFLARE_ACCOUNT_ID")
    zone_id: Optional[str] = Field(None, env="CLOUDFLARE_ZONE_ID")
    worker_name: str = Field("webhook-gateway", env="CLOUDFLARE_WORKER_NAME")
    worker_url: str = Field(..., env="CLOUDFLARE_WORKER_URL")


class WebhookSettings(BaseSettings):
    """Webhook configuration"""
    base_url: str = Field(..., env="WEBHOOK_BASE_URL")
    timeout: int = Field(30000, env="WEBHOOK_TIMEOUT")
    max_retries: int = Field(3, env="WEBHOOK_MAX_RETRIES")
    debug_mode: bool = Field(False, env="WEBHOOK_DEBUG_MODE")


class WebEvalSettings(BaseSettings):
    """Web-Eval-Agent configuration"""
    mcp_path: str = Field("web-eval-agent", env="WEB_EVAL_MCP_PATH")
    timeout: int = Field(300000, env="WEB_EVAL_TIMEOUT")
    max_concurrent: int = Field(3, env="WEB_EVAL_MAX_CONCURRENT")
    browser: str = Field("chromium", env="WEB_EVAL_BROWSER")
    headless: bool = Field(True, env="WEB_EVAL_HEADLESS")


class GraphSitterSettings(BaseSettings):
    """Graph-Sitter configuration"""
    cache_size: int = Field(1000, env="GRAPH_SITTER_CACHE_SIZE")
    max_file_size: int = Field(1048576, env="GRAPH_SITTER_MAX_FILE_SIZE")
    supported_languages: List[str] = Field(
        ["python", "javascript", "typescript", "go", "rust", "java", "cpp", "c"],
        env="GRAPH_SITTER_SUPPORTED_LANGUAGES"
    )
    timeout: int = Field(60000, env="GRAPH_SITTER_TIMEOUT")

    class Config:
        env_list_separator = ","


class ValidationSettings(BaseSettings):
    """Validation pipeline configuration"""
    timeout: int = Field(1800, env="VALIDATION_TIMEOUT")
    max_retries: int = Field(3, env="VALIDATION_MAX_RETRIES")
    confidence_threshold: float = Field(0.8, env="VALIDATION_CONFIDENCE_THRESHOLD")
    snapshot_ttl: int = Field(3600, env="VALIDATION_SNAPSHOT_TTL")
    concurrent_limit: int = Field(5, env="VALIDATION_CONCURRENT_LIMIT")


class DeploymentSettings(BaseSettings):
    """Deployment configuration"""
    timeout: int = Field(600, env="DEPLOYMENT_TIMEOUT")
    max_retries: int = Field(2, env="DEPLOYMENT_MAX_RETRIES")
    log_level: str = Field("INFO", env="DEPLOYMENT_LOG_LEVEL")
    cleanup_timeout: int = Field(300, env="DEPLOYMENT_CLEANUP_TIMEOUT")


class AutoMergeSettings(BaseSettings):
    """Auto-merge configuration"""
    enabled: bool = Field(True, env="AUTO_MERGE_ENABLED")
    confidence_threshold: float = Field(0.9, env="AUTO_MERGE_CONFIDENCE_THRESHOLD")
    error_threshold: int = Field(0, env="AUTO_MERGE_ERROR_THRESHOLD")
    require_tests: bool = Field(True, env="AUTO_MERGE_REQUIRE_TESTS")


class SandboxSettings(BaseSettings):
    """Sandbox configuration"""
    provider: str = Field("modal", env="SANDBOX_PROVIDER")
    timeout: int = Field(3600, env="SANDBOX_TIMEOUT")
    max_memory: int = Field(2048, env="SANDBOX_MAX_MEMORY")
    max_cpu: int = Field(2, env="SANDBOX_MAX_CPU")
    cleanup_delay: int = Field(300, env="SANDBOX_CLEANUP_DELAY")


class SWEBenchSettings(BaseSettings):
    """SWE-bench integration configuration"""
    dataset: str = Field("lite", env="SWEBENCH_DATASET")
    max_workers: int = Field(4, env="SWEBENCH_MAX_WORKERS")
    timeout: int = Field(1800, env="SWEBENCH_TIMEOUT")
    cache_level: str = Field("env", env="SWEBENCH_CACHE_LEVEL")


class LoggingSettings(BaseSettings):
    """Logging configuration"""
    level: str = Field("INFO", env="LOG_LEVEL")
    format: str = Field("json", env="LOG_FORMAT")
    file_path: str = Field("logs/codegenapp.log", env="LOG_FILE_PATH")
    max_size: str = Field("100MB", env="LOG_MAX_SIZE")
    backup_count: int = Field(5, env="LOG_BACKUP_COUNT")


class RedisSettings(BaseSettings):
    """Redis configuration (optional)"""
    url: Optional[str] = Field(None, env="REDIS_URL")
    db: int = Field(0, env="REDIS_DB")
    password: Optional[str] = Field(None, env="REDIS_PASSWORD")
    timeout: int = Field(5, env="REDIS_TIMEOUT")


class DatabaseSettings(BaseSettings):
    """Database configuration (optional)"""
    url: str = Field("sqlite:///./codegenapp.db", env="DATABASE_URL")
    pool_size: int = Field(10, env="DATABASE_POOL_SIZE")
    max_overflow: int = Field(20, env="DATABASE_MAX_OVERFLOW")


class MonitoringSettings(BaseSettings):
    """Monitoring configuration"""
    enabled: bool = Field(True, env="METRICS_ENABLED")
    port: int = Field(9090, env="METRICS_PORT")
    health_check_interval: int = Field(30, env="HEALTH_CHECK_INTERVAL")
    performance_monitoring: bool = Field(True, env="PERFORMANCE_MONITORING")


class BackendSettings(BaseSettings):
    """Backend server configuration"""
    host: str = Field("0.0.0.0", env="BACKEND_HOST")
    port: int = Field(8001, env="BACKEND_PORT")
    frontend_url: str = Field("http://localhost:8000", env="FRONTEND_URL")
    debug: bool = Field(False, env="DEBUG")
    reload: bool = Field(False, env="RELOAD")


class Settings(BaseSettings):
    """Main application settings"""
    
    # Core configurations
    codegen: CodegenAPISettings = CodegenAPISettings()
    github: GitHubSettings = GitHubSettings()
    gemini: GeminiSettings = GeminiSettings()
    cloudflare: CloudflareSettings = CloudflareSettings()
    
    # Service configurations
    webhook: WebhookSettings = WebhookSettings()
    web_eval: WebEvalSettings = WebEvalSettings()
    graph_sitter: GraphSitterSettings = GraphSitterSettings()
    
    # Pipeline configurations
    validation: ValidationSettings = ValidationSettings()
    deployment: DeploymentSettings = DeploymentSettings()
    auto_merge: AutoMergeSettings = AutoMergeSettings()
    sandbox: SandboxSettings = SandboxSettings()
    swebench: SWEBenchSettings = SWEBenchSettings()
    
    # Infrastructure configurations
    logging: LoggingSettings = LoggingSettings()
    redis: RedisSettings = RedisSettings()
    database: DatabaseSettings = DatabaseSettings()
    monitoring: MonitoringSettings = MonitoringSettings()
    backend: BackendSettings = BackendSettings()
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance"""
    return settings


# Environment-specific configurations
def is_development() -> bool:
    """Check if running in development mode"""
    return os.getenv("ENVIRONMENT", "development").lower() == "development"


def is_production() -> bool:
    """Check if running in production mode"""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def is_testing() -> bool:
    """Check if running in testing mode"""
    return os.getenv("ENVIRONMENT", "development").lower() == "testing"

