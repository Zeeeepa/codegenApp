"""
Grainchain Service Adapter - Sandbox management and deployment testing
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import httpx

from app.models.api.api_models import (
    SandboxRequest, SandboxResponse, SandboxStatus,
    DeploymentImageRequest, DeploymentImageResponse
)
from app.core.orchestration.coordinator import ServiceAdapter
from app.utils.exceptions import ServiceNotFoundError, ActionNotFoundError

logger = logging.getLogger(__name__)


class GrainchainAdapter(ServiceAdapter):
    """Adapter for Grainchain sandbox and deployment services"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.docker_host = config.get("docker_host", "unix://var/run/docker.sock")
        self.registry_url = config.get("registry_url")
        self.default_timeout = config.get("default_timeout", 300)
        self.max_concurrent_sandboxes = config.get("max_concurrent_sandboxes", 10)
        
        # In-memory tracking of active sandboxes
        self.active_sandboxes: Dict[str, Dict[str, Any]] = {}
        
        # HTTP client for API calls (if grainchain has an API)
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(30.0))
    
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute grainchain action"""
        action_map = {
            "create_sandbox": self._create_sandbox,
            "get_sandbox": self._get_sandbox,
            "destroy_sandbox": self._destroy_sandbox,
            "create_deployment_image": self._create_deployment_image,
            "deploy_image": self._deploy_image,
            "test_deployment": self._test_deployment,
            "list_sandboxes": self._list_sandboxes,
            "get_sandbox_logs": self._get_sandbox_logs,
        }
        
        handler = action_map.get(action)
        if not handler:
            raise ActionNotFoundError(f"Unknown action: {action}")
        
        return await handler(context)
    
    async def health_check(self) -> str:
        """Check grainchain service health"""
        try:
            # Check Docker daemon connectivity
            # This is a simplified check - in reality you'd ping Docker API
            if len(self.active_sandboxes) <= self.max_concurrent_sandboxes:
                return "healthy"
            else:
                return "degraded: max sandboxes reached"
        except Exception as e:
            return f"unhealthy: {str(e)}"
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()
    
    # ============================================================================
    # SANDBOX MANAGEMENT ACTIONS
    # ============================================================================
    
    async def _create_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new sandbox"""
        parameters = context.get("parameters", {})
        
        # Extract sandbox configuration
        name = parameters.get("name", f"sandbox-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}")
        image = parameters.get("image", "ubuntu:latest")
        environment = parameters.get("environment", {})
        ports = parameters.get("ports", [])
        timeout = parameters.get("timeout", self.default_timeout)
        resources = parameters.get("resources", {})
        
        # Check sandbox limits
        if len(self.active_sandboxes) >= self.max_concurrent_sandboxes:
            raise Exception(f"Maximum concurrent sandboxes ({self.max_concurrent_sandboxes}) reached")
        
        # Generate sandbox ID
        sandbox_id = f"sandbox-{len(self.active_sandboxes) + 1}-{datetime.utcnow().strftime('%H%M%S')}"
        
        # Simulate sandbox creation (in real implementation, this would use Docker API)
        sandbox_info = {
            "id": sandbox_id,
            "name": name,
            "image": image,
            "status": SandboxStatus.CREATING,
            "created_at": datetime.utcnow(),
            "environment": environment,
            "ports": ports,
            "timeout": timeout,
            "resources": resources,
            "endpoints": {}
        }
        
        # Store sandbox info
        self.active_sandboxes[sandbox_id] = sandbox_info
        
        # Simulate async creation process
        asyncio.create_task(self._simulate_sandbox_startup(sandbox_id))
        
        logger.info(f"🐳 Created sandbox {sandbox_id} with image {image}")
        
        return {
            "sandbox_id": sandbox_id,
            "name": name,
            "status": SandboxStatus.CREATING.value,
            "image": image,
            "created_at": sandbox_info["created_at"].isoformat(),
            "endpoints": {}
        }
    
    async def _get_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get sandbox information"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        sandbox_info = self.active_sandboxes.get(sandbox_id)
        if not sandbox_info:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        return {
            "sandbox_id": sandbox_id,
            "name": sandbox_info["name"],
            "status": sandbox_info["status"].value,
            "image": sandbox_info["image"],
            "created_at": sandbox_info["created_at"].isoformat(),
            "endpoints": sandbox_info["endpoints"]
        }
    
    async def _destroy_sandbox(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Destroy a sandbox"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        if sandbox_id not in self.active_sandboxes:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        # Remove from active sandboxes
        sandbox_info = self.active_sandboxes.pop(sandbox_id)
        
        logger.info(f"🗑️ Destroyed sandbox {sandbox_id}")
        
        return {
            "sandbox_id": sandbox_id,
            "destroyed": True,
            "destroyed_at": datetime.utcnow().isoformat()
        }
    
    async def _list_sandboxes(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """List all active sandboxes"""
        sandboxes = []
        
        for sandbox_id, info in self.active_sandboxes.items():
            sandboxes.append({
                "sandbox_id": sandbox_id,
                "name": info["name"],
                "status": info["status"].value,
                "image": info["image"],
                "created_at": info["created_at"].isoformat()
            })
        
        return {
            "sandboxes": sandboxes,
            "total": len(sandboxes)
        }
    
    async def _get_sandbox_logs(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get sandbox logs"""
        parameters = context.get("parameters", {})
        sandbox_id = parameters.get("sandbox_id")
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        if sandbox_id not in self.active_sandboxes:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        # Simulate log retrieval
        logs = [
            f"[{datetime.utcnow().isoformat()}] Sandbox {sandbox_id} started",
            f"[{datetime.utcnow().isoformat()}] Container running on image {self.active_sandboxes[sandbox_id]['image']}",
            f"[{datetime.utcnow().isoformat()}] Ready to accept connections"
        ]
        
        return {
            "sandbox_id": sandbox_id,
            "logs": logs
        }
    
    # ============================================================================
    # DEPLOYMENT IMAGE ACTIONS
    # ============================================================================
    
    async def _create_deployment_image(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a deployment image"""
        parameters = context.get("parameters", {})
        
        name = parameters.get("name", f"deployment-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}")
        source_code = parameters.get("source_code", "")
        build_config = parameters.get("build_config", {})
        environment = parameters.get("environment", {})
        
        # Generate image ID and tag
        image_id = f"img-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        tag = f"{name}:latest"
        
        # Simulate image building process
        logger.info(f"🔨 Building deployment image {name}")
        
        # In real implementation, this would:
        # 1. Create temporary build context
        # 2. Generate Dockerfile from source code and build config
        # 3. Build Docker image
        # 4. Push to registry if configured
        
        return {
            "image_id": image_id,
            "name": name,
            "tag": tag,
            "status": "building",
            "created_at": datetime.utcnow().isoformat(),
            "size": None,
            "registry_url": self.registry_url
        }
    
    async def _deploy_image(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Deploy an image to a sandbox"""
        parameters = context.get("parameters", {})
        
        image_id = parameters.get("image_id")
        sandbox_id = parameters.get("sandbox_id")
        
        if not image_id or not sandbox_id:
            raise Exception("image_id and sandbox_id parameters required")
        
        if sandbox_id not in self.active_sandboxes:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        # Simulate deployment
        logger.info(f"🚀 Deploying image {image_id} to sandbox {sandbox_id}")
        
        # Update sandbox with deployment info
        sandbox_info = self.active_sandboxes[sandbox_id]
        sandbox_info["deployed_image"] = image_id
        sandbox_info["deployment_time"] = datetime.utcnow()
        
        return {
            "sandbox_id": sandbox_id,
            "image_id": image_id,
            "deployed": True,
            "deployment_time": sandbox_info["deployment_time"].isoformat()
        }
    
    async def _test_deployment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Test a deployment in a sandbox"""
        parameters = context.get("parameters", {})
        
        sandbox_id = parameters.get("sandbox_id")
        test_config = parameters.get("test_config", {})
        
        if not sandbox_id:
            raise Exception("sandbox_id parameter required")
        
        if sandbox_id not in self.active_sandboxes:
            raise Exception(f"Sandbox {sandbox_id} not found")
        
        # Simulate testing
        logger.info(f"🧪 Testing deployment in sandbox {sandbox_id}")
        
        # Mock test results
        test_results = {
            "health_check": {"status": "passed", "response_time": 0.1},
            "api_tests": {"status": "passed", "tests_run": 5, "failures": 0},
            "performance": {"status": "passed", "avg_response_time": 0.05},
            "security": {"status": "passed", "vulnerabilities": 0}
        }
        
        # Determine overall success
        all_passed = all(result["status"] == "passed" for result in test_results.values())
        
        return {
            "sandbox_id": sandbox_id,
            "test_results": test_results,
            "success": all_passed,
            "tested_at": datetime.utcnow().isoformat()
        }
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    async def _simulate_sandbox_startup(self, sandbox_id: str):
        """Simulate sandbox startup process"""
        try:
            # Wait a bit to simulate startup time
            await asyncio.sleep(2)
            
            if sandbox_id in self.active_sandboxes:
                sandbox_info = self.active_sandboxes[sandbox_id]
                sandbox_info["status"] = SandboxStatus.RUNNING
                
                # Add mock endpoints
                sandbox_info["endpoints"] = {
                    "http": f"http://localhost:808{len(self.active_sandboxes)}",
                    "ssh": f"ssh://localhost:222{len(self.active_sandboxes)}"
                }
                
                logger.info(f"✅ Sandbox {sandbox_id} is now running")
        
        except Exception as e:
            logger.error(f"❌ Failed to start sandbox {sandbox_id}: {e}")
            if sandbox_id in self.active_sandboxes:
                self.active_sandboxes[sandbox_id]["status"] = SandboxStatus.FAILED
