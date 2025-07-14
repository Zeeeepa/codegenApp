"""
Plugin System Implementation

Provides a modular plugin architecture for extending the library kit functionality.
"""

import asyncio
import importlib
import inspect
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Type, Union
from uuid import uuid4
import sys

from .event_bus import EventBus, Event, EventHandler
from .config_manager import ConfigManager

logger = logging.getLogger(__name__)


@dataclass
class PluginMetadata:
    """Metadata for a plugin"""
    
    name: str
    version: str
    description: str
    author: str
    dependencies: List[str] = field(default_factory=list)
    api_version: str = "1.0.0"
    enabled: bool = True
    config_schema: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "dependencies": self.dependencies,
            "api_version": self.api_version,
            "enabled": self.enabled,
            "config_schema": self.config_schema
        }


class Plugin(ABC):
    """
    Abstract base class for all plugins
    
    Plugins can extend the system by:
    - Adding new workflow steps
    - Providing service adapters
    - Handling events
    - Adding API endpoints
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.plugin_id = str(uuid4())
        self.is_initialized = False
        self.is_started = False
    
    @property
    @abstractmethod
    def metadata(self) -> PluginMetadata:
        """Plugin metadata"""
        pass
    
    async def initialize(self, event_bus: EventBus, config_manager: ConfigManager) -> None:
        """
        Initialize the plugin
        
        Args:
            event_bus: Global event bus instance
            config_manager: Global configuration manager
        """
        self.event_bus = event_bus
        self.config_manager = config_manager
        
        # Load plugin-specific configuration
        plugin_config = config_manager.get_component_config(self.metadata.name)
        self.config.update(plugin_config)
        
        await self._initialize()
        self.is_initialized = True
        
        logger.info(f"Initialized plugin: {self.metadata.name}")
    
    async def start(self) -> None:
        """Start the plugin"""
        if not self.is_initialized:
            raise RuntimeError(f"Plugin {self.metadata.name} not initialized")
        
        await self._start()
        self.is_started = True
        
        logger.info(f"Started plugin: {self.metadata.name}")
    
    async def stop(self) -> None:
        """Stop the plugin"""
        if self.is_started:
            await self._stop()
            self.is_started = False
            
        logger.info(f"Stopped plugin: {self.metadata.name}")
    
    async def cleanup(self) -> None:
        """Cleanup plugin resources"""
        if self.is_started:
            await self.stop()
        
        await self._cleanup()
        self.is_initialized = False
        
        logger.info(f"Cleaned up plugin: {self.metadata.name}")
    
    @abstractmethod
    async def _initialize(self) -> None:
        """Plugin-specific initialization logic"""
        pass
    
    async def _start(self) -> None:
        """Plugin-specific start logic (optional)"""
        pass
    
    async def _stop(self) -> None:
        """Plugin-specific stop logic (optional)"""
        pass
    
    async def _cleanup(self) -> None:
        """Plugin-specific cleanup logic (optional)"""
        pass
    
    def get_event_handlers(self) -> List[EventHandler]:
        """
        Get event handlers provided by this plugin
        
        Returns:
            List of event handlers
        """
        return []
    
    def get_api_routes(self) -> List[Any]:
        """
        Get API routes provided by this plugin
        
        Returns:
            List of FastAPI router instances
        """
        return []
    
    def get_workflow_steps(self) -> Dict[str, callable]:
        """
        Get workflow steps provided by this plugin
        
        Returns:
            Dictionary mapping step names to callable functions
        """
        return {}
    
    def get_service_adapters(self) -> Dict[str, Any]:
        """
        Get service adapters provided by this plugin
        
        Returns:
            Dictionary mapping service names to adapter instances
        """
        return {}


class PluginRegistry:
    """Registry for managing plugin metadata and discovery"""
    
    def __init__(self):
        self.plugins: Dict[str, PluginMetadata] = {}
        self.plugin_paths: List[Path] = []
    
    def add_plugin_path(self, path: Union[str, Path]) -> None:
        """Add a path to search for plugins"""
        path = Path(path)
        if path.exists() and path.is_dir():
            self.plugin_paths.append(path)
            logger.info(f"Added plugin path: {path}")
        else:
            logger.warning(f"Plugin path does not exist: {path}")
    
    def register_plugin(self, metadata: PluginMetadata) -> None:
        """Register a plugin's metadata"""
        self.plugins[metadata.name] = metadata
        logger.info(f"Registered plugin: {metadata.name} v{metadata.version}")
    
    def get_plugin_metadata(self, name: str) -> Optional[PluginMetadata]:
        """Get metadata for a specific plugin"""
        return self.plugins.get(name)
    
    def list_plugins(self) -> List[PluginMetadata]:
        """List all registered plugins"""
        return list(self.plugins.values())
    
    def discover_plugins(self) -> List[str]:
        """
        Discover plugins in registered paths
        
        Returns:
            List of discovered plugin module names
        """
        discovered = []
        
        for plugin_path in self.plugin_paths:
            try:
                for item in plugin_path.iterdir():
                    if item.is_file() and item.suffix == '.py' and not item.name.startswith('_'):
                        # Python file plugin
                        module_name = item.stem
                        discovered.append(f"{plugin_path.name}.{module_name}")
                    elif item.is_dir() and not item.name.startswith('_'):
                        # Package plugin
                        init_file = item / '__init__.py'
                        if init_file.exists():
                            discovered.append(f"{plugin_path.name}.{item.name}")
                            
            except Exception as e:
                logger.error(f"Error discovering plugins in {plugin_path}: {e}")
        
        logger.info(f"Discovered {len(discovered)} plugins")
        return discovered


