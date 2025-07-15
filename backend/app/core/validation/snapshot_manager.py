"""
CodegenApp Snapshot Manager
Validation environment management with SWE-bench integration patterns
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import tempfile
import shutil

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.models.validation import SnapshotInfo
from app.utils.exceptions import SnapshotException
from app.services.git_service import GitService

logger = get_logger(__name__)
settings = get_settings()


class ValidationSnapshot:
    """
    Individual validation snapshot
    
    Represents an isolated environment for validation with pre-installed tools
    and dependencies. Based on SWE-bench sandbox patterns.
    """
    
    def __init__(
        self,
        snapshot_id: str,
        project_name: str,
        workspace_path: str,
        tools_installed: List[str],
        created_at: datetime
    ):
        self.snapshot_id = snapshot_id
        self.project_name = project_name
        self.workspace_path = workspace_path
        self.tools_installed = tools_installed
        self.created_at = created_at
        self.last_used = created_at
        self.status = "active"
        self.metadata: Dict[str, Any] = {}
    
    def to_info(self) -> SnapshotInfo:
        """Convert to SnapshotInfo model"""
        workspace_size = self._calculate_size()
        
        return SnapshotInfo(
            snapshot_id=self.snapshot_id,
            project_name=self.project_name,
            created_at=self.created_at,
            last_used=self.last_used,
            size_mb=workspace_size,
            status=self.status,
            tools_installed=self.tools_installed,
            metadata=self.metadata
        )
    
    def _calculate_size(self) -> float:
        """Calculate workspace size in MB"""
        try:
            total_size = 0
            for dirpath, dirnames, filenames in Path(self.workspace_path).walk():
                for filename in filenames:
                    filepath = dirpath / filename
                    if filepath.exists():
                        total_size += filepath.stat().st_size
            return total_size / (1024 * 1024)  # Convert to MB
        except Exception:
            return 0.0


class SnapshotManager:
    """
    Validation snapshot management
    
    Manages creation, caching, and cleanup of validation environments.
    Integrates SWE-bench patterns for robust sandbox management.
    """
    
    def __init__(self):
        self.snapshots: Dict[str, ValidationSnapshot] = {}
        self.git_service = GitService()
        self.base_workspace_dir = Path(tempfile.gettempdir()) / "codegenapp_snapshots"
        self.base_workspace_dir.mkdir(exist_ok=True)
        
        logger.info("SnapshotManager initialized", workspace_dir=str(self.base_workspace_dir))
    
    async def create_snapshot(
        self,
        project_name: str,
        tools_required: List[str],
        environment_variables: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Create a new validation snapshot
        
        Creates an isolated environment with required tools and dependencies.
        Based on SWE-bench environment setup patterns.
        """
        snapshot_id = str(uuid.uuid4())
        workspace_path = self.base_workspace_dir / snapshot_id
        
        try:
            logger.info(
                "Creating validation snapshot",
                snapshot_id=snapshot_id,
                project=project_name,
                tools=tools_required
            )
            
            # Create workspace directory
            workspace_path.mkdir(parents=True, exist_ok=True)
            
            # Install required tools
            await self._install_tools(workspace_path, tools_required)
            
            # Setup environment variables
            if environment_variables:
                await self._setup_environment(workspace_path, environment_variables)
            
            # Create snapshot instance
            snapshot = ValidationSnapshot(
                snapshot_id=snapshot_id,
                project_name=project_name,
                workspace_path=str(workspace_path),
                tools_installed=tools_required,
                created_at=datetime.utcnow()
            )
            
            # Store snapshot
            self.snapshots[snapshot_id] = snapshot
            
            logger.info("Validation snapshot created successfully", snapshot_id=snapshot_id)
            return snapshot_id
            
        except Exception as e:
            # Cleanup on failure
            if workspace_path.exists():
                shutil.rmtree(workspace_path, ignore_errors=True)
            
            logger.error("Failed to create validation snapshot", error=str(e))
            raise SnapshotException(f"Failed to create snapshot: {str(e)}")
    
    async def clone_pr_to_snapshot(
        self,
        snapshot_id: str,
        pr_url: str,
        base_branch: str = "main"
    ) -> str:
        """
        Clone PR codebase into validation snapshot
        
        Clones the PR branch and applies changes for validation.
        Uses SWE-bench git handling patterns.
        """
        if snapshot_id not in self.snapshots:
            raise SnapshotException(f"Snapshot {snapshot_id} not found")
        
        snapshot = self.snapshots[snapshot_id]
        repo_path = Path(snapshot.workspace_path) / "repo"
        
        try:
            logger.info(
                "Cloning PR to snapshot",
                snapshot_id=snapshot_id,
                pr_url=pr_url,
                base_branch=base_branch
            )
            
            # Extract repository info from PR URL
            repo_info = self._parse_pr_url(pr_url)
            
            # Clone repository
            await self.git_service.clone_repository(
                repo_url=repo_info["repo_url"],
                target_path=str(repo_path),
                branch=base_branch
            )
            
            # Fetch PR branch
            await self.git_service.fetch_pr_branch(
                repo_path=str(repo_path),
                pr_number=repo_info["pr_number"]
            )
            
            # Apply PR changes
            await self.git_service.checkout_pr_branch(
                repo_path=str(repo_path),
                pr_number=repo_info["pr_number"]
            )
            
            # Update snapshot metadata
            snapshot.last_used = datetime.utcnow()
            snapshot.metadata.update({
                "pr_url": pr_url,
                "pr_number": repo_info["pr_number"],
                "base_branch": base_branch,
                "repo_path": str(repo_path)
            })
            
            logger.info("PR cloned to snapshot successfully", snapshot_id=snapshot_id)
            return str(repo_path)
            
        except Exception as e:
            logger.error("Failed to clone PR to snapshot", error=str(e))
            raise SnapshotException(f"Failed to clone PR: {str(e)}")
    
    async def get_snapshot(self, snapshot_id: str) -> Optional[ValidationSnapshot]:
        """Get snapshot by ID"""
        return self.snapshots.get(snapshot_id)
    
    async def list_snapshots(self) -> List[ValidationSnapshot]:
        """List all active snapshots"""
        return list(self.snapshots.values())
    
    async def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a validation snapshot"""
        if snapshot_id not in self.snapshots:
            return False
        
        snapshot = self.snapshots[snapshot_id]
        
        try:
            # Remove workspace directory
            workspace_path = Path(snapshot.workspace_path)
            if workspace_path.exists():
                shutil.rmtree(workspace_path, ignore_errors=True)
            
            # Remove from memory
            del self.snapshots[snapshot_id]
            
            logger.info("Snapshot deleted successfully", snapshot_id=snapshot_id)
            return True
            
        except Exception as e:
            logger.error("Failed to delete snapshot", snapshot_id=snapshot_id, error=str(e))
            return False
    
    async def cleanup_snapshot(self, snapshot_id: str):
        """Clean up snapshot resources after validation"""
        if snapshot_id not in self.snapshots:
            return
        
        snapshot = self.snapshots[snapshot_id]
        
        try:
            # Clean up temporary files
            temp_dirs = ["tmp", "cache", "logs", ".git/objects/tmp*"]
            workspace_path = Path(snapshot.workspace_path)
            
            for temp_pattern in temp_dirs:
                for temp_path in workspace_path.glob(temp_pattern):
                    if temp_path.exists():
                        if temp_path.is_dir():
                            shutil.rmtree(temp_path, ignore_errors=True)
                        else:
                            temp_path.unlink(missing_ok=True)
            
            # Update status
            snapshot.status = "cleaned"
            
            logger.info("Snapshot cleaned up", snapshot_id=snapshot_id)
            
        except Exception as e:
            logger.error("Failed to cleanup snapshot", snapshot_id=snapshot_id, error=str(e))
    
    async def cleanup_expired_snapshots(self):
        """Clean up expired snapshots based on TTL"""
        ttl_seconds = settings.validation.snapshot_ttl
        cutoff_time = datetime.utcnow() - timedelta(seconds=ttl_seconds)
        
        expired_snapshots = [
            snapshot_id for snapshot_id, snapshot in self.snapshots.items()
            if snapshot.last_used < cutoff_time
        ]
        
        for snapshot_id in expired_snapshots:
            await self.delete_snapshot(snapshot_id)
        
        if expired_snapshots:
            logger.info("Cleaned up expired snapshots", count=len(expired_snapshots))
    
    # Private helper methods
    
    async def _install_tools(self, workspace_path: Path, tools: List[str]):
        """
        Install required tools in the snapshot environment
        
        Based on SWE-bench tool installation patterns
        """
        install_script_path = workspace_path / "install_tools.sh"
        
        # Generate installation script
        install_commands = []
        
        for tool in tools:
            if tool == "git":
                install_commands.append("apt-get update && apt-get install -y git")
            elif tool == "docker":
                install_commands.append("curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh")
            elif tool == "node":
                install_commands.append("curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs")
            elif tool == "python":
                install_commands.append("apt-get install -y python3 python3-pip python3-venv")
            elif tool == "rust":
                install_commands.append("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y")
            elif tool == "go":
                install_commands.append("wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz && tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz")
        
        # Write installation script
        script_content = "#!/bin/bash\nset -e\n\n" + "\n".join(install_commands)
        install_script_path.write_text(script_content)
        install_script_path.chmod(0o755)
        
        # Execute installation (in real implementation, this would run in container)
        logger.info("Tools installation script prepared", tools=tools)
    
    async def _setup_environment(self, workspace_path: Path, env_vars: Dict[str, str]):
        """Setup environment variables in snapshot"""
        env_file_path = workspace_path / ".env"
        
        env_content = "\n".join([f"{key}={value}" for key, value in env_vars.items()])
        env_file_path.write_text(env_content)
        
        logger.info("Environment variables configured", count=len(env_vars))
    
    def _parse_pr_url(self, pr_url: str) -> Dict[str, Any]:
        """
        Parse GitHub PR URL to extract repository and PR information
        
        Example: https://github.com/owner/repo/pull/123
        """
        try:
            parts = pr_url.rstrip('/').split('/')
            if len(parts) < 6 or parts[-2] != 'pull':
                raise ValueError("Invalid PR URL format")
            
            owner = parts[-4]
            repo = parts[-3]
            pr_number = int(parts[-1])
            
            return {
                "owner": owner,
                "repo": repo,
                "pr_number": pr_number,
                "repo_url": f"https://github.com/{owner}/{repo}.git"
            }
            
        except (ValueError, IndexError) as e:
            raise SnapshotException(f"Invalid PR URL format: {pr_url}") from e

