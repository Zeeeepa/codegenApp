"""
Plugin System Implementation

Provides dynamic plugin discovery, loading, and lifecycle management.
"""

import asyncio
import importlib
import inspect
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Type, Union
from enum import Enum
import sys

logger = logging.getLogger(__name__)


class PluginState(Enum):
    """Plugin lifecycle states"""
    DISCOVERED = "discovered"
    LOADED = "loaded"
    INITIALIZED = "initialized"
    STARTED = "started"
    STOPPED = "stopped"
    FAILED = "failed"


@dataclass
class PluginMetadata:
    """Plugin metadata information"""
    name: str
    version: str
    description: str
    author: str
    dependencies: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    config_schema: Optional[Dict[str, Any]] = None
    entry_point: Optional[str] = None


class Plugin(ABC):
    """
    Abstract base class for all plugins
    
    Plugins must implement the required lifecycle methods and provide metadata.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.state = PluginState.DISCOVERED
        self.logger = logging.getLogger(f"plugin.{self.get_metadata().name}")
    
    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        """Return plugin metadata"""
        pass
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the plugin with configuration"""
        pass
    
    @abstractmethod
    async def start(self) -> None:
        """Start the plugin services"""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """Stop the plugin services"""
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on the plugin
        
        Returns:
            Health status information
        """
        return {
            "status": "healthy" if self.state == PluginState.STARTED else "unhealthy",
            "state": self.state.value,
            "metadata": self.get_metadata().__dict__
        }
    
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


@dataclass
class PluginInfo:
    """Information about a discovered or loaded plugin"""
    plugin_class: Type[Plugin]
    instance: Optional[Plugin] = None
    metadata: Optional[PluginMetadata] = None
    state: PluginState = PluginState.DISCOVERED
    error: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)


class PluginRegistry:
    """
    Registry for managing plugin information and dependencies
    """
    
    def __init__(self):
        self.plugins: Dict[str, PluginInfo] = {}
        self.service_providers: Dict[str, str] = {}  # service_name -> plugin_name
        self.dependency_graph: Dict[str, Set[str]] = {}  # plugin_name -> dependencies
    
    def register_plugin(self, plugin_class: Type[Plugin]) -> None:
        """Register a plugin class"""
        try:
            # Create temporary instance to get metadata
            temp_instance = plugin_class()
            metadata = temp_instance.get_metadata()
            
            plugin_info = PluginInfo(
                plugin_class=plugin_class,
                metadata=metadata,
                state=PluginState.DISCOVERED
            )
            
            self.plugins[metadata.name] = plugin_info
            
            # Register provided services
            provided_services = temp_instance.get_provided_services()
            for service in provided_services:
                self.service_providers[service] = metadata.name
            
            # Build dependency graph
            self.dependency_graph[metadata.name] = set(metadata.dependencies)
            
            logger.info(f"Registered plugin: {metadata.name} v{metadata.version}")
            
        except Exception as e:
            logger.error(f"Failed to register plugin {plugin_class.__name__}: {e}")
    
    def get_plugin(self, name: str) -> Optional[PluginInfo]:
        """Get plugin information by name"""
        return self.plugins.get(name)
    
    def list_plugins(self) -> List[PluginInfo]:
        """Get list of all registered plugins"""
        return list(self.plugins.values())
    
    def get_load_order(self) -> List[str]:
        """
        Calculate plugin load order based on dependencies
        
        Returns:
            List of plugin names in load order
        """
        # Topological sort of dependency graph
        visited = set()
        temp_visited = set()
        result = []
        
        def visit(plugin_name: str):
            if plugin_name in temp_visited:
                raise ValueError(f"Circular dependency detected involving {plugin_name}")
            
            if plugin_name not in visited:
                temp_visited.add(plugin_name)
                
                # Visit dependencies first
                for dep in self.dependency_graph.get(plugin_name, set()):
                    if dep in self.plugins:
                        visit(dep)
                
                temp_visited.remove(plugin_name)
                visited.add(plugin_name)
                result.append(plugin_name)
        
        # Visit all plugins
        for plugin_name in self.plugins:
            if plugin_name not in visited:
                visit(plugin_name)
        
        return result
    
    def validate_dependencies(self) -> List[str]:
        """
        Validate plugin dependencies
        
        Returns:
            List of validation errors
        """
        errors = []
        
        for plugin_name, plugin_info in self.plugins.items():
            if not plugin_info.metadata:
                continue
            
            # Check if all dependencies are available
            for dep in plugin_info.metadata.dependencies:
                if dep not in self.plugins:
                    errors.append(f"Plugin {plugin_name} depends on missing plugin: {dep}")
            
            # Check if required services are provided
            temp_instance = plugin_info.plugin_class()
            required_services = temp_instance.get_required_services()
            
            for service in required_services:
                if service not in self.service_providers:
                    errors.append(f"Plugin {plugin_name} requires missing service: {service}")
        
        return errors


class PluginManager:
    """
    Plugin manager for discovery, loading, and lifecycle management
    """
    
    def __init__(self, plugin_directories: List[Path] = None):
        self.registry = PluginRegistry()
        self.plugin_directories = plugin_directories or []
        self.running_plugins: Dict[str, Plugin] = {}
    
    async def discover_plugins(self) -> None:
        """Discover plugins in configured directories"""
        for directory in self.plugin_directories:
            if not directory.exists():
                logger.warning(f"Plugin directory does not exist: {directory}")
                continue
            
            await self._discover_in_directory(directory)
    
    async def _discover_in_directory(self, directory: Path) -> None:
        """Discover plugins in a specific directory"""
        try:
            # Add directory to Python path
            if str(directory) not in sys.path:
                sys.path.insert(0, str(directory))
            
            # Look for Python files
            for py_file in directory.glob("**/*.py"):
                if py_file.name.startswith("_"):
                    continue
                
                await self._load_plugin_from_file(py_file)
                
        except Exception as e:
            logger.error(f"Error discovering plugins in {directory}: {e}")
    
    async def _load_plugin_from_file(self, file_path: Path) -> None:
        """Load plugin from a Python file"""
        try:
            # Convert file path to module name
            relative_path = file_path.relative_to(file_path.parent.parent)
            module_name = str(relative_path.with_suffix("")).replace("/", ".")
            
            # Import the module
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if not spec or not spec.loader:
                return
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find Plugin classes in the module
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if (issubclass(obj, Plugin) and 
                    obj != Plugin and 
                    not inspect.isabstract(obj)):
                    
                    self.registry.register_plugin(obj)
                    
        except Exception as e:
            logger.error(f"Error loading plugin from {file_path}: {e}")
    
    async def load_plugin(self, plugin_name: str, config: Dict[str, Any] = None) -> bool:
        """
        Load and initialize a specific plugin
        
        Args:
            plugin_name: Name of the plugin to load
            config: Plugin configuration
            
        Returns:
            True if plugin was loaded successfully
        """
        plugin_info = self.registry.get_plugin(plugin_name)
        if not plugin_info:
            logger.error(f"Plugin not found: {plugin_name}")
            return False
        
        if plugin_info.state in [PluginState.LOADED, PluginState.INITIALIZED, PluginState.STARTED]:
            logger.warning(f"Plugin {plugin_name} is already loaded")
            return True
        
        try:
            # Create plugin instance
            plugin_config = config or plugin_info.config
            plugin_instance = plugin_info.plugin_class(plugin_config)
            
            # Initialize plugin
            await plugin_instance.initialize()
            
            # Update plugin info
            plugin_info.instance = plugin_instance
            plugin_info.state = PluginState.INITIALIZED
            plugin_info.config = plugin_config
            plugin_instance.state = PluginState.INITIALIZED
            
            logger.info(f"Loaded plugin: {plugin_name}")
            return True
            
        except Exception as e:
            plugin_info.state = PluginState.FAILED
            plugin_info.error = str(e)
            logger.error(f"Failed to load plugin {plugin_name}: {e}")
            return False
    
    async def start_plugin(self, plugin_name: str) -> bool:
        """
        Start a loaded plugin
        
        Args:
            plugin_name: Name of the plugin to start
            
        Returns:
            True if plugin was started successfully
        """
        plugin_info = self.registry.get_plugin(plugin_name)
        if not plugin_info or not plugin_info.instance:
            logger.error(f"Plugin not loaded: {plugin_name}")
            return False
        
        if plugin_info.state == PluginState.STARTED:
            logger.warning(f"Plugin {plugin_name} is already started")
            return True
        
        try:
            await plugin_info.instance.start()
            plugin_info.state = PluginState.STARTED
            plugin_info.instance.state = PluginState.STARTED
            self.running_plugins[plugin_name] = plugin_info.instance
            
            logger.info(f"Started plugin: {plugin_name}")
            return True
            
        except Exception as e:
            plugin_info.state = PluginState.FAILED
            plugin_info.error = str(e)
            logger.error(f"Failed to start plugin {plugin_name}: {e}")
            return False
    
    async def stop_plugin(self, plugin_name: str) -> bool:
        """
        Stop a running plugin
        
        Args:
            plugin_name: Name of the plugin to stop
            
        Returns:
            True if plugin was stopped successfully
        """
        plugin_info = self.registry.get_plugin(plugin_name)
        if not plugin_info or not plugin_info.instance:
            logger.error(f"Plugin not loaded: {plugin_name}")
            return False
        
        if plugin_info.state != PluginState.STARTED:
            logger.warning(f"Plugin {plugin_name} is not running")
            return True
        
        try:
            await plugin_info.instance.stop()
            plugin_info.state = PluginState.STOPPED
            plugin_info.instance.state = PluginState.STOPPED
            
            if plugin_name in self.running_plugins:
                del self.running_plugins[plugin_name]
            
            logger.info(f"Stopped plugin: {plugin_name}")
            return True
            
        except Exception as e:
            plugin_info.state = PluginState.FAILED
            plugin_info.error = str(e)
            logger.error(f"Failed to stop plugin {plugin_name}: {e}")
            return False
    
    async def load_all_plugins(self, configs: Dict[str, Dict[str, Any]] = None) -> None:
        """Load all discovered plugins in dependency order"""
        configs = configs or {}
        
        # Validate dependencies first
        errors = self.registry.validate_dependencies()
        if errors:
            logger.error("Plugin dependency validation failed:")
            for error in errors:
                logger.error(f"  - {error}")
            return
        
        # Get load order
        load_order = self.registry.get_load_order()
        
        # Load plugins in order
        for plugin_name in load_order:
            plugin_config = configs.get(plugin_name, {})
            await self.load_plugin(plugin_name, plugin_config)
    
    async def start_all_plugins(self) -> None:
        """Start all loaded plugins"""
        load_order = self.registry.get_load_order()
        
        for plugin_name in load_order:
            plugin_info = self.registry.get_plugin(plugin_name)
            if plugin_info and plugin_info.state == PluginState.INITIALIZED:
                await self.start_plugin(plugin_name)
    
    async def stop_all_plugins(self) -> None:
        """Stop all running plugins"""
        # Stop in reverse order
        load_order = self.registry.get_load_order()
        
        for plugin_name in reversed(load_order):
            if plugin_name in self.running_plugins:
                await self.stop_plugin(plugin_name)
    
    def get_plugin_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all plugins"""
        status = {}
        
        for plugin_name, plugin_info in self.registry.plugins.items():
            status[plugin_name] = {
                "state": plugin_info.state.value,
                "metadata": plugin_info.metadata.__dict__ if plugin_info.metadata else None,
                "error": plugin_info.error,
                "config": plugin_info.config
            }
        
        return status
    
    def get_running_plugin(self, plugin_name: str) -> Optional[Plugin]:
        """Get a running plugin instance"""
        return self.running_plugins.get(plugin_name)


# Global plugin manager instance
_global_plugin_manager: Optional[PluginManager] = None


def get_plugin_manager() -> PluginManager:
    """Get the global plugin manager instance"""
    global _global_plugin_manager
    if _global_plugin_manager is None:
        _global_plugin_manager = PluginManager()
    return _global_plugin_manager


def initialize_plugin_manager(plugin_directories: List[Path] = None) -> PluginManager:
    """Initialize the global plugin manager"""
    global _global_plugin_manager
    _global_plugin_manager = PluginManager(plugin_directories)
    return _global_plugin_manager