class PluginManager:
    """
    Plugin manager for loading, initializing, and managing plugins
    
    Features:
    - Plugin discovery and loading
    - Dependency resolution
    - Lifecycle management
    - Event handler registration
    - API route registration
    """
    
    def __init__(self, event_bus: EventBus, config_manager: ConfigManager):
        self.event_bus = event_bus
        self.config_manager = config_manager
        self.registry = PluginRegistry()
        self.loaded_plugins: Dict[str, Plugin] = {}
        self.plugin_instances: Dict[str, Plugin] = {}
        self.dependency_graph: Dict[str, Set[str]] = {}
    
    def add_plugin_path(self, path: Union[str, Path]) -> None:
        """Add a path to search for plugins"""
        self.registry.add_plugin_path(path)
    
    async def discover_and_load_plugins(self) -> None:
        """Discover and load all plugins"""
        discovered = self.registry.discover_plugins()
        
        for module_name in discovered:
            try:
                await self.load_plugin(module_name)
            except Exception as e:
                logger.error(f"Failed to load plugin {module_name}: {e}")
    
    async def load_plugin(self, module_name: str) -> Optional[Plugin]:
        """
        Load a plugin from a module
        
        Args:
            module_name: Name of the module to load
            
        Returns:
            Loaded plugin instance or None if failed
        """
        try:
            # Import the module
            module = importlib.import_module(module_name)
            
            # Find plugin classes in the module
            plugin_classes = []
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, Plugin) and 
                    obj != Plugin):
                    plugin_classes.append(obj)
            
            if not plugin_classes:
                logger.warning(f"No plugin classes found in {module_name}")
                return None
            
            if len(plugin_classes) > 1:
                logger.warning(f"Multiple plugin classes found in {module_name}, using first one")
            
            # Instantiate the plugin
            plugin_class = plugin_classes[0]
            plugin_config = self.config_manager.get_component_config(plugin_class.__name__)
            plugin = plugin_class(plugin_config)
            
            # Register metadata
            self.registry.register_plugin(plugin.metadata)
            
            # Store the plugin
            self.loaded_plugins[plugin.metadata.name] = plugin
            
            logger.info(f"Loaded plugin: {plugin.metadata.name}")
            return plugin
            
        except Exception as e:
            logger.error(f"Failed to load plugin {module_name}: {e}")
            return None
    
    async def initialize_plugins(self) -> None:
        """Initialize all loaded plugins in dependency order"""
        # Build dependency graph
        self._build_dependency_graph()
        
        # Get initialization order
        init_order = self._resolve_dependencies()
        
        # Initialize plugins in order
        for plugin_name in init_order:
            plugin = self.loaded_plugins.get(plugin_name)
            if plugin and plugin.metadata.enabled:
                try:
                    await plugin.initialize(self.event_bus, self.config_manager)
                    self.plugin_instances[plugin_name] = plugin
                    
                    # Register event handlers
                    await self._register_event_handlers(plugin)
                    
                except Exception as e:
                    logger.error(f"Failed to initialize plugin {plugin_name}: {e}")
    
    async def start_plugins(self) -> None:
        """Start all initialized plugins"""
        for plugin_name, plugin in self.plugin_instances.items():
            try:
                await plugin.start()
            except Exception as e:
                logger.error(f"Failed to start plugin {plugin_name}: {e}")
    
    async def stop_plugins(self) -> None:
        """Stop all running plugins"""
        # Stop in reverse order
        plugin_names = list(self.plugin_instances.keys())
        for plugin_name in reversed(plugin_names):
            plugin = self.plugin_instances[plugin_name]
            try:
                await plugin.stop()
            except Exception as e:
                logger.error(f"Failed to stop plugin {plugin_name}: {e}")
    
    async def cleanup_plugins(self) -> None:
        """Cleanup all plugins"""
        for plugin_name, plugin in self.plugin_instances.items():
            try:
                await plugin.cleanup()
            except Exception as e:
                logger.error(f"Failed to cleanup plugin {plugin_name}: {e}")
        
        self.plugin_instances.clear()
        self.loaded_plugins.clear()
    
    def get_plugin(self, name: str) -> Optional[Plugin]:
        """Get a plugin instance by name"""
        return self.plugin_instances.get(name)
    
    def list_plugins(self) -> List[PluginMetadata]:
        """List all registered plugins"""
        return self.registry.list_plugins()
    
    def get_plugin_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all plugins"""
        status = {}
        
        for plugin_name, plugin in self.loaded_plugins.items():
            status[plugin_name] = {
                "metadata": plugin.metadata.to_dict(),
                "loaded": True,
                "initialized": plugin.is_initialized,
                "started": plugin.is_started,
                "enabled": plugin.metadata.enabled
            }
        
        return status
    
    async def enable_plugin(self, name: str) -> bool:
        """Enable a plugin"""
        plugin = self.loaded_plugins.get(name)
        if not plugin:
            return False
        
        plugin.metadata.enabled = True
        
        if not plugin.is_initialized:
            await plugin.initialize(self.event_bus, self.config_manager)
            self.plugin_instances[name] = plugin
            await self._register_event_handlers(plugin)
        
        if not plugin.is_started:
            await plugin.start()
        
        return True
    
    async def disable_plugin(self, name: str) -> bool:
        """Disable a plugin"""
        plugin = self.plugin_instances.get(name)
        if not plugin:
            return False
        
        plugin.metadata.enabled = False
        
        if plugin.is_started:
            await plugin.stop()
        
        return True
    
    def _build_dependency_graph(self) -> None:
        """Build dependency graph for plugins"""
        self.dependency_graph.clear()
        
        for plugin_name, plugin in self.loaded_plugins.items():
            self.dependency_graph[plugin_name] = set(plugin.metadata.dependencies)
    
    def _resolve_dependencies(self) -> List[str]:
        """
        Resolve plugin dependencies using topological sort
        
        Returns:
            List of plugin names in dependency order
        """
        # Kahn's algorithm for topological sorting
        in_degree = {}
        graph = {}
        
        # Initialize
        for plugin_name in self.loaded_plugins:
            in_degree[plugin_name] = 0
            graph[plugin_name] = []
        
        # Build graph and calculate in-degrees
        for plugin_name, dependencies in self.dependency_graph.items():
            for dep in dependencies:
                if dep in graph:
                    graph[dep].append(plugin_name)
                    in_degree[plugin_name] += 1
                else:
                    logger.warning(f"Plugin {plugin_name} depends on unknown plugin {dep}")
        
        # Topological sort
        queue = [name for name, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            current = queue.pop(0)
            result.append(current)
            
            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check for circular dependencies
        if len(result) != len(self.loaded_plugins):
            remaining = set(self.loaded_plugins.keys()) - set(result)
            logger.error(f"Circular dependency detected among plugins: {remaining}")
            # Add remaining plugins anyway
            result.extend(remaining)
        
        return result
    
    async def _register_event_handlers(self, plugin: Plugin) -> None:
        """Register event handlers for a plugin"""
        handlers = plugin.get_event_handlers()
        
        for handler in handlers:
            for event_type in handler.handled_event_types:
                self.event_bus.subscribe(
                    event_type,
                    handler,
                    plugin.metadata.name
                )
                
                logger.debug(f"Registered handler for {event_type} from {plugin.metadata.name}")


# Global plugin manager instance
_global_plugin_manager: Optional[PluginManager] = None


def get_plugin_manager() -> Optional[PluginManager]:
    """Get the global plugin manager instance"""
    return _global_plugin_manager


def initialize_plugin_manager(event_bus: EventBus, config_manager: ConfigManager) -> PluginManager:
    """Initialize the global plugin manager"""
    global _global_plugin_manager
    _global_plugin_manager = PluginManager(event_bus, config_manager)
    return _global_plugin_manager

