"""
GitHub Service

This service provides GitHub API integration for repository management,
webhook handling, and PR operations.
"""

import logging
import aiohttp
import json
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class GitHubRepository:
    """GitHub repository model"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.name = data.get("name")
        self.full_name = data.get("full_name")
        self.description = data.get("description")
        self.private = data.get("private", False)
        self.clone_url = data.get("clone_url")
        self.ssh_url = data.get("ssh_url")
        self.default_branch = data.get("default_branch", "main")
        self.owner = data.get("owner", {})


class GitHubPullRequest:
    """GitHub pull request model"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.number = data.get("number")
        self.title = data.get("title")
        self.body = data.get("body")
        self.state = data.get("state")
        self.head = data.get("head", {})
        self.base = data.get("base", {})
        self.mergeable = data.get("mergeable")
        self.merged = data.get("merged", False)
        self.html_url = data.get("html_url")


class GitHubService:
    """Service for GitHub API operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.github_token = self.settings.github_token
        self.base_url = "https://api.github.com"
        
    async def get_repositories(self, org: Optional[str] = None) -> List[GitHubRepository]:
        """
        Get repositories for the authenticated user or organization
        
        Args:
            org: Organization name (optional)
            
        Returns:
            List of GitHubRepository objects
        """
        try:
            if org:
                url = f"{self.base_url}/orgs/{org}/repos"
            else:
                url = f"{self.base_url}/user/repos"
            
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        repos_data = await response.json()
                        return [GitHubRepository(repo) for repo in repos_data]
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to get repositories: {response.status} - {error_text}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error getting repositories: {e}")
            return []
    
    async def get_repository(self, owner: str, repo: str) -> Optional[GitHubRepository]:
        """
        Get a specific repository
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            GitHubRepository object or None
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        repo_data = await response.json()
                        return GitHubRepository(repo_data)
                    else:
                        logger.error(f"Repository not found: {owner}/{repo}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error getting repository {owner}/{repo}: {e}")
            return None
    
    async def set_webhook(
        self, 
        owner: str, 
        repo: str, 
        webhook_url: str,
        events: List[str] = None
    ) -> bool:
        """
        Set up a webhook for a repository
        
        Args:
            owner: Repository owner
            repo: Repository name
            webhook_url: URL to receive webhook notifications
            events: List of events to subscribe to
            
        Returns:
            True if successful, False otherwise
        """
        if events is None:
            events = ["pull_request", "push", "issues"]
        
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/hooks"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
            
            webhook_config = {
                "name": "web",
                "active": True,
                "events": events,
                "config": {
                    "url": webhook_url,
                    "content_type": "json",
                    "insecure_ssl": "0"
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=webhook_config) as response:
                    if response.status == 201:
                        logger.info(f"Webhook set successfully for {owner}/{repo}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to set webhook: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error setting webhook for {owner}/{repo}: {e}")
            return False
    
    async def get_pull_request(
        self, 
        owner: str, 
        repo: str, 
        pr_number: int
    ) -> Optional[GitHubPullRequest]:
        """
        Get a specific pull request
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            GitHubPullRequest object or None
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        pr_data = await response.json()
                        return GitHubPullRequest(pr_data)
                    else:
                        logger.error(f"Pull request not found: {owner}/{repo}#{pr_number}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error getting pull request {owner}/{repo}#{pr_number}: {e}")
            return None
    
    async def merge_pull_request(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        commit_title: Optional[str] = None,
        commit_message: Optional[str] = None,
        merge_method: str = "merge"
    ) -> bool:
        """
        Merge a pull request
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            commit_title: Title for the merge commit
            commit_message: Message for the merge commit
            merge_method: Merge method (merge, squash, rebase)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}/merge"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
            
            merge_data = {
                "merge_method": merge_method
            }
            
            if commit_title:
                merge_data["commit_title"] = commit_title
            if commit_message:
                merge_data["commit_message"] = commit_message
            
            async with aiohttp.ClientSession() as session:
                async with session.put(url, headers=headers, json=merge_data) as response:
                    if response.status == 200:
                        logger.info(f"Pull request merged successfully: {owner}/{repo}#{pr_number}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to merge pull request: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error merging pull request {owner}/{repo}#{pr_number}: {e}")
            return False
    
    async def create_issue_comment(
        self,
        owner: str,
        repo: str,
        issue_number: int,
        comment: str
    ) -> bool:
        """
        Create a comment on an issue or pull request
        
        Args:
            owner: Repository owner
            repo: Repository name
            issue_number: Issue or PR number
            comment: Comment text
            
        Returns:
            True if successful, False otherwise
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/issues/{issue_number}/comments"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
            
            comment_data = {"body": comment}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=comment_data) as response:
                    if response.status == 201:
                        logger.info(f"Comment created successfully on {owner}/{repo}#{issue_number}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to create comment: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error creating comment on {owner}/{repo}#{issue_number}: {e}")
            return False
    
    async def get_branches(self, owner: str, repo: str) -> List[str]:
        """
        Get all branches for a repository
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            List of branch names
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/branches"
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        branches_data = await response.json()
                        return [branch["name"] for branch in branches_data]
                    else:
                        logger.error(f"Failed to get branches for {owner}/{repo}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error getting branches for {owner}/{repo}: {e}")
            return []
