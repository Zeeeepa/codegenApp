"""
Integration Manager

Orchestrates the integration of all library kit components including configuration,
event bus, plugins, and service adapters.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from .config_manager import ConfigManager, initialize_config_manager
from .event_bus import EventBus, initialize_event_bus
from .plugin_system import PluginManager, initialize_plugin_manager
from ..orchestration.coordinator import ServiceCoordinator
from ..orchestration.state_manager import WorkflowStateManager

logger = logging.getLogger(__name__)


class IntegrationManager:
    """
    Central manager for all integration components
    
    Coordinates:
    - Configuration management
    - Event bus
    - Plugin system
    - Service adapters
    - Workflow orchestration
    """
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file
        self.config_manager: Optional[ConfigManager] = None
        self.event_bus: Optional[EventBus] = None
        self.plugin_manager: Optional[PluginManager] = None
        self.service_coordinator: Optional[ServiceCoordinator] = None
        self.state_manager: Optional[WorkflowStateManager] = None
        self.is_initialized = False
        self.is_started = False
    
    async def initialize(self) -> None:
        """Initialize all integration components"""
        if self.is_initialized:
            return
        
        logger.info("Initializing integration manager...")
        
        try:
            # 1. Initialize configuration manager
            self.config_manager = initialize_config_manager(self.config_file)
            if self.config_file:
                self.config_manager.load_config()
            
            # 2. Initialize event bus
            self.event_bus = await initialize_event_bus()
            
            # 3. Initialize service coordinator
            self.service_coordinator = ServiceCoordinator()
            
            # 4. Initialize plugin manager
            self.plugin_manager = initialize_plugin_manager(
                self.event_bus, 
                self.config_manager
            )
            
            # 5. Add default plugin paths
            self._setup_plugin_paths()
            
            # 6. Discover and load plugins
            await self.plugin_manager.discover_and_load_plugins()
            
            # 7. Initialize plugins
            await self.plugin_manager.initialize_plugins()
            
            # 8. Register service adapters from plugins
            await self._register_service_adapters()
            
            self.is_initialized = True
            logger.info("Integration manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize integration manager: {e}")
            raise
    
    async def start(self) -> None:
        """Start all integration components"""
        if not self.is_initialized:
            await self.initialize()
        
        if self.is_started:
            return
        
        logger.info("Starting integration manager...")
        
        try:
            # Start plugins
            if self.plugin_manager:
                await self.plugin_manager.start_plugins()
            
            # Publish startup event
            if self.event_bus:
                from .event_bus import Event
                startup_event = Event(
                    event_type="system.startup",
                    source_component="integration_manager",
                    payload={"status": "started"}
                )
                await self.event_bus.publish(startup_event)
            
            self.is_started = True
            logger.info("Integration manager started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start integration manager: {e}")
            raise
    
    async def stop(self) -> None:
        """Stop all integration components"""
        if not self.is_started:
            return
        
        logger.info("Stopping integration manager...")
        
        try:
            # Publish shutdown event
            if self.event_bus:
                from .event_bus import Event
                shutdown_event = Event(
                    event_type="system.shutdown",
                    source_component="integration_manager",
                    payload={"status": "stopping"}
                )
                await self.event_bus.publish(shutdown_event)
            
            # Stop plugins
            if self.plugin_manager:
                await self.plugin_manager.stop_plugins()
            
            # Stop event bus
            if self.event_bus:
                await self.event_bus.stop()
            
            self.is_started = False
            logger.info("Integration manager stopped successfully")
            
        except Exception as e:
            logger.error(f"Failed to stop integration manager: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup all integration components"""
        if self.is_started:
            await self.stop()
        
        logger.info("Cleaning up integration manager...")
        
        try:
            # Cleanup plugins
            if self.plugin_manager:
                await self.plugin_manager.cleanup_plugins()
            
            # Reset components
            self.config_manager = None
            self.event_bus = None
            self.plugin_manager = None
            self.service_coordinator = None
            self.state_manager = None
            
            self.is_initialized = False
            logger.info("Integration manager cleaned up successfully")
            
        except Exception as e:
            logger.error(f"Failed to cleanup integration manager: {e}")
            raise
    
    def get_config_manager(self) -> Optional[ConfigManager]:
        """Get the configuration manager"""
        return self.config_manager
    
    def get_event_bus(self) -> Optional[EventBus]:
        """Get the event bus"""
        return self.event_bus
    
    def get_plugin_manager(self) -> Optional[PluginManager]:
        """Get the plugin manager"""
        return self.plugin_manager
    
    def get_service_coordinator(self) -> Optional[ServiceCoordinator]:
        """Get the service coordinator"""
        return self.service_coordinator
    
    def get_state_manager(self) -> Optional[WorkflowStateManager]:
        """Get the state manager"""
        return self.state_manager
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        status = {
            "integration_manager": {
                "initialized": self.is_initialized,
                "started": self.is_started
            },
            "config_manager": {
                "available": self.config_manager is not None,
                "config_file": str(self.config_file) if self.config_file else None
            },
            "event_bus": {
                "available": self.event_bus is not None,
                "running": self.event_bus.running if self.event_bus else False,
                "metrics": self.event_bus.get_metrics() if self.event_bus else {}
            },
            "plugin_manager": {
                "available": self.plugin_manager is not None,
                "plugins": self.plugin_manager.get_plugin_status() if self.plugin_manager else {}
            },
            "service_coordinator": {
                "available": self.service_coordinator is not None,
                "services": self.service_coordinator.get_registered_services() if self.service_coordinator else []
            }
        }
        
        return status
    
    async def reload_configuration(self) -> None:
        """Reload configuration and notify components"""
        if not self.config_manager:
            raise RuntimeError("Configuration manager not initialized")
        
        logger.info("Reloading configuration...")
        
        # Reload config file
        if self.config_file:
            self.config_manager.load_config()
        
        # Publish configuration change event
        if self.event_bus:
            from .event_bus import Event
            config_event = Event(
                event_type="config.reloaded",
                source_component="integration_manager",
                payload={"config_file": str(self.config_file) if self.config_file else None}
            )
            await self.event_bus.publish(config_event)
        
        logger.info("Configuration reloaded successfully")
    
    async def enable_plugin(self, plugin_name: str) -> bool:
        """Enable a plugin"""
        if not self.plugin_manager:
            return False
        
        result = await self.plugin_manager.enable_plugin(plugin_name)
        
        if result and self.event_bus:
            from .event_bus import Event
            plugin_event = Event(
                event_type="plugin.enabled",
                source_component="integration_manager",
                payload={"plugin_name": plugin_name}
            )
            await self.event_bus.publish(plugin_event)
        
        return result
    
    async def disable_plugin(self, plugin_name: str) -> bool:
        """Disable a plugin"""
        if not self.plugin_manager:
            return False
        
        result = await self.plugin_manager.disable_plugin(plugin_name)
        
        if result and self.event_bus:
            from .event_bus import Event
            plugin_event = Event(
                event_type="plugin.disabled",
                source_component="integration_manager",
                payload={"plugin_name": plugin_name}
            )
            await self.event_bus.publish(plugin_event)
        
        return result
    
    def _setup_plugin_paths(self) -> None:
        """Setup default plugin search paths"""
        if not self.plugin_manager:
            return
        
        # Add default plugin directories
        default_paths = [
            Path(__file__).parent.parent.parent / "plugins",  # app/plugins
            Path(__file__).parent.parent.parent / "services" / "plugins",  # app/services/plugins
            Path.cwd() / "plugins"  # project root plugins
        ]
        
        for path in default_paths:
            if path.exists():
                self.plugin_manager.add_plugin_path(path)
    
    async def _register_service_adapters(self) -> None:
        """Register service adapters from plugins"""
        if not self.plugin_manager or not self.service_coordinator:
            return
        
        for plugin_name, plugin in self.plugin_manager.plugin_instances.items():
            try:
                adapters = plugin.get_service_adapters()
                
                for service_name, adapter in adapters.items():
                    self.service_coordinator.register_adapter(service_name, adapter)
                    logger.info(f"Registered service adapter '{service_name}' from plugin '{plugin_name}'")
                    
            except Exception as e:
                logger.error(f"Failed to register service adapters from plugin {plugin_name}: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        health = {
            "status": "healthy",
            "components": {},
            "timestamp": asyncio.get_event_loop().time()
        }
        
        try:
            # Check configuration manager
            if self.config_manager:
                validation_errors = self.config_manager.validate_config()
                health["components"]["config_manager"] = {
                    "status": "healthy" if not validation_errors else "unhealthy",
                    "errors": validation_errors
                }
            
            # Check event bus
            if self.event_bus:
                health["components"]["event_bus"] = {
                    "status": "healthy" if self.event_bus.running else "stopped",
                    "metrics": self.event_bus.get_metrics()
                }
            
            # Check service coordinator
            if self.service_coordinator:
                service_health = await self.service_coordinator.health_check_all()
                health["components"]["service_coordinator"] = {
                    "status": "healthy",
                    "services": service_health
                }
            
            # Check plugins
            if self.plugin_manager:
                plugin_status = self.plugin_manager.get_plugin_status()
                unhealthy_plugins = [
                    name for name, status in plugin_status.items()
                    if status["enabled"] and not status["started"]
                ]
                
                health["components"]["plugin_manager"] = {
                    "status": "healthy" if not unhealthy_plugins else "degraded",
                    "unhealthy_plugins": unhealthy_plugins,
                    "total_plugins": len(plugin_status)
                }
            
            # Determine overall status
            component_statuses = [
                comp["status"] for comp in health["components"].values()
            ]
            
            if "unhealthy" in component_statuses:
                health["status"] = "unhealthy"
            elif "degraded" in component_statuses:
                health["status"] = "degraded"
            
        except Exception as e:
            health["status"] = "error"
            health["error"] = str(e)
            logger.error(f"Health check failed: {e}")
        
        return health


# Global integration manager instance
_global_integration_manager: Optional[IntegrationManager] = None


def get_integration_manager() -> Optional[IntegrationManager]:
    """Get the global integration manager instance"""
    return _global_integration_manager


def initialize_integration_manager(config_file: Optional[Path] = None) -> IntegrationManager:
    """Initialize the global integration manager"""
    global _global_integration_manager
    _global_integration_manager = IntegrationManager(config_file)
    return _global_integration_manager


async def startup_integration_manager(config_file: Optional[Path] = None) -> IntegrationManager:
    """Initialize and start the global integration manager"""
    manager = initialize_integration_manager(config_file)
    await manager.initialize()
    await manager.start()
    return manager


async def shutdown_integration_manager():
    """Shutdown the global integration manager"""
    global _global_integration_manager
    if _global_integration_manager:
        await _global_integration_manager.cleanup()
        _global_integration_manager = None

