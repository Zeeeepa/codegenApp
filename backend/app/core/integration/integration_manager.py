"""
Integration Manager

Coordinates the initialization and management of all library kit components.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from .event_bus import EventBus, Event, EventTypes, initialize_event_bus, shutdown_event_bus
from .plugin_system import PluginManager, initialize_plugin_manager, get_plugin_manager
from .config_manager import ConfigManager, initialize_config_manager, get_config_manager
from ..orchestration.coordinator import ServiceCoordinator
from ..orchestration.state_manager import StateManagerFactory, WorkflowStateManager

logger = logging.getLogger(__name__)


class IntegrationManager:
    """
    Main integration manager that coordinates all library kit components
    
    Responsibilities:
    - Initialize core integration framework
    - Load and manage plugins
    - Coordinate service adapters
    - Handle component lifecycle
    - Provide unified health monitoring
    """
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file
        self.config_manager: Optional[ConfigManager] = None
        self.event_bus: Optional[EventBus] = None
        self.plugin_manager: Optional[PluginManager] = None
        self.service_coordinator: Optional[ServiceCoordinator] = None
        self.state_manager: Optional[WorkflowStateManager] = None
        
        self.initialized = False
        self.startup_time: Optional[float] = None
        self.component_status: Dict[str, str] = {}
    
    async def initialize(self) -> None:
        """Initialize the integration manager and all components"""
        if self.initialized:
            logger.warning("Integration manager already initialized")
            return
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            logger.info("🚀 Initializing Library Kit Integration Manager")
            
            # 1. Initialize configuration manager
            await self._initialize_config_manager()
            
            # 2. Initialize event bus
            await self._initialize_event_bus()
            
            # 3. Initialize plugin manager
            await self._initialize_plugin_manager()
            
            # 4. Initialize service coordinator
            await self._initialize_service_coordinator()
            
            # 5. Initialize state manager
            await self._initialize_state_manager()
            
            # 6. Load and initialize plugins
            await self._load_plugins()
            
            # 7. Register service adapters
            await self._register_service_adapters()
            
            # 8. Start health monitoring
            await self._start_health_monitoring()
            
            self.startup_time = asyncio.get_event_loop().time() - start_time
            self.initialized = True
            
            logger.info(f"✅ Library Kit Integration Manager initialized successfully in {self.startup_time:.2f}s")
            
            # Publish initialization complete event
            await self.event_bus.publish(Event(
                event_type=EventTypes.COMPONENT_STARTED,
                source_component="integration_manager",
                payload={
                    "startup_time": self.startup_time,
                    "components_loaded": list(self.component_status.keys())
                }
            ))
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Integration Manager: {e}")
            await self.shutdown()
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the integration manager and all components"""
        if not self.initialized:
            return
        
        logger.info("🛑 Shutting down Library Kit Integration Manager")
        
        try:
            # Publish shutdown event
            if self.event_bus:
                await self.event_bus.publish(Event(
                    event_type=EventTypes.COMPONENT_STOPPED,
                    source_component="integration_manager",
                    payload={"reason": "shutdown"}
                ))
            
            # Shutdown components in reverse order
            if self.plugin_manager:
                await self._shutdown_plugins()
            
            if self.state_manager:
                await self.state_manager.stop()
                self.component_status["state_manager"] = "stopped"
            
            if self.service_coordinator:
                await self.service_coordinator.cleanup()
                self.component_status["service_coordinator"] = "stopped"
            
            if self.event_bus:
                await shutdown_event_bus()
                self.component_status["event_bus"] = "stopped"
            
            self.initialized = False
            logger.info("✅ Library Kit Integration Manager shutdown complete")
            
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {e}")
    
    async def _initialize_config_manager(self) -> None:
        """Initialize configuration manager"""
        logger.info("📋 Initializing Configuration Manager")
        
        self.config_manager = initialize_config_manager(self.config_file)
        
        # Load configuration if file exists
        if self.config_file and self.config_file.exists():
            self.config_manager.load_config()
        
        # Validate configuration
        errors = self.config_manager.validate_config()
        if errors:
            logger.warning(f"Configuration validation warnings: {errors}")
        
        self.component_status["config_manager"] = "active"
        logger.info("✅ Configuration Manager initialized")
    
    async def _initialize_event_bus(self) -> None:
        """Initialize event bus"""
        logger.info("📡 Initializing Event Bus")
        
        self.event_bus = await initialize_event_bus()
        self.component_status["event_bus"] = "active"
        
        logger.info("✅ Event Bus initialized")
    
    async def _initialize_plugin_manager(self) -> None:
        """Initialize plugin manager"""
        logger.info("🔌 Initializing Plugin Manager")
        
        self.plugin_manager = initialize_plugin_manager(self.event_bus)
        
        # Add plugin search paths
        plugin_paths = [
            Path("plugins"),
            Path("backend/app/plugins"),
            Path("backend/app/services/adapters")
        ]
        
        for path in plugin_paths:
            if path.exists():
                self.plugin_manager.registry.add_plugin_path(path)
        
        # Discover plugins
        self.plugin_manager.registry.discover_plugins()
        
        self.component_status["plugin_manager"] = "active"
        logger.info("✅ Plugin Manager initialized")
    
    async def _initialize_service_coordinator(self) -> None:
        """Initialize service coordinator"""
        logger.info("🎯 Initializing Service Coordinator")
        
        self.service_coordinator = ServiceCoordinator()
        self.component_status["service_coordinator"] = "active"
        
        logger.info("✅ Service Coordinator initialized")
    
    async def _initialize_state_manager(self) -> None:
        """Initialize state manager"""
        logger.info("💾 Initializing State Manager")
        
        # Get state manager configuration
        config = self.config_manager.get_global_config()
        
        if config.database_url:
            # Use database state manager
            self.state_manager = StateManagerFactory.create_database_manager(
                database_url=config.database_url
            )
        else:
            # Use in-memory state manager
            self.state_manager = StateManagerFactory.create_in_memory_manager()
        
        await self.state_manager.start()
        self.component_status["state_manager"] = "active"
        
        logger.info("✅ State Manager initialized")
    
    async def _load_plugins(self) -> None:
        """Load and initialize plugins"""
        logger.info("🔌 Loading Plugins")
        
        # Get plugin configurations
        global_config = self.config_manager.get_global_config()
        
        plugins_loaded = 0
        
        # Load core adapter plugins
        core_adapters = ["grainchain", "graph_sitter", "web_eval_agent"]
        
        for adapter_name in core_adapters:
            try:
                # Set plugin configuration
                component_config = self.config_manager.get_component_config(adapter_name)
                if component_config:
                    self.plugin_manager.set_plugin_config(adapter_name, component_config)
                
                # Load plugin if available
                plugin_class = self.plugin_manager.registry.get_plugin_class(adapter_name)
                if plugin_class:
                    await self.plugin_manager.load_plugin(adapter_name)
                    plugins_loaded += 1
                    logger.info(f"✅ Loaded plugin: {adapter_name}")
                else:
                    logger.info(f"⚠️ Plugin not found: {adapter_name}")
                    
            except Exception as e:
                logger.error(f"❌ Failed to load plugin {adapter_name}: {e}")
        
        self.component_status["plugins"] = f"loaded_{plugins_loaded}"
        logger.info(f"✅ Loaded {plugins_loaded} plugins")
    
    async def _register_service_adapters(self) -> None:
        """Register service adapters with the coordinator"""
        logger.info("🔗 Registering Service Adapters")
        
        adapters_registered = 0
        
        # Register grainchain adapter
        try:
            from ...services.adapters.grainchain_adapter import GrainchainAdapter
            
            grainchain_config = self.config_manager.get_component_config("grainchain")
            grainchain_adapter = GrainchainAdapter(grainchain_config)
            
            self.service_coordinator.register_adapter("grainchain", grainchain_adapter)
            adapters_registered += 1
            logger.info("✅ Registered grainchain adapter")
            
        except Exception as e:
            logger.error(f"❌ Failed to register grainchain adapter: {e}")
        
        # Register codegen adapter
        try:
            from ...services.adapters.codegen_adapter import CodegenService
            
            codegen_config = self.config_manager.get_component_config("codegen")
            codegen_adapter = CodegenService(
                api_token=codegen_config.get("api_token"),
                api_base_url=codegen_config.get("api_base_url")
            )
            
            self.service_coordinator.register_adapter("codegen", codegen_adapter)
            adapters_registered += 1
            logger.info("✅ Registered codegen adapter")
            
        except Exception as e:
            logger.error(f"❌ Failed to register codegen adapter: {e}")
        
        # Register additional adapters from plugins
        if self.plugin_manager:
            for plugin_name, plugin in self.plugin_manager.get_loaded_plugins().items():
                try:
                    # Check if plugin provides service adapter
                    if hasattr(plugin.plugin_instance, 'get_service_adapter'):
                        adapter = plugin.plugin_instance.get_service_adapter()
                        self.service_coordinator.register_adapter(plugin_name, adapter)
                        adapters_registered += 1
                        logger.info(f"✅ Registered {plugin_name} adapter from plugin")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to register adapter from plugin {plugin_name}: {e}")
        
        self.component_status["service_adapters"] = f"registered_{adapters_registered}"
        logger.info(f"✅ Registered {adapters_registered} service adapters")
    
    async def _start_health_monitoring(self) -> None:
        """Start health monitoring for all components"""
        logger.info("🏥 Starting Health Monitoring")
        
        # Create health monitoring task
        asyncio.create_task(self._health_monitor_loop())
        
        self.component_status["health_monitoring"] = "active"
        logger.info("✅ Health Monitoring started")
    
    async def _health_monitor_loop(self) -> None:
        """Background health monitoring loop"""
        while self.initialized:
            try:
                # Run health checks
                health_status = await self.get_health_status()
                
                # Publish health check event
                await self.event_bus.publish(Event(
                    event_type=EventTypes.HEALTH_CHECK,
                    source_component="integration_manager",
                    payload=health_status
                ))
                
                # Check for unhealthy components
                unhealthy_components = [
                    name for name, status in health_status.get("components", {}).items()
                    if status.get("status") != "healthy"
                ]
                
                if unhealthy_components:
                    logger.warning(f"Unhealthy components detected: {unhealthy_components}")
                
                # Wait before next check
                await asyncio.sleep(30)  # Health check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in health monitoring: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _shutdown_plugins(self) -> None:
        """Shutdown all loaded plugins"""
        if not self.plugin_manager:
            return
        
        logger.info("🔌 Shutting down plugins")
        
        loaded_plugins = list(self.plugin_manager.get_loaded_plugins().keys())
        
        for plugin_name in loaded_plugins:
            try:
                await self.plugin_manager.unload_plugin(plugin_name)
                logger.info(f"✅ Unloaded plugin: {plugin_name}")
            except Exception as e:
                logger.error(f"❌ Error unloading plugin {plugin_name}: {e}")
        
        self.component_status["plugins"] = "stopped"
    
    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status of all components
        
        Returns:
            Health status information
        """
        health_status = {
            "overall_status": "healthy",
            "startup_time": self.startup_time,
            "components": {},
            "metrics": {}
        }
        
        # Check core components
        core_components = {
            "config_manager": self.config_manager,
            "event_bus": self.event_bus,
            "plugin_manager": self.plugin_manager,
            "service_coordinator": self.service_coordinator,
            "state_manager": self.state_manager
        }
        
        for name, component in core_components.items():
            if component is None:
                health_status["components"][name] = {
                    "status": "not_initialized",
                    "message": "Component not initialized"
                }
                health_status["overall_status"] = "degraded"
            else:
                try:
                    if hasattr(component, 'health_check'):
                        component_health = await component.health_check()
                    else:
                        component_health = {"status": "healthy", "message": "No health check available"}
                    
                    health_status["components"][name] = component_health
                    
                    if component_health.get("status") != "healthy":
                        health_status["overall_status"] = "degraded"
                        
                except Exception as e:
                    health_status["components"][name] = {
                        "status": "error",
                        "message": str(e)
                    }
                    health_status["overall_status"] = "unhealthy"
        
        # Check plugins
        if self.plugin_manager:
            try:
                plugin_health = await self.plugin_manager.health_check_all()
                health_status["components"]["plugins"] = plugin_health
                
                if plugin_health.get("overall_status") != "healthy":
                    health_status["overall_status"] = "degraded"
                    
            except Exception as e:
                health_status["components"]["plugins"] = {
                    "status": "error",
                    "message": str(e)
                }
                health_status["overall_status"] = "unhealthy"
        
        # Check service adapters
        if self.service_coordinator:
            try:
                adapter_health = await self.service_coordinator.health_check_all()
                health_status["components"]["service_adapters"] = adapter_health
                
                for adapter_status in adapter_health.values():
                    if adapter_status != "healthy":
                        health_status["overall_status"] = "degraded"
                        break
                        
            except Exception as e:
                health_status["components"]["service_adapters"] = {
                    "status": "error",
                    "message": str(e)
                }
                health_status["overall_status"] = "unhealthy"
        
        # Add metrics
        if self.event_bus:
            health_status["metrics"]["event_bus"] = self.event_bus.get_metrics()
        
        return health_status
    
    def get_component_info(self) -> Dict[str, Any]:
        """
        Get information about all loaded components
        
        Returns:
            Component information
        """
        info = {
            "integration_manager": {
                "initialized": self.initialized,
                "startup_time": self.startup_time,
                "component_status": self.component_status
            }
        }
        
        # Add plugin information
        if self.plugin_manager:
            info["plugins"] = {}
            for plugin_name, plugin in self.plugin_manager.get_loaded_plugins().items():
                info["plugins"][plugin_name] = self.plugin_manager.get_plugin_info(plugin_name)
        
        # Add service adapter information
        if self.service_coordinator:
            info["service_adapters"] = list(self.service_coordinator.adapters.keys())
        
        # Add configuration information
        if self.config_manager:
            info["configuration"] = {
                "environment": self.config_manager.get_global_config().environment,
                "components_configured": list(self.config_manager.get_global_config().components.keys())
            }
        
        return info
    
    async def reload_configuration(self) -> None:
        """Reload configuration from file"""
        if not self.config_manager or not self.config_file:
            raise RuntimeError("Configuration manager not initialized or no config file")
        
        logger.info("🔄 Reloading configuration")
        
        # Reload configuration
        self.config_manager.load_config()
        
        # Validate new configuration
        errors = self.config_manager.validate_config()
        if errors:
            logger.warning(f"Configuration validation warnings after reload: {errors}")
        
        # Publish configuration reload event
        await self.event_bus.publish(Event(
            event_type="config.reloaded",
            source_component="integration_manager",
            payload={"config_file": str(self.config_file)}
        ))
        
        logger.info("✅ Configuration reloaded successfully")


# Global integration manager instance
_global_integration_manager: Optional[IntegrationManager] = None


def get_integration_manager() -> Optional[IntegrationManager]:
    """Get the global integration manager instance"""
    return _global_integration_manager


async def initialize_integration_manager(config_file: Optional[Path] = None) -> IntegrationManager:
    """Initialize the global integration manager"""
    global _global_integration_manager
    _global_integration_manager = IntegrationManager(config_file)
    await _global_integration_manager.initialize()
    return _global_integration_manager


async def shutdown_integration_manager() -> None:
    """Shutdown the global integration manager"""
    global _global_integration_manager
    if _global_integration_manager:
        await _global_integration_manager.shutdown()
        _global_integration_manager = None

