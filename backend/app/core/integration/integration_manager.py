"""
Integration Manager

Orchestrates all integration framework components and provides unified management.
"""

import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from .config_manager import ConfigManager, get_config_manager
from .event_bus import EventBus, get_event_bus, initialize_event_bus
from .plugin_system import PluginManager, get_plugin_manager, initialize_plugin_manager

logger = logging.getLogger(__name__)


class IntegrationManager:
    """
    Central manager for the integration framework
    
    Coordinates configuration management, event bus, and plugin system.
    """
    
    def __init__(
        self,
        config_file: Optional[Path] = None,
        plugin_directories: Optional[List[Path]] = None
    ):
        self.config_manager = get_config_manager()
        self.event_bus = get_event_bus()
        self.plugin_manager = get_plugin_manager()
        
        self.config_file = config_file
        self.plugin_directories = plugin_directories or []
        self.initialized = False
        self.started = False
        
        # System status tracking
        self.start_time: Optional[datetime] = None
        self.last_health_check: Optional[datetime] = None
        self.health_status = "unknown"
    
    async def initialize(self) -> None:
        """Initialize all integration components"""
        if self.initialized:
            logger.warning("Integration manager already initialized")
            return
        
        try:
            logger.info("Initializing integration framework...")
            
            # Initialize configuration manager
            if self.config_file:
                self.config_manager.load_config(self.config_file)
            else:
                self.config_manager._load_default_config()
            
            # Initialize event bus
            await initialize_event_bus()
            
            # Initialize plugin manager
            initialize_plugin_manager(self.plugin_directories)
            
            # Discover plugins
            await self.plugin_manager.discover_plugins()
            
            # Load plugin configurations from config manager
            plugin_configs = {}
            for plugin_name in self.plugin_manager.registry.plugins.keys():
                plugin_config = self.config_manager.get_component_config(plugin_name)
                if plugin_config:
                    plugin_configs[plugin_name] = plugin_config
            
            # Load all plugins
            await self.plugin_manager.load_all_plugins(plugin_configs)
            
            self.initialized = True
            logger.info("Integration framework initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize integration framework: {e}")
            raise
    
    async def start(self) -> None:
        """Start all integration services"""
        if not self.initialized:
            await self.initialize()
        
        if self.started:
            logger.warning("Integration manager already started")
            return
        
        try:
            logger.info("Starting integration services...")
            
            # Start event bus
            await self.event_bus.start()
            
            # Start all plugins
            await self.plugin_manager.start_all_plugins()
            
            self.started = True
            self.start_time = datetime.utcnow()
            self.health_status = "healthy"
            
            logger.info("Integration services started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start integration services: {e}")
            self.health_status = "unhealthy"
            raise
    
    async def stop(self) -> None:
        """Stop all integration services"""
        if not self.started:
            logger.warning("Integration manager not started")
            return
        
        try:
            logger.info("Stopping integration services...")
            
            # Stop all plugins
            await self.plugin_manager.stop_all_plugins()
            
            # Stop event bus
            await self.event_bus.stop()
            
            self.started = False
            self.health_status = "stopped"
            
            logger.info("Integration services stopped successfully")
            
        except Exception as e:
            logger.error(f"Failed to stop integration services: {e}")
            self.health_status = "unhealthy"
            raise
    
    async def restart(self) -> None:
        """Restart all integration services"""
        await self.stop()
        await self.start()
    
    async def reload_configuration(self) -> None:
        """Reload configuration and restart affected components"""
        logger.info("Reloading configuration...")
        
        try:
            # Reload configuration
            if self.config_file:
                self.config_manager.load_config(self.config_file)
            
            # Restart services to pick up new configuration
            if self.started:
                await self.restart()
            
            logger.info("Configuration reloaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check
        
        Returns:
            Health status information
        """
        self.last_health_check = datetime.utcnow()
        
        try:
            health_info = {
                "status": "healthy",
                "timestamp": self.last_health_check.isoformat(),
                "uptime_seconds": None,
                "components": {}
            }
            
            if self.start_time:
                uptime = (self.last_health_check - self.start_time).total_seconds()
                health_info["uptime_seconds"] = uptime
            
            # Check event bus health
            event_bus_health = {
                "status": "healthy" if self.event_bus.running else "stopped",
                "metrics": self.event_bus.get_metrics()
            }
            health_info["components"]["event_bus"] = event_bus_health
            
            # Check plugin health
            plugin_status = self.plugin_manager.get_plugin_status()
            plugins_health = {
                "status": "healthy",
                "total_plugins": len(plugin_status),
                "running_plugins": len([p for p in plugin_status.values() if p["state"] == "started"]),
                "failed_plugins": len([p for p in plugin_status.values() if p["state"] == "failed"]),
                "plugins": plugin_status
            }
            
            # Overall plugin health
            if plugins_health["failed_plugins"] > 0:
                plugins_health["status"] = "degraded"
            
            health_info["components"]["plugins"] = plugins_health
            
            # Check configuration health
            config_errors = self.config_manager.validate_config()
            config_health = {
                "status": "healthy" if not config_errors else "unhealthy",
                "errors": config_errors
            }
            health_info["components"]["configuration"] = config_health
            
            # Determine overall health
            component_statuses = [
                event_bus_health["status"],
                plugins_health["status"],
                config_health["status"]
            ]
            
            if "unhealthy" in component_statuses:
                health_info["status"] = "unhealthy"
            elif "degraded" in component_statuses or "stopped" in component_statuses:
                health_info["status"] = "degraded"
            
            self.health_status = health_info["status"]
            return health_info
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            self.health_status = "unhealthy"
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": self.last_health_check.isoformat()
            }
    
    def get_system_status(self) -> Dict[str, Any]:
        """
        Get current system status
        
        Returns:
            System status information
        """
        return {
            "initialized": self.initialized,
            "started": self.started,
            "health_status": self.health_status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "config_file": str(self.config_file) if self.config_file else None,
            "plugin_directories": [str(d) for d in self.plugin_directories]
        }
    
    async def enable_plugin(self, plugin_name: str) -> bool:
        """
        Enable a plugin
        
        Args:
            plugin_name: Name of the plugin to enable
            
        Returns:
            True if plugin was enabled successfully
        """
        try:
            # Load plugin if not already loaded
            plugin_info = self.plugin_manager.registry.get_plugin(plugin_name)
            if not plugin_info:
                logger.error(f"Plugin not found: {plugin_name}")
                return False
            
            # Load and start plugin
            if plugin_info.state.value in ["discovered"]:
                success = await self.plugin_manager.load_plugin(plugin_name)
                if not success:
                    return False
            
            if plugin_info.state.value in ["initialized", "stopped"]:
                success = await self.plugin_manager.start_plugin(plugin_name)
                if not success:
                    return False
            
            logger.info(f"Plugin {plugin_name} enabled successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable plugin {plugin_name}: {e}")
            return False
    
    async def disable_plugin(self, plugin_name: str) -> bool:
        """
        Disable a plugin
        
        Args:
            plugin_name: Name of the plugin to disable
            
        Returns:
            True if plugin was disabled successfully
        """
        try:
            success = await self.plugin_manager.stop_plugin(plugin_name)
            if success:
                logger.info(f"Plugin {plugin_name} disabled successfully")
            return success
            
        except Exception as e:
            logger.error(f"Failed to disable plugin {plugin_name}: {e}")
            return False
    
    def get_plugin(self, plugin_name: str):
        """Get a running plugin instance"""
        return self.plugin_manager.get_running_plugin(plugin_name)
    
    def get_config(self, component_name: str = None) -> Dict[str, Any]:
        """Get configuration for a component or global config"""
        if component_name:
            return self.config_manager.get_component_config(component_name)
        else:
            return self.config_manager.get_global_config().to_dict()


# Global integration manager instance
_global_integration_manager: Optional[IntegrationManager] = None


def get_integration_manager() -> Optional[IntegrationManager]:
    """Get the global integration manager instance"""
    return _global_integration_manager


def initialize_integration_manager(
    config_file: Optional[Path] = None,
    plugin_directories: Optional[List[Path]] = None
) -> IntegrationManager:
    """Initialize the global integration manager"""
    global _global_integration_manager
    _global_integration_manager = IntegrationManager(config_file, plugin_directories)
    return _global_integration_manager


async def start_integration_framework(
    config_file: Optional[Path] = None,
    plugin_directories: Optional[List[Path]] = None
) -> IntegrationManager:
    """Initialize and start the integration framework"""
    manager = initialize_integration_manager(config_file, plugin_directories)
    await manager.start()
    return manager

