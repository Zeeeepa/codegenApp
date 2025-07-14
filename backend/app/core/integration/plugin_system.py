"""
Plugin System Implementation

Provides a flexible plugin architecture for integrating library kit components.
"""

import asyncio
import importlib
import inspect
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, Set, Callable
from uuid import uuid4

from .event_bus import EventBus, Event, EventHandler

logger = logging.getLogger(__name__)


@dataclass
class PluginMetadata:
    """Metadata for a plugin"""
    
    name: str
    version: str
    description: str
    author: str
    dependencies: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    min_library_kit_version: Optional[str] = None
    max_library_kit_version: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary"""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "dependencies": self.dependencies,
            "tags": self.tags,
            "min_library_kit_version": self.min_library_kit_version,
            "max_library_kit_version": self.max_library_kit_version
        }


class PluginInterface(ABC):
    """Base interface that all plugins must implement"""
    
    @property
    @abstractmethod
    def metadata(self) -> PluginMetadata:
        """Plugin metadata"""
        pass
    
    @abstractmethod
    async def initialize(self, config: Dict[str, Any], event_bus: EventBus) -> None:
        """
        Initialize the plugin
        
        Args:
            config: Plugin configuration
            event_bus: Event bus for communication
        """
        pass
    
    @abstractmethod
    async def shutdown(self) -> None:
        """Shutdown the plugin and cleanup resources"""
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Check plugin health
        
        Returns:
            Health status information
        """
        pass
    
    def get_provided_services(self) -> List[str]:
        """
        Get list of services this plugin provides
        
        Returns:
            List of service names
        """
        return []
    
    def get_required_services(self) -> List[str]:
        """
        Get list of services this plugin requires
        
        Returns:
            List of required service names
        """
        return []


