"""
Feature flags for managing the Codegen API migration.

This module provides feature flag functionality to enable gradual migration
from the custom API implementation to the official Codegen API.
"""

import os
from typing import Dict, Any, Optional
from enum import Enum
from functools import lru_cache

from ..config.settings import get_settings


class FeatureFlag(str, Enum):
    """Available feature flags for the application."""
    
    # API Migration flags
    USE_OFFICIAL_API = "use_official_api"
    ENABLE_WEBHOOKS = "enable_webhooks"
    ENHANCED_VALIDATION = "enhanced_validation"
    
    # UI/UX flags
    NEW_DASHBOARD_UI = "new_dashboard_ui"
    REAL_TIME_UPDATES = "real_time_updates"
    
    # Development flags
    DEBUG_LOGGING = "debug_logging"
    MOCK_API_RESPONSES = "mock_api_responses"


class FeatureFlagManager:
    """
    Manages feature flags for the application.
    
    Provides methods to check feature flag status, override flags,
    and manage feature rollout strategies.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._overrides: Dict[str, bool] = {}
        self._load_overrides()
    
    def _load_overrides(self):
        """Load feature flag overrides from environment variables."""
        # Load any runtime overrides from environment
        override_env = os.getenv("FEATURE_FLAG_OVERRIDES", "")
        if override_env:
            try:
                # Format: "flag1=true,flag2=false"
                for override in override_env.split(","):
                    if "=" in override:
                        flag, value = override.strip().split("=", 1)
                        self._overrides[flag] = value.lower() in ("true", "1", "yes", "on")
            except Exception:
                # Ignore malformed overrides
                pass
    
    def is_enabled(self, flag: FeatureFlag, default: bool = False) -> bool:
        """
        Check if a feature flag is enabled.
        
        Args:
            flag: The feature flag to check
            default: Default value if flag is not configured
            
        Returns:
            bool: True if the feature is enabled
        """
        flag_name = flag.value
        
        # Check for runtime overrides first
        if flag_name in self._overrides:
            return self._overrides[flag_name]
        
        # Check settings configuration
        setting_name = f"feature_flag_{flag_name}"
        if hasattr(self.settings, setting_name):
            return getattr(self.settings, setting_name, default)
        
        # Check environment variable directly
        env_name = f"FEATURE_FLAG_{flag_name.upper()}"
        env_value = os.getenv(env_name)
        if env_value is not None:
            return env_value.lower() in ("true", "1", "yes", "on")
        
        return default
    
    def enable(self, flag: FeatureFlag):
        """
        Enable a feature flag at runtime.
        
        Args:
            flag: The feature flag to enable
        """
        self._overrides[flag.value] = True
    
    def disable(self, flag: FeatureFlag):
        """
        Disable a feature flag at runtime.
        
        Args:
            flag: The feature flag to disable
        """
        self._overrides[flag.value] = False
    
    def toggle(self, flag: FeatureFlag):
        """
        Toggle a feature flag at runtime.
        
        Args:
            flag: The feature flag to toggle
        """
        current_state = self.is_enabled(flag)
        self._overrides[flag.value] = not current_state
    
    def reset(self, flag: FeatureFlag):
        """
        Reset a feature flag to its configured value.
        
        Args:
            flag: The feature flag to reset
        """
        if flag.value in self._overrides:
            del self._overrides[flag.value]
    
    def get_all_flags(self) -> Dict[str, bool]:
        """
        Get the status of all feature flags.
        
        Returns:
            dict: Dictionary of flag names to their enabled status
        """
        flags = {}
        for flag in FeatureFlag:
            flags[flag.value] = self.is_enabled(flag)
        return flags
    
    def get_flag_info(self, flag: FeatureFlag) -> Dict[str, Any]:
        """
        Get detailed information about a feature flag.
        
        Args:
            flag: The feature flag to get info for
            
        Returns:
            dict: Detailed flag information
        """
        flag_name = flag.value
        is_enabled = self.is_enabled(flag)
        is_overridden = flag_name in self._overrides
        
        # Get configured value from settings
        setting_name = f"feature_flag_{flag_name}"
        configured_value = getattr(self.settings, setting_name, None)
        
        # Get environment variable value
        env_name = f"FEATURE_FLAG_{flag_name.upper()}"
        env_value = os.getenv(env_name)
        
        return {
            "name": flag_name,
            "enabled": is_enabled,
            "overridden": is_overridden,
            "override_value": self._overrides.get(flag_name),
            "configured_value": configured_value,
            "env_value": env_value,
            "description": self._get_flag_description(flag)
        }
    
    def _get_flag_description(self, flag: FeatureFlag) -> str:
        """Get description for a feature flag."""
        descriptions = {
            FeatureFlag.USE_OFFICIAL_API: "Use official Codegen API instead of custom implementation",
            FeatureFlag.ENABLE_WEBHOOKS: "Enable webhook integration for real-time agent updates",
            FeatureFlag.ENHANCED_VALIDATION: "Use enhanced validation pipeline with AI analysis",
            FeatureFlag.NEW_DASHBOARD_UI: "Enable new dashboard UI components",
            FeatureFlag.REAL_TIME_UPDATES: "Enable real-time WebSocket updates",
            FeatureFlag.DEBUG_LOGGING: "Enable debug-level logging",
            FeatureFlag.MOCK_API_RESPONSES: "Use mock API responses for development",
        }
        return descriptions.get(flag, "No description available")


# Global feature flag manager instance
@lru_cache()
def get_feature_flags() -> FeatureFlagManager:
    """
    Get the global feature flag manager instance.
    
    Returns:
        FeatureFlagManager: Global feature flag manager
    """
    return FeatureFlagManager()


# Convenience functions for common feature checks
def use_official_api() -> bool:
    """Check if official Codegen API should be used."""
    return get_feature_flags().is_enabled(FeatureFlag.USE_OFFICIAL_API, default=True)


def webhooks_enabled() -> bool:
    """Check if webhook integration is enabled."""
    return get_feature_flags().is_enabled(FeatureFlag.ENABLE_WEBHOOKS, default=True)


def enhanced_validation_enabled() -> bool:
    """Check if enhanced validation is enabled."""
    return get_feature_flags().is_enabled(FeatureFlag.ENHANCED_VALIDATION, default=True)


def debug_logging_enabled() -> bool:
    """Check if debug logging is enabled."""
    return get_feature_flags().is_enabled(FeatureFlag.DEBUG_LOGGING, default=False)


# Context manager for temporary feature flag overrides
class TemporaryFeatureFlag:
    """
    Context manager for temporarily overriding feature flags.
    
    Usage:
        with TemporaryFeatureFlag(FeatureFlag.USE_OFFICIAL_API, True):
            # Code that runs with the flag enabled
            pass
    """
    
    def __init__(self, flag: FeatureFlag, enabled: bool):
        self.flag = flag
        self.enabled = enabled
        self.manager = get_feature_flags()
        self.original_value = None
        self.was_overridden = False
    
    def __enter__(self):
        # Store original state
        self.original_value = self.manager.is_enabled(self.flag)
        self.was_overridden = self.flag.value in self.manager._overrides
        
        # Set temporary override
        if self.enabled:
            self.manager.enable(self.flag)
        else:
            self.manager.disable(self.flag)
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore original state
        if self.was_overridden:
            self.manager._overrides[self.flag.value] = self.original_value
        else:
            self.manager.reset(self.flag)


# Decorator for feature-gated functions
def feature_gate(flag: FeatureFlag, default_return=None):
    """
    Decorator to gate function execution behind a feature flag.
    
    Args:
        flag: Feature flag to check
        default_return: Value to return if feature is disabled
        
    Usage:
        @feature_gate(FeatureFlag.USE_OFFICIAL_API)
        def new_api_function():
            return "Using new API"
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if get_feature_flags().is_enabled(flag):
                return func(*args, **kwargs)
            else:
                return default_return
        return wrapper
    return decorator


