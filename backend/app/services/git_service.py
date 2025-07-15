"""
CodegenApp Git Service
Git operations for repository management and PR handling
"""

import asyncio
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.utils.exceptions import GitHubAPIException

logger = get_logger(__name__)
settings = get_settings()


class GitService:
    """
    Git operations service
    
    Handles repository cloning, branch management, and PR operations
    with proper error handling and logging.
    """
    
    def __init__(self):
        self.github_token = settings.github.token
        logger.info("GitService initialized")
    
    async def clone_repository(
        self,
        repo_url: str,
        target_path: str,
        branch: str = "main",
        depth: Optional[int] = None
    ) -> bool:
        """
        Clone a repository to the specified path
        
        Args:
            repo_url: Repository URL (HTTPS or SSH)
            target_path: Local path to clone to
            branch: Branch to clone (default: main)
            depth: Clone depth for shallow clone
        """
        try:
            # Prepare authenticated URL if using HTTPS
            if repo_url.startswith("https://github.com/") and self.github_token:
                repo_url = repo_url.replace(
                    "https://github.com/",
                    f"https://{self.github_token}@github.com/"
                )
            
            # Build git clone command
            cmd = ["git", "clone"]
            
            if depth:
                cmd.extend(["--depth", str(depth)])
            
            cmd.extend(["-b", branch, repo_url, target_path])
            
            logger.info(
                "Cloning repository",
                repo_url=repo_url.replace(self.github_token, "***") if self.github_token else repo_url,
                target_path=target_path,
                branch=branch
            )
            
            # Execute clone command
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                logger.info("Repository cloned successfully", target_path=target_path)
                return True
            else:
                logger.error("Failed to clone repository", error=result.stderr)
                raise GitHubAPIException(f"Git clone failed: {result.stderr}")
                
        except Exception as e:
            logger.error("Repository clone failed", error=str(e))
            raise GitHubAPIException(f"Failed to clone repository: {str(e)}")
    
    async def fetch_pr_branch(self, repo_path: str, pr_number: int) -> bool:
        """
        Fetch PR branch from remote
        
        Args:
            repo_path: Local repository path
            pr_number: Pull request number
        """
        try:
            logger.info("Fetching PR branch", repo_path=repo_path, pr_number=pr_number)
            
            # Fetch PR branch
            cmd = [
                "git", "-C", repo_path, "fetch", "origin",
                f"pull/{pr_number}/head:pr-{pr_number}"
            ]
            
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                logger.info("PR branch fetched successfully", pr_number=pr_number)
                return True
            else:
                logger.error("Failed to fetch PR branch", error=result.stderr)
                raise GitHubAPIException(f"Failed to fetch PR branch: {result.stderr}")
                
        except Exception as e:
            logger.error("PR branch fetch failed", error=str(e))
            raise GitHubAPIException(f"Failed to fetch PR branch: {str(e)}")
    
    async def checkout_pr_branch(self, repo_path: str, pr_number: int) -> bool:
        """
        Checkout PR branch
        
        Args:
            repo_path: Local repository path
            pr_number: Pull request number
        """
        try:
            logger.info("Checking out PR branch", repo_path=repo_path, pr_number=pr_number)
            
            # Checkout PR branch
            cmd = ["git", "-C", repo_path, "checkout", f"pr-{pr_number}"]
            
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                logger.info("PR branch checked out successfully", pr_number=pr_number)
                return True
            else:
                logger.error("Failed to checkout PR branch", error=result.stderr)
                raise GitHubAPIException(f"Failed to checkout PR branch: {result.stderr}")
                
        except Exception as e:
            logger.error("PR branch checkout failed", error=str(e))
            raise GitHubAPIException(f"Failed to checkout PR branch: {str(e)}")
    
    async def get_diff(
        self,
        repo_path: str,
        base_branch: str = "main",
        target_branch: Optional[str] = None
    ) -> str:
        """
        Get diff between branches
        
        Args:
            repo_path: Local repository path
            base_branch: Base branch for comparison
            target_branch: Target branch (current if None)
        """
        try:
            cmd = ["git", "-C", repo_path, "diff"]
            
            if target_branch:
                cmd.append(f"{base_branch}..{target_branch}")
            else:
                cmd.append(base_branch)
            
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                return result.stdout
            else:
                logger.error("Failed to get git diff", error=result.stderr)
                return ""
                
        except Exception as e:
            logger.error("Git diff failed", error=str(e))
            return ""
    
    async def get_changed_files(
        self,
        repo_path: str,
        base_branch: str = "main",
        target_branch: Optional[str] = None
    ) -> List[str]:
        """
        Get list of changed files
        
        Args:
            repo_path: Local repository path
            base_branch: Base branch for comparison
            target_branch: Target branch (current if None)
        """
        try:
            cmd = ["git", "-C", repo_path, "diff", "--name-only"]
            
            if target_branch:
                cmd.append(f"{base_branch}..{target_branch}")
            else:
                cmd.append(base_branch)
            
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
                return files
            else:
                logger.error("Failed to get changed files", error=result.stderr)
                return []
                
        except Exception as e:
            logger.error("Get changed files failed", error=str(e))
            return []
    
    async def apply_patch(self, repo_path: str, patch_content: str) -> bool:
        """
        Apply a patch to the repository
        
        Args:
            repo_path: Local repository path
            patch_content: Patch content to apply
        """
        try:
            logger.info("Applying patch", repo_path=repo_path)
            
            # Write patch to temporary file
            patch_file = Path(repo_path) / "temp.patch"
            patch_file.write_text(patch_content)
            
            try:
                # Try git apply first
                cmd = ["git", "-C", repo_path, "apply", "-v", str(patch_file)]
                result = await self._run_git_command(cmd)
                
                if result.returncode == 0:
                    logger.info("Patch applied successfully with git apply")
                    return True
                
                # If git apply fails, try patch command
                logger.info("git apply failed, trying patch command")
                cmd = ["patch", "-p1", "-i", str(patch_file)]
                result = await self._run_git_command(cmd, cwd=repo_path)
                
                if result.returncode == 0:
                    logger.info("Patch applied successfully with patch command")
                    return True
                else:
                    logger.error("Failed to apply patch", error=result.stderr)
                    return False
                    
            finally:
                # Clean up temporary patch file
                patch_file.unlink(missing_ok=True)
                
        except Exception as e:
            logger.error("Patch application failed", error=str(e))
            return False
    
    async def get_commit_info(self, repo_path: str, commit_hash: str) -> Dict[str, Any]:
        """
        Get commit information
        
        Args:
            repo_path: Local repository path
            commit_hash: Commit hash to get info for
        """
        try:
            cmd = [
                "git", "-C", repo_path, "show",
                "--format=%H|%an|%ae|%ad|%s",
                "--no-patch",
                commit_hash
            ]
            
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                parts = result.stdout.strip().split('|')
                if len(parts) >= 5:
                    return {
                        "hash": parts[0],
                        "author_name": parts[1],
                        "author_email": parts[2],
                        "date": parts[3],
                        "message": parts[4]
                    }
            
            return {}
            
        except Exception as e:
            logger.error("Get commit info failed", error=str(e))
            return {}
    
    async def get_current_branch(self, repo_path: str) -> str:
        """
        Get current branch name
        
        Args:
            repo_path: Local repository path
        """
        try:
            cmd = ["git", "-C", repo_path, "branch", "--show-current"]
            result = await self._run_git_command(cmd)
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                return "unknown"
                
        except Exception as e:
            logger.error("Get current branch failed", error=str(e))
            return "unknown"
    
    async def _run_git_command(
        self,
        cmd: List[str],
        cwd: Optional[str] = None,
        timeout: int = 300
    ) -> subprocess.CompletedProcess:
        """
        Run git command asynchronously
        
        Args:
            cmd: Command to run
            cwd: Working directory
            timeout: Command timeout in seconds
        """
        try:
            # Sanitize command for logging (remove tokens)
            log_cmd = [
                part.replace(self.github_token, "***") if self.github_token and self.github_token in part else part
                for part in cmd
            ]
            logger.debug("Running git command", command=log_cmd, cwd=cwd)
            
            # Run command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**dict(os.environ), "GIT_TERMINAL_PROMPT": "0"}
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
                
                return subprocess.CompletedProcess(
                    args=cmd,
                    returncode=process.returncode,
                    stdout=stdout.decode('utf-8', errors='replace'),
                    stderr=stderr.decode('utf-8', errors='replace')
                )
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise GitHubAPIException(f"Git command timed out after {timeout} seconds")
                
        except Exception as e:
            logger.error("Git command execution failed", error=str(e))
            raise GitHubAPIException(f"Git command failed: {str(e)}")


# Import os for environment variables
import os

