"""
Snapshot Manager for Validation Environments

Creates isolated validation environments with pre-deployed tools for PR validation.
"""

import asyncio
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import subprocess
import json

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class ValidationSnapshot:
    """Represents a validation environment snapshot"""
    
    def __init__(self, snapshot_id: str, project_name: str, pr_number: int):
        self.snapshot_id = snapshot_id
        self.project_name = project_name
        self.pr_number = pr_number
        self.workspace_path: Optional[Path] = None
        self.status = "initializing"
        self.created_at = None
        self.logs: List[str] = []
        self.environment_vars: Dict[str, str] = {}
        
    def add_log(self, message: str):
        """Add log message to snapshot"""
        self.logs.append(f"[{self.snapshot_id}] {message}")
        logger.info(f"Snapshot {self.snapshot_id}: {message}")


class SnapshotManager:
    """Manages validation environment snapshots"""
    
    def __init__(self):
        self.settings = get_settings()
        self.active_snapshots: Dict[str, ValidationSnapshot] = {}
        self.base_temp_dir = Path(tempfile.gettempdir()) / "codegenapp_snapshots"
        self.base_temp_dir.mkdir(exist_ok=True)
        
    async def create_snapshot(
        self, 
        project_name: str, 
        pr_number: int,
        deployment_commands: List[str] = None
    ) -> ValidationSnapshot:
        """Create a new validation snapshot"""
        
        snapshot_id = f"snap_{uuid.uuid4().hex[:8]}"
        snapshot = ValidationSnapshot(snapshot_id, project_name, pr_number)
        
        try:
            snapshot.add_log("Creating validation snapshot...")
            
            # Create workspace directory
            workspace_path = self.base_temp_dir / snapshot_id
            workspace_path.mkdir(exist_ok=True)
            snapshot.workspace_path = workspace_path
            
            # Set up environment variables
            await self._setup_environment_variables(snapshot)
            
            # Pre-deploy Graph-Sitter
            await self._setup_graph_sitter(snapshot)
            
            # Pre-deploy Web-Eval-Agent
            await self._setup_web_eval_agent(snapshot)
            
            # Store deployment commands
            if deployment_commands:
                snapshot.deployment_commands = deployment_commands
            else:
                snapshot.deployment_commands = self._get_default_deployment_commands()
            
            snapshot.status = "ready"
            snapshot.add_log("Snapshot created successfully")
            
            self.active_snapshots[snapshot_id] = snapshot
            return snapshot
            
        except Exception as e:
            snapshot.status = "failed"
            snapshot.add_log(f"Failed to create snapshot: {str(e)}")
            logger.error(f"Failed to create snapshot {snapshot_id}: {e}")
            raise
    
    async def _setup_environment_variables(self, snapshot: ValidationSnapshot):
        """Set up environment variables for the snapshot"""
        
        snapshot.add_log("Setting up environment variables...")
        
        # Core environment variables
        snapshot.environment_vars.update({
            "CODEGEN_ORG_ID": self.settings.codegen_org_id,
            "CODEGEN_API_TOKEN": self.settings.codegen_api_token,
            "GITHUB_TOKEN": getattr(self.settings, 'github_token', ''),
            "GEMINI_API_KEY": getattr(self.settings, 'gemini_api_key', ''),
            "CLOUDFLARE_API_KEY": getattr(self.settings, 'cloudflare_api_key', ''),
            "CLOUDFLARE_ACCOUNT_ID": getattr(self.settings, 'cloudflare_account_id', ''),
            "CLOUDFLARE_WORKER_URL": getattr(self.settings, 'cloudflare_worker_url', ''),
            
            # Web-Eval-Agent configuration
            "WEB_EVAL_MCP_PATH": "web-eval-agent",
            "WEB_EVAL_TIMEOUT": "300000",
            "WEB_EVAL_MAX_CONCURRENT": "3",
            
            # Graph-Sitter configuration
            "GRAPH_SITTER_CACHE_SIZE": "1000",
            "GRAPH_SITTER_MAX_FILE_SIZE": "1048576",
            "GRAPH_SITTER_SUPPORTED_LANGUAGES": "python,javascript,typescript,go,rust",
            
            # Grainchain configuration
            "GRAINCHAIN_API_URL": "http://localhost:8080",
            "GRAINCHAIN_TIMEOUT": "60000",
            "GRAINCHAIN_MAX_MEMORY": "512MB",
            
            # Snapshot-specific variables
            "SNAPSHOT_ID": snapshot.snapshot_id,
            "PROJECT_NAME": snapshot.project_name,
            "PR_NUMBER": str(snapshot.pr_number),
            "WORKSPACE_PATH": str(snapshot.workspace_path)
        })
        
        # Write environment file
        env_file = snapshot.workspace_path / ".env"
        with open(env_file, "w") as f:
            for key, value in snapshot.environment_vars.items():
                f.write(f"{key}={value}\n")
        
        snapshot.add_log("Environment variables configured")
    
    async def _setup_graph_sitter(self, snapshot: ValidationSnapshot):
        """Set up Graph-Sitter in the snapshot environment"""
        
        snapshot.add_log("Setting up Graph-Sitter...")
        
        try:
            # Create graph-sitter directory
            graph_sitter_dir = snapshot.workspace_path / "graph-sitter"
            graph_sitter_dir.mkdir(exist_ok=True)
            
            # Install tree-sitter and language parsers
            install_commands = [
                "pip install tree-sitter",
                "pip install tree-sitter-python",
                "pip install tree-sitter-javascript", 
                "pip install tree-sitter-typescript",
                "pip install tree-sitter-go",
                "pip install tree-sitter-rust"
            ]
            
            for cmd in install_commands:
                result = await self._run_command(cmd, snapshot.workspace_path, snapshot.environment_vars)
                if result.returncode != 0:
                    snapshot.add_log(f"Warning: Failed to install {cmd}: {result.stderr}")
            
            # Create graph-sitter configuration
            config = {
                "languages": ["python", "javascript", "typescript", "go", "rust"],
                "cache_size": 1000,
                "max_file_size": 1048576
            }
            
            config_file = graph_sitter_dir / "config.json"
            with open(config_file, "w") as f:
                json.dump(config, f, indent=2)
            
            snapshot.add_log("Graph-Sitter setup completed")
            
        except Exception as e:
            snapshot.add_log(f"Graph-Sitter setup failed: {str(e)}")
            raise
    
    async def _setup_web_eval_agent(self, snapshot: ValidationSnapshot):
        """Set up Web-Eval-Agent in the snapshot environment"""
        
        snapshot.add_log("Setting up Web-Eval-Agent...")
        
        try:
            # Create web-eval-agent directory
            web_eval_dir = snapshot.workspace_path / "web-eval-agent"
            web_eval_dir.mkdir(exist_ok=True)
            
            # Install required packages
            install_commands = [
                "pip install playwright",
                "pip install python-dotenv",
                "pip install google-generativeai",
                "playwright install chromium"
            ]
            
            for cmd in install_commands:
                result = await self._run_command(cmd, snapshot.workspace_path, snapshot.environment_vars)
                if result.returncode != 0:
                    snapshot.add_log(f"Warning: Failed to install {cmd}: {result.stderr}")
            
            # Create web-eval-agent configuration
            config = {
                "timeout": 300000,
                "max_concurrent": 3,
                "browser": "chromium",
                "headless": True,
                "gemini_model": "gemini-pro"
            }
            
            config_file = web_eval_dir / "config.json"
            with open(config_file, "w") as f:
                json.dump(config, f, indent=2)
            
            snapshot.add_log("Web-Eval-Agent setup completed")
            
        except Exception as e:
            snapshot.add_log(f"Web-Eval-Agent setup failed: {str(e)}")
            raise
    
    def _get_default_deployment_commands(self) -> List[str]:
        """Get default deployment commands"""
        return [
            "npm install",
            "npm run build",
            "npm run test",
            "npm start"
        ]
    
    async def _run_command(
        self, 
        command: str, 
        cwd: Path, 
        env_vars: Dict[str, str]
    ) -> subprocess.CompletedProcess:
        """Run a command in the snapshot environment"""
        
        # Merge environment variables
        env = os.environ.copy()
        env.update(env_vars)
        
        # Run command
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        return subprocess.CompletedProcess(
            args=command,
            returncode=process.returncode,
            stdout=stdout.decode() if stdout else "",
            stderr=stderr.decode() if stderr else ""
        )
    
    async def clone_pr_code(self, snapshot: ValidationSnapshot, repo_url: str, pr_branch: str) -> bool:
        """Clone PR code into the snapshot environment"""
        
        snapshot.add_log(f"Cloning PR code from {repo_url}, branch: {pr_branch}")
        
        try:
            # Create code directory
            code_dir = snapshot.workspace_path / "code"
            
            # Clone repository
            clone_cmd = f"git clone -b {pr_branch} {repo_url} {code_dir}"
            result = await self._run_command(clone_cmd, snapshot.workspace_path, snapshot.environment_vars)
            
            if result.returncode != 0:
                snapshot.add_log(f"Failed to clone repository: {result.stderr}")
                return False
            
            snapshot.add_log("PR code cloned successfully")
            return True
            
        except Exception as e:
            snapshot.add_log(f"Failed to clone PR code: {str(e)}")
            return False
    
    async def cleanup_snapshot(self, snapshot_id: str):
        """Clean up a validation snapshot"""
        
        if snapshot_id in self.active_snapshots:
            snapshot = self.active_snapshots[snapshot_id]
            snapshot.add_log("Cleaning up snapshot...")
            
            try:
                if snapshot.workspace_path and snapshot.workspace_path.exists():
                    shutil.rmtree(snapshot.workspace_path)
                
                del self.active_snapshots[snapshot_id]
                snapshot.add_log("Snapshot cleaned up successfully")
                
            except Exception as e:
                snapshot.add_log(f"Failed to cleanup snapshot: {str(e)}")
                logger.error(f"Failed to cleanup snapshot {snapshot_id}: {e}")
    
    def get_snapshot(self, snapshot_id: str) -> Optional[ValidationSnapshot]:
        """Get a validation snapshot by ID"""
        return self.active_snapshots.get(snapshot_id)
    
    def list_active_snapshots(self) -> List[ValidationSnapshot]:
        """List all active snapshots"""
        return list(self.active_snapshots.values())


# Global snapshot manager instance
_snapshot_manager = None

def get_snapshot_manager() -> SnapshotManager:
    """Get the global snapshot manager instance"""
    global _snapshot_manager
    if _snapshot_manager is None:
        _snapshot_manager = SnapshotManager()
    return _snapshot_manager

