"""
Configuration Manager

Provides centralized configuration management for the library kit ecosystem.
"""

import os
import yaml
import json
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from copy import deepcopy

logger = logging.getLogger(__name__)


@dataclass
class ComponentConfig:
    """Configuration for a single component"""
    
    name: str
    enabled: bool = True
    version: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    environment_overrides: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    def get_config_for_environment(self, environment: str) -> Dict[str, Any]:
        """
        Get configuration for a specific environment
        
        Args:
            environment: Environment name (e.g., 'development', 'production')
            
        Returns:
            Merged configuration for the environment
        """
        config = deepcopy(self.config)
        
        # Apply environment-specific overrides
        if environment in self.environment_overrides:
            config.update(self.environment_overrides[environment])
        
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ComponentConfig":
        """Create from dictionary"""
        return cls(**data)


@dataclass
class GlobalConfig:
    """Global configuration for the library kit"""
    
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    version: str = "1.0.0"
    
    # Core settings
    max_concurrent_workflows: int = 10
    default_timeout: int = 300
    retry_attempts: int = 3
    retry_delay: float = 1.0
    
    # Database settings
    database_url: Optional[str] = None
    redis_url: Optional[str] = None
    
    # Security settings
    jwt_secret_key: Optional[str] = None
    api_key_salt: Optional[str] = None
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    
    # Component configurations
    components: Dict[str, ComponentConfig] = field(default_factory=dict)
    
    # Shared settings available to all components
    shared_settings: Dict[str, Any] = field(default_factory=dict)
    
    def get_component_config(self, component_name: str) -> Optional[ComponentConfig]:
        """Get configuration for a specific component"""
        return self.components.get(component_name)
    
    def add_component_config(self, config: ComponentConfig) -> None:
        """Add or update component configuration"""
        self.components[config.name] = config
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        # Convert ComponentConfig objects to dicts
        data["components"] = {
            name: config.to_dict() 
            for name, config in self.components.items()
        }
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GlobalConfig":
        """Create from dictionary"""
        data = deepcopy(data)
        
        # Convert component configs
        if "components" in data:
            components = {}
            for name, config_data in data["components"].items():
                components[name] = ComponentConfig.from_dict(config_data)
            data["components"] = components
        
        return cls(**data)


