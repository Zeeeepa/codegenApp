"""
Core Integration Framework

This module provides the foundational framework for integrating multiple components
in the library kit ecosystem.
"""

from .plugin_system import PluginManager, Plugin, PluginRegistry
from .event_bus import EventBus, Event, EventHandler
from .config_manager import ConfigManager, ComponentConfig
from .integration_manager import IntegrationManager

__all__ = [
    "PluginManager",
    "Plugin", 
    "PluginRegistry",
    "EventBus",
    "Event",
    "EventHandler",
    "ConfigManager",
    "ComponentConfig",
    "IntegrationManager"
]

