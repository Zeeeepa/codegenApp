"""
Configuration settings for the Strands-Agents backend
"""

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Dict, Any, Union, List
import os
import json


class Settings(BaseSettings):
    """Application settings"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Server configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8001, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Official Codegen API configuration
    codegen_api_key: str = Field(default="demo_key", description="Official Codegen API key")
    codegen_org_id: str = Field(default="demo_org", description="Codegen organization ID")
    codegen_api_base_url: str = Field(
        default="https://api.codegen.com", 
        description="Official Codegen API base URL"
    )
    
    # Legacy Codegen API configuration (deprecated)
    codegen_api_token: Optional[str] = Field(
        default=None, 
        description="Legacy Codegen API token (deprecated, use codegen_api_key)"
    )
    
    # Gemini API configuration (for Web-Eval-Agent)
    gemini_api_key: Optional[str] = Field(
        default=None,
        description="Gemini API key for Web-Eval-Agent validation"
    )
    
    # GitHub API configuration
    github_token: Optional[str] = Field(
        default=None,
        description="GitHub personal access token for repository operations"
    )
    
    # Database configuration (for workflow persistence)
    database_url: Optional[str] = Field(
        default=None, 
        description="Database URL for workflow persistence"
    )
    
    # Redis configuration (for task queue and caching)
    redis_url: str = Field(
        default="redis://localhost:6379/0", 
        description="Redis URL for task queue"
    )
    
    # Grainchain configuration
    grainchain_config: Dict[str, Any] = Field(
        default_factory=lambda: {
            "docker_host": "unix://var/run/docker.sock",
            "registry_url": None,  # Docker registry for images
            "default_timeout": 300,  # 5 minutes
            "max_concurrent_sandboxes": 10,
            "cleanup_interval": 3600,  # 1 hour
        },
        description="Grainchain service configuration"
    )
    
    # Graph-sitter configuration
    graph_sitter_config: Dict[str, Any] = Field(
        default_factory=lambda: {
            "supported_languages": [
                "python", "javascript", "typescript", "go", 
                "rust", "java", "cpp", "c"
            ],
            "cache_parsed_trees": True,
            "max_file_size": 1024 * 1024,  # 1MB
            "analysis_timeout": 30,  # 30 seconds
        },
        description="Graph-sitter service configuration"
    )
    
    # Web-eval-agent configuration
    web_eval_config: Dict[str, Any] = Field(
        default_factory=lambda: {
            "browser_type": "chromium",  # chromium, firefox, webkit
            "headless": True,
            "timeout": 60,  # 60 seconds
            "max_concurrent_evaluations": 5,
            "screenshot_on_failure": True,
            "viewport": {"width": 1280, "height": 720},
        },
        description="Web-eval-agent service configuration"
    )
    
    # Workflow orchestration configuration
    workflow_config: Dict[str, Any] = Field(
        default_factory=lambda: {
            "max_concurrent_workflows": 20,
            "default_timeout": 1800,  # 30 minutes
            "retry_attempts": 3,
            "retry_delay": 5,  # seconds
            "enable_persistence": True,
            "cleanup_completed_after": 86400,  # 24 hours
        },
        description="Workflow orchestration configuration"
    )
    
    # Security configuration
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    access_token_expire_minutes: int = Field(
        default=30, 
        description="Access token expiration time in minutes"
    )
    
    # Logging configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )
    
    # CORS configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000", "http://localhost:3080", "http://localhost:8080"],
        description="Allowed CORS origins"
    )
    # Monitoring configuration
    enable_metrics: bool = Field(default=True, description="Enable Prometheus metrics")
    metrics_port: int = Field(default=8002, description="Metrics server port")
    
    def get_codegen_headers(self) -> Dict[str, str]:
        """
        Get headers for official Codegen API requests.
        
        Returns:
            Dict[str, str]: Headers for API requests
        """
        return {
            "Authorization": f"Bearer {self.codegen_api_key}",
            "Content-Type": "application/json",
        }
    
    def get_legacy_codegen_headers(self) -> Dict[str, str]:
        """
        Get headers for legacy Codegen API requests (deprecated).
        
        Returns:
            Dict[str, str]: Headers for legacy API requests
        """
        if not self.codegen_api_token:
            return {}
        
        return {
            "Authorization": f"Bearer {self.codegen_api_token}",
            "Content-Type": "application/json",
            "X-Organization-ID": self.codegen_org_id,
        }
    
    def is_official_api_enabled(self) -> bool:
        """
        Check if official Codegen API should be used.
        
        Returns:
            bool: True if official API is configured and should be used
        """
        return bool(self.codegen_api_key and self.codegen_org_id)
    
    def get_api_endpoint(self, path: str) -> str:
        """
        Get full API endpoint URL.
        
        Args:
            path: API path (e.g., '/api/v1/agents/runs')
            
        Returns:
            str: Full API endpoint URL
        """
        base_url = self.codegen_api_base_url.rstrip('/')
        path = path.lstrip('/')
        return f"{base_url}/{path}"


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings (singleton pattern)"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Reload settings (useful for testing)"""
    global _settings
    _settings = None
    return get_settings()


# Environment-specific configurations
class DevelopmentSettings(Settings):
    """Development environment settings"""
    debug: bool = True
    log_level: str = "DEBUG"
    cors_origins: List[str] = ["*"]  # Allow all origins in development


class ProductionSettings(Settings):
    """Production environment settings"""
    debug: bool = False
    log_level: str = "INFO"
    # CORS origins should be explicitly set in production


class TestingSettings(Settings):
    """Testing environment settings"""
    debug: bool = True
    log_level: str = "DEBUG"
    database_url: str = "sqlite:///./test.db"
    redis_url: str = "redis://localhost:6379/1"  # Use different Redis DB for tests


def get_settings_for_environment(env: str = None) -> Settings:
    """Get settings for specific environment"""
    if env is None:
        env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()