class ConfigManager:
    """
    Centralized configuration manager for the library kit
    
    Features:
    - Hierarchical configuration (global -> component -> environment)
    - Environment-specific overrides
    - Environment variable substitution
    - Configuration validation
    - Hot reloading
    - Configuration templates
    """
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file
        self.global_config = GlobalConfig()
        self.config_watchers: List[callable] = []
        self._environment_cache: Dict[str, Dict[str, Any]] = {}
    
    def load_config(self, config_file: Optional[Path] = None) -> None:
        """
        Load configuration from file
        
        Args:
            config_file: Path to configuration file
        """
        if config_file:
            self.config_file = config_file
        
        if not self.config_file or not self.config_file.exists():
            logger.warning(f"Configuration file not found: {self.config_file}")
            self._load_default_config()
            return
        
        try:
            with open(self.config_file, 'r') as f:
                if self.config_file.suffix.lower() in ['.yaml', '.yml']:
                    data = yaml.safe_load(f)
                elif self.config_file.suffix.lower() == '.json':
                    data = json.load(f)
                else:
                    raise ValueError(f"Unsupported config file format: {self.config_file.suffix}")
            
            # Substitute environment variables
            data = self._substitute_env_vars(data)
            
            # Load into global config
            self.global_config = GlobalConfig.from_dict(data)
            
            logger.info(f"Loaded configuration from {self.config_file}")
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            self._load_default_config()
    
    def _load_default_config(self) -> None:
        """Load default configuration"""
        self.global_config = GlobalConfig()
        
        # Add default component configurations
        self._add_default_component_configs()
        
        logger.info("Loaded default configuration")
    
    def _add_default_component_configs(self) -> None:
        """Add default configurations for known components"""
        
        # Codegen adapter config
        codegen_config = ComponentConfig(
            name="codegen",
            config={
                "api_base_url": "https://api.codegen.com",
                "timeout": 30,
                "max_retries": 3,
                "rate_limit": 100
            },
            environment_overrides={
                "development": {
                    "api_base_url": "https://api.dev.codegen.com",
                    "timeout": 60
                },
                "production": {
                    "timeout": 15,
                    "rate_limit": 1000
                }
            }
        )
        self.global_config.add_component_config(codegen_config)
        
        # Grainchain adapter config
        grainchain_config = ComponentConfig(
            name="grainchain",
            config={
                "default_provider": "local",
                "default_timeout": 300,
                "max_concurrent_sandboxes": 10,
                "working_directory": "/tmp",
                "environment_vars": {}
            },
            environment_overrides={
                "development": {
                    "max_concurrent_sandboxes": 5,
                    "default_timeout": 600
                },
                "production": {
                    "default_provider": "docker",
                    "max_concurrent_sandboxes": 50
                }
            }
        )
        self.global_config.add_component_config(grainchain_config)
        
        # Graph-sitter adapter config
        graph_sitter_config = ComponentConfig(
            name="graph_sitter",
            config={
                "supported_languages": ["python", "javascript", "typescript", "java", "go"],
                "cache_enabled": True,
                "cache_size": 1000,
                "analysis_timeout": 30
            }
        )
        self.global_config.add_component_config(graph_sitter_config)
        
        # Web-eval-agent adapter config
        web_eval_config = ComponentConfig(
            name="web_eval_agent",
            config={
                "default_timeout": 60,
                "max_concurrent_evaluations": 5,
                "evaluation_types": ["performance", "accessibility", "seo"],
                "device_types": ["desktop", "mobile"]
            }
        )
        self.global_config.add_component_config(web_eval_config)
    
    def _substitute_env_vars(self, data: Any) -> Any:
        """
        Recursively substitute environment variables in configuration
        
        Args:
            data: Configuration data
            
        Returns:
            Data with environment variables substituted
        """
        if isinstance(data, dict):
            return {key: self._substitute_env_vars(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self._substitute_env_vars(item) for item in data]
        elif isinstance(data, str):
            # Replace ${VAR_NAME} or ${VAR_NAME:default_value} patterns
            import re
            
            def replace_env_var(match):
                var_spec = match.group(1)
                if ':' in var_spec:
                    var_name, default_value = var_spec.split(':', 1)
                else:
                    var_name, default_value = var_spec, None
                
                return os.getenv(var_name, default_value or '')
            
            return re.sub(r'\$\{([^}]+)\}', replace_env_var, data)
        else:
            return data
    
    def get_global_config(self) -> GlobalConfig:
        """Get global configuration"""
        return self.global_config
    
    def get_component_config(
        self, 
        component_name: str, 
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get configuration for a specific component
        
        Args:
            component_name: Name of the component
            environment: Environment name (uses global environment if not specified)
            
        Returns:
            Component configuration
        """
        if environment is None:
            environment = self.global_config.environment
        
        # Check cache first
        cache_key = f"{component_name}:{environment}"
        if cache_key in self._environment_cache:
            return self._environment_cache[cache_key]
        
        component_config = self.global_config.get_component_config(component_name)
        if component_config is None:
            logger.warning(f"No configuration found for component: {component_name}")
            return {}
        
        # Get environment-specific config
        config = component_config.get_config_for_environment(environment)
        
        # Add shared settings
        config.update(self.global_config.shared_settings)
        
        # Cache the result
        self._environment_cache[cache_key] = config
        
        return config
    
    def set_component_config(
        self, 
        component_name: str, 
        config: Dict[str, Any],
        environment: Optional[str] = None
    ) -> None:
        """
        Set configuration for a component
        
        Args:
            component_name: Name of the component
            config: Configuration dictionary
            environment: Environment to set config for (None for base config)
        """
        component_config = self.global_config.get_component_config(component_name)
        
        if component_config is None:
            # Create new component config
            component_config = ComponentConfig(name=component_name)
            self.global_config.add_component_config(component_config)
        
        if environment is None:
            # Set base configuration
            component_config.config.update(config)
        else:
            # Set environment-specific override
            if environment not in component_config.environment_overrides:
                component_config.environment_overrides[environment] = {}
            component_config.environment_overrides[environment].update(config)
        
        # Clear cache
        self._clear_cache()
        
        # Notify watchers
        self._notify_config_change(component_name, environment)
    
    def add_config_watcher(self, callback: callable) -> None:
        """
        Add a callback to be notified of configuration changes
        
        Args:
            callback: Function to call when config changes
                     Signature: callback(component_name: str, environment: Optional[str])
        """
        self.config_watchers.append(callback)
    
    def _notify_config_change(self, component_name: str, environment: Optional[str]) -> None:
        """Notify all watchers of configuration change"""
        for callback in self.config_watchers:
            try:
                callback(component_name, environment)
            except Exception as e:
                logger.error(f"Error in config watcher: {e}")
    
    def _clear_cache(self) -> None:
        """Clear the environment configuration cache"""
        self._environment_cache.clear()
    
    def validate_config(self) -> List[str]:
        """
        Validate the current configuration
        
        Returns:
            List of validation errors
        """
        errors = []
        
        # Validate global settings
        if not self.global_config.environment:
            errors.append("Environment not specified")
        
        if self.global_config.max_concurrent_workflows <= 0:
            errors.append("max_concurrent_workflows must be positive")
        
        if self.global_config.default_timeout <= 0:
            errors.append("default_timeout must be positive")
        
        # Validate component configurations
        for component_name, component_config in self.global_config.components.items():
            if not component_config.name:
                errors.append(f"Component {component_name} missing name")
            
            # Component-specific validations
            if component_name == "grainchain":
                config = component_config.config
                if config.get("max_concurrent_sandboxes", 0) <= 0:
                    errors.append("grainchain.max_concurrent_sandboxes must be positive")
        
        return errors


# Global config manager instance
_global_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get the global configuration manager instance"""
    global _global_config_manager
    if _global_config_manager is None:
        _global_config_manager = ConfigManager()
    return _global_config_manager


def initialize_config_manager(config_file: Optional[Path] = None) -> ConfigManager:
    """Initialize the global configuration manager"""
    global _global_config_manager
    _global_config_manager = ConfigManager(config_file)
    if config_file:
        _global_config_manager.load_config()
    return _global_config_manager