class Plugin:
    """
    Plugin wrapper that manages plugin lifecycle and state
    """
    
    def __init__(self, plugin_instance: PluginInterface, plugin_id: Optional[str] = None):
        self.plugin_instance = plugin_instance
        self.plugin_id = plugin_id or str(uuid4())
        self.state = "uninitialized"
        self.config: Dict[str, Any] = {}
        self.event_bus: Optional[EventBus] = None
        self.initialization_time: Optional[float] = None
        self.error_count = 0
        self.last_error: Optional[str] = None
    
    @property
    def metadata(self) -> PluginMetadata:
        """Get plugin metadata"""
        return self.plugin_instance.metadata
    
    @property
    def name(self) -> str:
        """Get plugin name"""
        return self.metadata.name
    
    @property
    def version(self) -> str:
        """Get plugin version"""
        return self.metadata.version
    
    async def initialize(self, config: Dict[str, Any], event_bus: EventBus) -> None:
        """Initialize the plugin"""
        if self.state != "uninitialized":
            raise RuntimeError(f"Plugin {self.name} is already initialized")
        
        try:
            self.state = "initializing"
            self.config = config
            self.event_bus = event_bus
            
            start_time = asyncio.get_event_loop().time()
            await self.plugin_instance.initialize(config, event_bus)
            self.initialization_time = asyncio.get_event_loop().time() - start_time
            
            self.state = "active"
            logger.info(f"Plugin {self.name} v{self.version} initialized successfully")
            
        except Exception as e:
            self.state = "error"
            self.last_error = str(e)
            self.error_count += 1
            logger.error(f"Failed to initialize plugin {self.name}: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the plugin"""
        if self.state not in ["active", "error"]:
            return
        
        try:
            self.state = "shutting_down"
            await self.plugin_instance.shutdown()
            self.state = "shutdown"
            logger.info(f"Plugin {self.name} shutdown successfully")
            
        except Exception as e:
            self.state = "error"
            self.last_error = str(e)
            self.error_count += 1
            logger.error(f"Error shutting down plugin {self.name}: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Check plugin health"""
        try:
            plugin_health = await self.plugin_instance.health_check()
            
            return {
                "plugin_id": self.plugin_id,
                "name": self.name,
                "version": self.version,
                "state": self.state,
                "error_count": self.error_count,
                "last_error": self.last_error,
                "initialization_time": self.initialization_time,
                "plugin_health": plugin_health
            }
            
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            logger.error(f"Health check failed for plugin {self.name}: {e}")
            
            return {
                "plugin_id": self.plugin_id,
                "name": self.name,
                "version": self.version,
                "state": "error",
                "error_count": self.error_count,
                "last_error": str(e),
                "initialization_time": self.initialization_time,
                "plugin_health": None
            }


class PluginRegistry:
    """
    Registry for managing plugin discovery and loading
    """
    
    def __init__(self):
        self.registered_plugins: Dict[str, Type[PluginInterface]] = {}
        self.plugin_paths: List[Path] = []
    
    def register_plugin(self, plugin_class: Type[PluginInterface]) -> None:
        """
        Register a plugin class
        
        Args:
            plugin_class: Plugin class to register
        """
        if not issubclass(plugin_class, PluginInterface):
            raise ValueError("Plugin must implement PluginInterface")
        
        # Create temporary instance to get metadata
        temp_instance = plugin_class()
        metadata = temp_instance.metadata
        
        self.registered_plugins[metadata.name] = plugin_class
        logger.info(f"Registered plugin: {metadata.name} v{metadata.version}")
    
    def add_plugin_path(self, path: Path) -> None:
        """
        Add a directory to search for plugins
        
        Args:
            path: Directory path to search
        """
        if path.exists() and path.is_dir():
            self.plugin_paths.append(path)
            logger.info(f"Added plugin search path: {path}")
        else:
            logger.warning(f"Plugin path does not exist: {path}")
    
    def discover_plugins(self) -> None:
        """Discover plugins in registered paths"""
        for plugin_path in self.plugin_paths:
            self._discover_plugins_in_path(plugin_path)
    
    def _discover_plugins_in_path(self, path: Path) -> None:
        """Discover plugins in a specific path"""
        try:
            for py_file in path.glob("**/*.py"):
                if py_file.name.startswith("_"):
                    continue
                
                try:
                    self._load_plugin_from_file(py_file)
                except Exception as e:
                    logger.warning(f"Failed to load plugin from {py_file}: {e}")
                    
        except Exception as e:
            logger.error(f"Error discovering plugins in {path}: {e}")
    
    def _load_plugin_from_file(self, file_path: Path) -> None:
        """Load plugin from a Python file"""
        # Convert file path to module name
        module_name = file_path.stem
        
        # Load the module
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec is None or spec.loader is None:
            return
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Find plugin classes in the module
        for name, obj in inspect.getmembers(module, inspect.isclass):
            if (issubclass(obj, PluginInterface) and 
                obj != PluginInterface and 
                obj.__module__ == module.__name__):
                
                self.register_plugin(obj)
    
    def get_plugin_class(self, name: str) -> Optional[Type[PluginInterface]]:
        """
        Get plugin class by name
        
        Args:
            name: Plugin name
            
        Returns:
            Plugin class or None if not found
        """
        return self.registered_plugins.get(name)
    
    def list_plugins(self) -> List[PluginMetadata]:
        """
        List all registered plugins
        
        Returns:
            List of plugin metadata
        """
        plugins = []
        for plugin_class in self.registered_plugins.values():
            temp_instance = plugin_class()
            plugins.append(temp_instance.metadata)
        return plugins
    
    def get_plugins_by_tag(self, tag: str) -> List[str]:
        """
        Get plugin names by tag
        
        Args:
            tag: Tag to search for
            
        Returns:
            List of plugin names with the tag
        """
        matching_plugins = []
        for plugin_class in self.registered_plugins.values():
            temp_instance = plugin_class()
            if tag in temp_instance.metadata.tags:
                matching_plugins.append(temp_instance.metadata.name)
        return matching_plugins


class PluginManager:
    """
    Main plugin manager that handles plugin lifecycle and dependencies
    """
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.registry = PluginRegistry()
        self.loaded_plugins: Dict[str, Plugin] = {}
        self.plugin_configs: Dict[str, Dict[str, Any]] = {}
        self.dependency_graph: Dict[str, Set[str]] = {}
    
    def set_plugin_config(self, plugin_name: str, config: Dict[str, Any]) -> None:
        """
        Set configuration for a plugin
        
        Args:
            plugin_name: Name of the plugin
            config: Configuration dictionary
        """
        self.plugin_configs[plugin_name] = config
    
    async def load_plugin(self, plugin_name: str, plugin_id: Optional[str] = None) -> Plugin:
        """
        Load and initialize a plugin
        
        Args:
            plugin_name: Name of the plugin to load
            plugin_id: Optional custom plugin ID
            
        Returns:
            Loaded plugin instance
        """
        if plugin_name in self.loaded_plugins:
            return self.loaded_plugins[plugin_name]
        
        # Get plugin class
        plugin_class = self.registry.get_plugin_class(plugin_name)
        if plugin_class is None:
            raise ValueError(f"Plugin not found: {plugin_name}")
        
        # Create plugin instance
        plugin_instance = plugin_class()
        plugin = Plugin(plugin_instance, plugin_id)
        
        # Check dependencies
        await self._check_dependencies(plugin)
        
        # Get configuration
        config = self.plugin_configs.get(plugin_name, {})
        
        # Initialize plugin
        await plugin.initialize(config, self.event_bus)
        
        # Store loaded plugin
        self.loaded_plugins[plugin_name] = plugin
        
        # Publish plugin loaded event
        await self.event_bus.publish(Event(
            event_type="plugin.loaded",
            source_component="plugin_manager",
            payload={
                "plugin_name": plugin_name,
                "plugin_id": plugin.plugin_id,
                "version": plugin.version
            }
        ))
        
        logger.info(f"Loaded plugin: {plugin_name}")
        return plugin
    
    async def unload_plugin(self, plugin_name: str) -> None:
        """
        Unload a plugin
        
        Args:
            plugin_name: Name of the plugin to unload
        """
        if plugin_name not in self.loaded_plugins:
            logger.warning(f"Plugin not loaded: {plugin_name}")
            return
        
        plugin = self.loaded_plugins[plugin_name]
        
        # Check if other plugins depend on this one
        dependents = self._get_dependents(plugin_name)
        if dependents:
            raise RuntimeError(f"Cannot unload plugin {plugin_name}, required by: {dependents}")
        
        # Shutdown plugin
        await plugin.shutdown()
        
        # Remove from loaded plugins
        del self.loaded_plugins[plugin_name]
        
        # Publish plugin unloaded event
        await self.event_bus.publish(Event(
            event_type="plugin.unloaded",
            source_component="plugin_manager",
            payload={
                "plugin_name": plugin_name,
                "plugin_id": plugin.plugin_id
            }
        ))
        
        logger.info(f"Unloaded plugin: {plugin_name}")
    
    async def load_plugins_by_tag(self, tag: str) -> List[Plugin]:
        """
        Load all plugins with a specific tag
        
        Args:
            tag: Tag to search for
            
        Returns:
            List of loaded plugins
        """
        plugin_names = self.registry.get_plugins_by_tag(tag)
        plugins = []
        
        for plugin_name in plugin_names:
            try:
                plugin = await self.load_plugin(plugin_name)
                plugins.append(plugin)
            except Exception as e:
                logger.error(f"Failed to load plugin {plugin_name}: {e}")
        
        return plugins
    
    async def _check_dependencies(self, plugin: Plugin) -> None:
        """Check if plugin dependencies are satisfied"""
        required_services = plugin.plugin_instance.get_required_services()
        
        for service in required_services:
            if not self._is_service_available(service):
                # Try to load plugin that provides this service
                provider_plugins = self._find_service_providers(service)
                if not provider_plugins:
                    raise RuntimeError(f"Required service not available: {service}")
                
                # Load the first available provider
                for provider_name in provider_plugins:
                    try:
                        await self.load_plugin(provider_name)
                        break
                    except Exception as e:
                        logger.warning(f"Failed to load service provider {provider_name}: {e}")
                else:
                    raise RuntimeError(f"No available providers for service: {service}")
    
    def _is_service_available(self, service: str) -> bool:
        """Check if a service is available from loaded plugins"""
        for plugin in self.loaded_plugins.values():
            if service in plugin.plugin_instance.get_provided_services():
                return True
        return False
    
    def _find_service_providers(self, service: str) -> List[str]:
        """Find plugins that provide a specific service"""
        providers = []
        for plugin_class in self.registry.registered_plugins.values():
            temp_instance = plugin_class()
            if service in temp_instance.get_provided_services():
                providers.append(temp_instance.metadata.name)
        return providers
    
    def _get_dependents(self, plugin_name: str) -> List[str]:
        """Get list of plugins that depend on the given plugin"""
        dependents = []
        
        # Get services provided by this plugin
        if plugin_name not in self.loaded_plugins:
            return dependents
        
        provided_services = self.loaded_plugins[plugin_name].plugin_instance.get_provided_services()
        
        # Check which loaded plugins require these services
        for name, plugin in self.loaded_plugins.items():
            if name == plugin_name:
                continue
            
            required_services = plugin.plugin_instance.get_required_services()
            if any(service in provided_services for service in required_services):
                dependents.append(name)
        
        return dependents
    
    async def health_check_all(self) -> Dict[str, Any]:
        """
        Run health checks on all loaded plugins
        
        Returns:
            Health status for all plugins
        """
        health_results = {}
        
        for plugin_name, plugin in self.loaded_plugins.items():
            try:
                health_results[plugin_name] = await plugin.health_check()
            except Exception as e:
                health_results[plugin_name] = {
                    "plugin_id": plugin.plugin_id,
                    "name": plugin_name,
                    "state": "error",
                    "error": str(e)
                }
        
        return {
            "overall_status": "healthy" if all(
                result.get("state") == "active" 
                for result in health_results.values()
            ) else "degraded",
            "plugin_count": len(self.loaded_plugins),
            "plugins": health_results
        }
    
    def get_loaded_plugins(self) -> Dict[str, Plugin]:
        """Get all loaded plugins"""
        return self.loaded_plugins.copy()
    
    def get_plugin_info(self, plugin_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific plugin
        
        Args:
            plugin_name: Name of the plugin
            
        Returns:
            Plugin information or None if not found
        """
        if plugin_name not in self.loaded_plugins:
            return None
        
        plugin = self.loaded_plugins[plugin_name]
        return {
            "plugin_id": plugin.plugin_id,
            "metadata": plugin.metadata.to_dict(),
            "state": plugin.state,
            "config": plugin.config,
            "error_count": plugin.error_count,
            "last_error": plugin.last_error,
            "initialization_time": plugin.initialization_time,
            "provided_services": plugin.plugin_instance.get_provided_services(),
            "required_services": plugin.plugin_instance.get_required_services()
        }


# Global plugin manager instance
_global_plugin_manager: Optional[PluginManager] = None


def get_plugin_manager() -> Optional[PluginManager]:
    """Get the global plugin manager instance"""
    return _global_plugin_manager


def initialize_plugin_manager(event_bus: EventBus) -> PluginManager:
    """Initialize the global plugin manager"""
    global _global_plugin_manager
    _global_plugin_manager = PluginManager(event_bus)
    return _global_plugin_manager

