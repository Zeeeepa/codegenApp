"""
Grainchain Service Adapter - Real grainchain library integration for sandbox management
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import tempfile
import os
import uuid

# Import actual grainchain library
try:
    from grainchain import Sandbox, SandboxConfig, Providers, create_sandbox
    from grainchain.core.interfaces import ExecutionResult, FileInfo, SandboxStatus as GrainchainStatus
    from grainchain.core.exceptions import GrainchainError, SandboxError, ProviderError
    GRAINCHAIN_AVAILABLE = True
except ImportError:
    # Fallback for when grainchain is not installed
    GRAINCHAIN_AVAILABLE = False
    logging.warning("Grainchain library not available, using mock implementation")

from app.core.orchestration.coordinator import ServiceAdapter
from app.utils.exceptions import ServiceNotFoundError, ActionNotFoundError

logger = logging.getLogger(__name__)


class GrainchainAdapter(ServiceAdapter):
    """Real Grainchain adapter using the actual grainchain library"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.default_provider = config.get("default_provider", Providers.LOCAL if GRAINCHAIN_AVAILABLE else "local")
        self.default_timeout = config.get("default_timeout", 300)
        self.max_concurrent_sandboxes = config.get("max_concurrent_sandboxes", 10)
        self.working_directory = config.get("working_directory", "/tmp")
        
        # Track active sandbox sessions
        self.active_sessions: Dict[str, Any] = {}
        
        # Grainchain configuration
        self.sandbox_config = SandboxConfig(
            timeout=self.default_timeout,
            working_directory=self.working_directory,
            auto_cleanup=True,
            environment_vars=config.get("environment_vars", {})
        ) if GRAINCHAIN_AVAILABLE else None
    
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute grainchain action using real grainchain library"""
        if not GRAINCHAIN_AVAILABLE:
            return await self._execute_mock_action(action, context)
        
        action_map = {
            "create_sandbox": self._create_sandbox,
            "get_sandbox": self._get_sandbox,
            "destroy_sandbox": self._destroy_sandbox,
            "execute_command": self._execute_command,
            "upload_file": self._upload_file,
            "download_file": self._download_file,
            "list_files": self._list_files,
            "list_sandboxes": self._list_sandboxes,
            "create_snapshot": self._create_snapshot,
            "restore_snapshot": self._restore_snapshot,
            "get_sandbox_status": self._get_sandbox_status,
        }
        
        handler = action_map.get(action)
        if not handler:
            raise ActionNotFoundError(f"Unknown action: {action}")
        
        return await handler(context)
    
    async def health_check(self) -> str:
        """Check grainchain service health"""
        try:
            if not GRAINCHAIN_AVAILABLE:
                return "degraded: grainchain library not available"
            
            # Check if we can create a simple sandbox
            if len(self.active_sessions) <= self.max_concurrent_sandboxes:
                return "healthy"
            else:
                return "degraded: max sandboxes reached"
        except Exception as e:
            return f"unhealthy: {str(e)}"
    
    async def cleanup(self):
        """Cleanup all active sessions"""
        for session_id, session_info in list(self.active_sessions.items()):
            try:
                if "session" in session_info:
                    await session_info["session"].close()
                del self.active_sessions[session_id]
            except Exception as e:
                logger.error(f"Error cleaning up session {session_id}: {e}")
    
    # ============================================================================
    # REAL GRAINCHAIN IMPLEMENTATION
    # ============================================================================
    
    async def _create_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sandbox using grainchain"""
        parameters = context.get("parameters", {})
        
        # Extract configuration
        provider = parameters.get("provider", self.default_provider)
        timeout = parameters.get("timeout", self.default_timeout)
        image = parameters.get("image")
        environment_vars = parameters.get("environment_vars", {})
        working_dir = parameters.get("working_directory", self.working_directory)
        
        # Check sandbox limits
        if len(self.active_sessions) >= self.max_concurrent_sandboxes:
            raise Exception(f"Maximum concurrent sandboxes ({self.max_concurrent_sandboxes}) reached")
        
        try:
            # Create sandbox configuration
            config = SandboxConfig(
                timeout=timeout,
                image=image,
                working_directory=working_dir,
                environment_vars=environment_vars,
                auto_cleanup=True
            )
            
            # Create sandbox using grainchain
            sandbox = create_sandbox(provider=provider, **config.__dict__)
            
            # Start the sandbox session
            session = await sandbox.__aenter__()
            
            # Generate session ID
            session_id = f"grainchain-{uuid.uuid4().hex[:8]}"
            
            # Store session info
            session_info = {
                "session": session,
                "sandbox": sandbox,
                "session_id": session_id,
                "provider": provider,
                "config": config,
                "created_at": datetime.utcnow(),
                "status": "running"
            }
            
            self.active_sessions[session_id] = session_info
            
            logger.info(f"🐳 Created grainchain sandbox {session_id} with provider {provider}")
            
            return {
                "sandbox_id": session_id,
                "provider": provider,
                "status": "running",
                "created_at": session_info["created_at"].isoformat(),
                "working_directory": working_dir,
                "environment_vars": environment_vars
            }
            
        except Exception as e:
            logger.error(f"Failed to create grainchain sandbox: {e}")
            raise Exception(f"Sandbox creation failed: {e}")
    
    async def _get_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get sandbox information"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        return {
            "sandbox_id": sandbox_id,
            "provider": session_info["provider"],
            "status": session_info["status"],
            "created_at": session_info["created_at"].isoformat(),
            "working_directory": session_info["config"].working_directory
        }
    
    async def _destroy_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Destroy a sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            # Close the grainchain session
            await session_info["session"].close()
            
            # Remove from active sessions
            del self.active_sessions[sandbox_id]
            
            logger.info(f"🗑️ Destroyed grainchain sandbox {sandbox_id}")
            
            return {
                "sandbox_id": sandbox_id,
                "destroyed": True,
                "destroyed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to destroy sandbox {sandbox_id}: {e}")
            raise Exception(f"Failed to destroy sandbox: {e}")
    
    async def _execute_command(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a command in the sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        command = parameters.get("command")
        timeout = parameters.get("timeout")
        working_dir = parameters.get("working_dir")
        environment = parameters.get("environment")
        
        if not sandbox_id or not command:
            raise Exception("sandbox_id and command parameters required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # Execute command using grainchain
            result: ExecutionResult = await session.execute(
                command=command,
                timeout=timeout,
                working_dir=working_dir,
                environment=environment
            )
            
            return {
                "sandbox_id": sandbox_id,
                "command": command,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.return_code,
                "success": result.success,
                "execution_time": result.execution_time,
                "timestamp": result.timestamp
            }
            
        except Exception as e:
            logger.error(f"Command execution failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"Command execution failed: {e}")
    
    async def _upload_file(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Upload a file to the sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        path = parameters.get("path")
        content = parameters.get("content")
        mode = parameters.get("mode", "w")
        
        if not sandbox_id or not path or content is None:
            raise Exception("sandbox_id, path, and content parameters required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # Upload file using grainchain
            await session.upload_file(path=path, content=content, mode=mode)
            
            return {
                "sandbox_id": sandbox_id,
                "path": path,
                "uploaded": True,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"File upload failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"File upload failed: {e}")
    
    async def _download_file(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Download a file from the sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        path = parameters.get("path")
        
        if not sandbox_id or not path:
            raise Exception("sandbox_id and path parameters required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # Download file using grainchain
            content = await session.download_file(path=path)
            
            return {
                "sandbox_id": sandbox_id,
                "path": path,
                "content": content.decode('utf-8') if isinstance(content, bytes) else content,
                "downloaded_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"File download failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"File download failed: {e}")
    
    async def _list_files(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """List files in the sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        path = parameters.get("path", "/")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # List files using grainchain
            files: List[FileInfo] = await session.list_files(path=path)
            
            file_list = []
            for file_info in files:
                file_list.append({
                    "path": file_info.path,
                    "name": file_info.name,
                    "size": file_info.size,
                    "is_directory": file_info.is_directory,
                    "modified_time": file_info.modified_time,
                    "permissions": file_info.permissions
                })
            
            return {
                "sandbox_id": sandbox_id,
                "path": path,
                "files": file_list,
                "total": len(file_list)
            }
            
        except Exception as e:
            logger.error(f"File listing failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"File listing failed: {e}")
    
    async def _list_sandboxes(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """List all active sandboxes"""
        sandboxes = []
        
        for sandbox_id, session_info in self.active_sessions.items():
            sandboxes.append({
                "sandbox_id": sandbox_id,
                "provider": session_info["provider"],
                "status": session_info["status"],
                "created_at": session_info["created_at"].isoformat()
            })
        
        return {
            "sandboxes": sandboxes,
            "total": len(sandboxes)
        }
    
    async def _create_snapshot(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a snapshot of the sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # Create snapshot using grainchain
            snapshot_id = await session.create_snapshot()
            
            return {
                "sandbox_id": sandbox_id,
                "snapshot_id": snapshot_id,
                "created_at": datetime.utcnow().isoformat()
            }
            
        except NotImplementedError:
            raise Exception("Snapshot creation not supported by this provider")
        except Exception as e:
            logger.error(f"Snapshot creation failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"Snapshot creation failed: {e}")
    
    async def _restore_snapshot(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Restore a sandbox from snapshot"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        snapshot_id = parameters.get("snapshot_id")
        
        if not sandbox_id or not snapshot_id:
            raise Exception("sandbox_id and snapshot_id parameters required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            
            # Restore snapshot using grainchain
            await session.restore_snapshot(snapshot_id)
            
            return {
                "sandbox_id": sandbox_id,
                "snapshot_id": snapshot_id,
                "restored_at": datetime.utcnow().isoformat()
            }
            
        except NotImplementedError:
            raise Exception("Snapshot restoration not supported by this provider")
        except Exception as e:
            logger.error(f"Snapshot restoration failed in sandbox {sandbox_id}: {e}")
            raise Exception(f"Snapshot restoration failed: {e}")
    
    async def _get_sandbox_status(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get sandbox status"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        session_info = self.active_sessions.get(sandbox_id)
        if not session_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        try:
            session = session_info["session"]
            status = session.status
            
            return {
                "sandbox_id": sandbox_id,
                "status": status.value if hasattr(status, 'value') else str(status),
                "provider": session_info["provider"],
                "created_at": session_info["created_at"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Status check failed for sandbox {sandbox_id}: {e}")
            raise Exception(f"Status check failed: {e}")
    
    # ============================================================================
    # MOCK IMPLEMENTATION (when grainchain is not available)
    # ============================================================================
    
    async def _execute_mock_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Mock implementation when grainchain is not available"""
        logger.warning(f"Using mock implementation for action: {action}")
        
        if action == "create_sandbox":
            sandbox_id = f"mock-{uuid.uuid4().hex[:8]}"
            return {
                "sandbox_id": sandbox_id,
                "provider": "mock",
                "status": "running",
                "created_at": datetime.utcnow().isoformat()
            }
        
        elif action == "execute_command":
            return {
                "sandbox_id": context.get("parameters", {}).get("sandbox_id", "mock"),
                "command": context.get("parameters", {}).get("command", ""),
                "stdout": "Mock command output",
                "stderr": "",
                "return_code": 0,
                "success": True,
                "execution_time": 0.1
            }
        
        else:
            return {"status": "mock", "message": f"Mock response for {action}"}
