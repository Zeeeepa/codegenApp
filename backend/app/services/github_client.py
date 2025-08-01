"""
GitHub API client for repository operations and webhook management
"""
import os
import logging
from typing import List, Dict, Optional, Tuple
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class GitHubClient:
    """GitHub API client for CodegenApp integration"""
    
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("GitHub token is required")
        
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CodegenApp/1.0"
        }
        
        # HTTP client with timeout and retry
        self.client = httpx.AsyncClient(
            headers=self.headers,
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def get_user_repositories(self, per_page: int = 100) -> List[Dict]:
        """Get all repositories for the authenticated user"""
        try:
            repositories = []
            page = 1
            
            while True:
                response = await self.client.get(
                    f"{self.base_url}/user/repos",
                    params={
                        "per_page": per_page,
                        "page": page,
                        "sort": "updated",
                        "direction": "desc"
                    }
                )
                response.raise_for_status()
                
                repos = response.json()
                if not repos:
                    break
                
                repositories.extend(repos)
                
                # Check if there are more pages
                if len(repos) < per_page:
                    break
                
                page += 1
            
            logger.info(f"Retrieved {len(repositories)} repositories")
            return repositories
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get repositories: {e}")
            raise
    
    async def get_organization_repositories(self, org: str, per_page: int = 100) -> List[Dict]:
        """Get all repositories for an organization"""
        try:
            repositories = []
            page = 1
            
            while True:
                response = await self.client.get(
                    f"{self.base_url}/orgs/{org}/repos",
                    params={
                        "per_page": per_page,
                        "page": page,
                        "sort": "updated",
                        "direction": "desc"
                    }
                )
                response.raise_for_status()
                
                repos = response.json()
                if not repos:
                    break
                
                repositories.extend(repos)
                
                if len(repos) < per_page:
                    break
                
                page += 1
            
            logger.info(f"Retrieved {len(repositories)} repositories for org {org}")
            return repositories
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get org repositories: {e}")
            raise
    
    async def get_repository(self, owner: str, repo: str) -> Dict:
        """Get detailed information about a specific repository"""
        try:
            response = await self.client.get(f"{self.base_url}/repos/{owner}/{repo}")
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get repository {owner}/{repo}: {e}")
            raise
    
    async def get_repository_branches(self, owner: str, repo: str) -> List[Dict]:
        """Get all branches for a repository"""
        try:
            response = await self.client.get(f"{self.base_url}/repos/{owner}/{repo}/branches")
            response.raise_for_status()
            
            branches = response.json()
            logger.info(f"Retrieved {len(branches)} branches for {owner}/{repo}")
            return branches
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get branches for {owner}/{repo}: {e}")
            raise
    
    async def create_webhook(self, owner: str, repo: str, webhook_url: str, 
                           events: List[str] = None, secret: str = None) -> Dict:
        """Create a webhook for a repository"""
        if events is None:
            events = ["pull_request", "push", "pull_request_review"]
        
        webhook_config = {
            "url": webhook_url,
            "content_type": "json",
            "insecure_ssl": "0"
        }
        
        if secret:
            webhook_config["secret"] = secret
        
        payload = {
            "name": "web",
            "active": True,
            "events": events,
            "config": webhook_config
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo}/hooks",
                json=payload
            )
            response.raise_for_status()
            
            webhook = response.json()
            logger.info(f"Created webhook {webhook['id']} for {owner}/{repo}")
            return webhook
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to create webhook for {owner}/{repo}: {e}")
            if e.response.status_code == 422:
                # Webhook might already exist
                existing_webhooks = await self.get_webhooks(owner, repo)
                for hook in existing_webhooks:
                    if hook["config"]["url"] == webhook_url:
                        logger.info(f"Webhook already exists: {hook['id']}")
                        return hook
            raise
    
    async def get_webhooks(self, owner: str, repo: str) -> List[Dict]:
        """Get all webhooks for a repository"""
        try:
            response = await self.client.get(f"{self.base_url}/repos/{owner}/{repo}/hooks")
            response.raise_for_status()
            
            webhooks = response.json()
            logger.info(f"Retrieved {len(webhooks)} webhooks for {owner}/{repo}")
            return webhooks
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get webhooks for {owner}/{repo}: {e}")
            raise
    
    async def update_webhook(self, owner: str, repo: str, webhook_id: str, 
                           webhook_url: str = None, events: List[str] = None, 
                           active: bool = None) -> Dict:
        """Update an existing webhook"""
        payload = {}
        
        if webhook_url or events:
            config = {}
            if webhook_url:
                config["url"] = webhook_url
                config["content_type"] = "json"
                config["insecure_ssl"] = "0"
            payload["config"] = config
        
        if events:
            payload["events"] = events
        
        if active is not None:
            payload["active"] = active
        
        try:
            response = await self.client.patch(
                f"{self.base_url}/repos/{owner}/{repo}/hooks/{webhook_id}",
                json=payload
            )
            response.raise_for_status()
            
            webhook = response.json()
            logger.info(f"Updated webhook {webhook_id} for {owner}/{repo}")
            return webhook
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to update webhook {webhook_id} for {owner}/{repo}: {e}")
            raise
    
    async def delete_webhook(self, owner: str, repo: str, webhook_id: str) -> bool:
        """Delete a webhook"""
        try:
            response = await self.client.delete(
                f"{self.base_url}/repos/{owner}/{repo}/hooks/{webhook_id}"
            )
            response.raise_for_status()
            
            logger.info(f"Deleted webhook {webhook_id} for {owner}/{repo}")
            return True
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to delete webhook {webhook_id} for {owner}/{repo}: {e}")
            return False
    
    async def get_pull_request(self, owner: str, repo: str, pr_number: int) -> Dict:
        """Get details of a specific pull request"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
            )
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get PR {pr_number} for {owner}/{repo}: {e}")
            raise
    
    async def get_pull_requests(self, owner: str, repo: str, state: str = "open") -> List[Dict]:
        """Get all pull requests for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/pulls",
                params={"state": state, "per_page": 100}
            )
            response.raise_for_status()
            
            prs = response.json()
            logger.info(f"Retrieved {len(prs)} PRs for {owner}/{repo}")
            return prs
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get PRs for {owner}/{repo}: {e}")
            raise
    
    async def merge_pull_request(self, owner: str, repo: str, pr_number: int, 
                               commit_title: str = None, commit_message: str = None,
                               merge_method: str = "merge") -> Dict:
        """Merge a pull request"""
        payload = {
            "merge_method": merge_method  # merge, squash, rebase
        }
        
        if commit_title:
            payload["commit_title"] = commit_title
        
        if commit_message:
            payload["commit_message"] = commit_message
        
        try:
            response = await self.client.put(
                f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}/merge",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Merged PR {pr_number} for {owner}/{repo}")
            return result
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to merge PR {pr_number} for {owner}/{repo}: {e}")
            raise
    
    async def create_issue_comment(self, owner: str, repo: str, issue_number: int, 
                                 body: str) -> Dict:
        """Create a comment on an issue or PR"""
        payload = {"body": body}
        
        try:
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo}/issues/{issue_number}/comments",
                json=payload
            )
            response.raise_for_status()
            
            comment = response.json()
            logger.info(f"Created comment on issue {issue_number} for {owner}/{repo}")
            return comment
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to create comment on issue {issue_number} for {owner}/{repo}: {e}")
            raise
    
    async def get_authenticated_user(self) -> Dict:
        """Get information about the authenticated user"""
        try:
            response = await self.client.get(f"{self.base_url}/user")
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get authenticated user: {e}")
            raise
    
    def parse_repository_url(self, url: str) -> Tuple[str, str]:
        """Parse GitHub repository URL to extract owner and repo name"""
        # Handle various GitHub URL formats
        url = url.replace("https://github.com/", "").replace("http://github.com/", "")
        url = url.replace("git@github.com:", "")
        url = url.rstrip("/").replace(".git", "")
        
        parts = url.split("/")
        if len(parts) >= 2:
            return parts[0], parts[1]
        else:
            raise ValueError(f"Invalid GitHub repository URL: {url}")
    
    async def validate_repository_access(self, owner: str, repo: str) -> bool:
        """Check if the authenticated user has access to a repository"""
        try:
            await self.get_repository(owner, repo)
            return True
        except httpx.HTTPError as e:
            if e.response.status_code == 404:
                return False
            raise


# Utility functions
async def get_github_client() -> GitHubClient:
    """Get configured GitHub client"""
    return GitHubClient()


async def test_github_connection() -> bool:
    """Test GitHub API connection"""
    try:
        async with GitHubClient() as client:
            user = await client.get_authenticated_user()
            logger.info(f"GitHub connection successful. User: {user.get('login')}")
            return True
    except Exception as e:
        logger.error(f"GitHub connection failed: {e}")
        return False