# Migration helper functions
def should_use_legacy_api() -> bool:
    """Check if legacy API should be used instead of official API."""
    return not use_official_api()


def get_api_service_class():
    """
    Get the appropriate API service class based on feature flags.
    
    Returns:
        class: Either CodegenService (legacy) or CodegenServiceV2 (official)
    """
    if use_official_api():
        from ..services.codegen_service_v2 import CodegenServiceV2
        return CodegenServiceV2
    else:
        from ..services.codegen_service import CodegenService
        return CodegenService


def create_api_service():
    """
    Create an instance of the appropriate API service.
    
    Returns:
        CodegenService or CodegenServiceV2: API service instance
    """
    service_class = get_api_service_class()
    return service_class()


# Health check for feature flags
def validate_feature_flags() -> Dict[str, Any]:
    """
    Validate feature flag configuration and return status.
    
    Returns:
        dict: Validation results and recommendations
    """
    manager = get_feature_flags()
    results = {
        "valid": True,
        "warnings": [],
        "errors": [],
        "flags": manager.get_all_flags()
    }
    
    # Check for conflicting flags
    if manager.is_enabled(FeatureFlag.USE_OFFICIAL_API) and manager.is_enabled(FeatureFlag.MOCK_API_RESPONSES):
        results["warnings"].append(
            "Official API is enabled but mock responses are also enabled. "
            "This may cause unexpected behavior."
        )
    
    # Check if official API is properly configured
    if manager.is_enabled(FeatureFlag.USE_OFFICIAL_API):
        settings = get_settings()
        if not settings.is_official_api_enabled():
            results["errors"].append(
                "Official API feature flag is enabled but API credentials are not configured. "
                "Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables."
            )
            results["valid"] = False
    
    # Check webhook configuration
    if manager.is_enabled(FeatureFlag.ENABLE_WEBHOOKS):
        settings = get_settings()
        if not settings.webhook_base_url:
            results["warnings"].append(
                "Webhooks are enabled but WEBHOOK_BASE_URL is not configured. "
                "Webhook functionality may not work properly."
            )
    
    return results
