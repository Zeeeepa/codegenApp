"""
Deployment Executor for CI/CD Flow Management

Executes deployment commands in validation environments with real-time monitoring.
"""

import asyncio
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
import logging
import time
from dataclasses import dataclass

from app.core.validation.snapshot_manager import ValidationSnapshot

logger = logging.getLogger(__name__)


@dataclass
class DeploymentResult:
    """Result of a deployment execution"""
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration: float
    command: str
    timestamp: float


class DeploymentExecutor:
    """Executes deployment commands with monitoring and logging"""
    
    def __init__(self):
        self.active_deployments: Dict[str, bool] = {}
    
    async def execute_deployment(
        self,
        snapshot: ValidationSnapshot,
        deployment_commands: List[str],
        progress_callback: Optional[Callable[[str, str], None]] = None
    ) -> List[DeploymentResult]:
        """Execute deployment commands in the snapshot environment"""
        
        deployment_id = f"deploy_{snapshot.snapshot_id}"
        self.active_deployments[deployment_id] = True
        
        snapshot.add_log("Starting deployment execution...")
        results = []
        
        try:
            # Change to code directory
            code_dir = snapshot.workspace_path / "code"
            if not code_dir.exists():
                raise Exception("Code directory not found. Ensure PR code is cloned first.")
            
            # Execute each command
            for i, command in enumerate(deployment_commands):
                if not self.active_deployments.get(deployment_id, False):
                    snapshot.add_log("Deployment cancelled")
                    break
                
                snapshot.add_log(f"Executing command {i+1}/{len(deployment_commands)}: {command}")
                
                if progress_callback:
                    progress_callback("executing", f"Running: {command}")
                
                result = await self._execute_command(
                    command, 
                    code_dir, 
                    snapshot.environment_vars,
                    snapshot
                )
                
                results.append(result)
                
                if not result.success:
                    snapshot.add_log(f"Command failed with exit code {result.exit_code}")
                    snapshot.add_log(f"Error output: {result.stderr}")
                    
                    if progress_callback:
                        progress_callback("failed", f"Command failed: {command}")
                    
                    # Stop execution on first failure
                    break
                else:
                    snapshot.add_log(f"Command completed successfully in {result.duration:.2f}s")
                    
                    if progress_callback:
                        progress_callback("success", f"Completed: {command}")
            
            # Check overall success
            overall_success = all(result.success for result in results)
            
            if overall_success:
                snapshot.add_log("Deployment completed successfully")
                if progress_callback:
                    progress_callback("completed", "Deployment successful")
            else:
                snapshot.add_log("Deployment failed")
                if progress_callback:
                    progress_callback("failed", "Deployment failed")
            
            return results
            
        except Exception as e:
            snapshot.add_log(f"Deployment execution failed: {str(e)}")
            logger.error(f"Deployment execution failed for {deployment_id}: {e}")
            
            if progress_callback:
                progress_callback("error", f"Deployment error: {str(e)}")
            
            raise
        finally:
            # Cleanup
            if deployment_id in self.active_deployments:
                del self.active_deployments[deployment_id]
    
    async def _execute_command(
        self,
        command: str,
        cwd: Path,
        env_vars: Dict[str, str],
        snapshot: ValidationSnapshot
    ) -> DeploymentResult:
        """Execute a single command with monitoring"""
        
        start_time = time.time()
        
        try:
            # Merge environment variables
            env = os.environ.copy()
            env.update(env_vars)
            
            # Create subprocess
            process = await asyncio.create_subprocess_shell(
                command,
                cwd=cwd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Wait for completion with real-time output capture
            stdout_data = []
            stderr_data = []
            
            async def read_stream(stream, data_list, log_prefix):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    
                    line_str = line.decode().strip()
                    data_list.append(line_str)
                    snapshot.add_log(f"{log_prefix}: {line_str}")
            
            # Start reading both streams
            await asyncio.gather(
                read_stream(process.stdout, stdout_data, "STDOUT"),
                read_stream(process.stderr, stderr_data, "STDERR")
            )
            
            # Wait for process completion
            exit_code = await process.wait()
            
            duration = time.time() - start_time
            
            return DeploymentResult(
                success=(exit_code == 0),
                exit_code=exit_code,
                stdout="\n".join(stdout_data),
                stderr="\n".join(stderr_data),
                duration=duration,
                command=command,
                timestamp=start_time
            )
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = str(e)
            
            return DeploymentResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=error_msg,
                duration=duration,
                command=command,
                timestamp=start_time
            )
    
    def cancel_deployment(self, snapshot_id: str):
        """Cancel an active deployment"""
        deployment_id = f"deploy_{snapshot_id}"
        if deployment_id in self.active_deployments:
            self.active_deployments[deployment_id] = False
            logger.info(f"Deployment {deployment_id} cancelled")
    
    def is_deployment_active(self, snapshot_id: str) -> bool:
        """Check if deployment is active for a snapshot"""
        deployment_id = f"deploy_{snapshot_id}"
        return self.active_deployments.get(deployment_id, False)
    
    async def validate_deployment_success(
        self,
        snapshot: ValidationSnapshot,
        deployment_results: List[DeploymentResult]
    ) -> Dict[str, Any]:
        """Validate deployment success and gather context"""
        
        snapshot.add_log("Validating deployment success...")
        
        # Check if all commands succeeded
        all_success = all(result.success for result in deployment_results)
        
        # Gather deployment context
        context = {
            "overall_success": all_success,
            "total_commands": len(deployment_results),
            "successful_commands": sum(1 for r in deployment_results if r.success),
            "failed_commands": sum(1 for r in deployment_results if not r.success),
            "total_duration": sum(r.duration for r in deployment_results),
            "commands": []
        }
        
        # Add command details
        for result in deployment_results:
            context["commands"].append({
                "command": result.command,
                "success": result.success,
                "exit_code": result.exit_code,
                "duration": result.duration,
                "stdout_lines": len(result.stdout.split("\n")) if result.stdout else 0,
                "stderr_lines": len(result.stderr.split("\n")) if result.stderr else 0
            })
        
        # Check for common deployment artifacts
        code_dir = snapshot.workspace_path / "code"
        artifacts = await self._check_deployment_artifacts(code_dir)
        context["artifacts"] = artifacts
        
        # Check for running processes/services
        services = await self._check_running_services(snapshot)
        context["services"] = services
        
        snapshot.add_log(f"Deployment validation completed. Success: {all_success}")
        
        return context
    
    async def _check_deployment_artifacts(self, code_dir: Path) -> Dict[str, bool]:
        """Check for common deployment artifacts"""
        
        artifacts = {}
        
        # Common build artifacts
        artifact_paths = [
            "build/",
            "dist/",
            "public/",
            "node_modules/",
            "package-lock.json",
            "yarn.lock",
            ".next/",
            "__pycache__/",
            "venv/",
            ".env"
        ]
        
        for artifact in artifact_paths:
            artifact_path = code_dir / artifact
            artifacts[artifact] = artifact_path.exists()
        
        return artifacts
    
    async def _check_running_services(self, snapshot: ValidationSnapshot) -> Dict[str, Any]:
        """Check for running services in the deployment"""
        
        services = {
            "processes": [],
            "ports": [],
            "health_checks": []
        }
        
        try:
            # Check for common development server processes
            process_check_commands = [
                "ps aux | grep -E '(npm|node|python|uvicorn|gunicorn)' | grep -v grep",
                "netstat -tlnp 2>/dev/null | grep LISTEN || ss -tlnp | grep LISTEN"
            ]
            
            for cmd in process_check_commands:
                result = await self._execute_command(
                    cmd,
                    snapshot.workspace_path,
                    snapshot.environment_vars,
                    snapshot
                )
                
                if result.success and result.stdout:
                    if "ps aux" in cmd:
                        services["processes"] = result.stdout.split("\n")[:10]  # Limit output
                    elif "netstat" in cmd or "ss" in cmd:
                        services["ports"] = result.stdout.split("\n")[:10]  # Limit output
        
        except Exception as e:
            snapshot.add_log(f"Service check failed: {str(e)}")
        
        return services


# Global deployment executor instance
_deployment_executor = None

def get_deployment_executor() -> DeploymentExecutor:
    """Get the global deployment executor instance"""
    global _deployment_executor
    if _deployment_executor is None:
        _deployment_executor = DeploymentExecutor()
    return _deployment_executor

