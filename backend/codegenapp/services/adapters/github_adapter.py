"""
GitHub adapter for webhook handling and repository operations.
Provides integration with GitHub API and webhook processing.
"""

import logging
import hmac
import hashlib
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


@dataclass
class GitHubWebhookEvent:
    """GitHub webhook event data structure"""
    event_type: str
    repository: str
    action: str
    payload: Dict[str, Any]
    delivery_id: str


class GitHubAdapter:
    """Adapter for GitHub API and webhook operations"""
    
    def __init__(self, token: Optional[str] = None, webhook_secret: Optional[str] = None):
        self.token = token
        self.webhook_secret = webhook_secret
        self.base_url = "https://api.github.com"
        
        # Configure session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        if self.token:
            self.session.headers.update({
                'Authorization': f'token {self.token}',
                'Accept': 'application/vnd.github.v3+json'
            })
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify GitHub webhook signature.
        
        Args:
            payload: Raw webhook payload
            signature: GitHub signature header
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.warning("No webhook secret configured, skipping signature verification")
            return True
        
        if not signature.startswith('sha256='):
            return False
        
        expected_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        received_signature = signature[7:]  # Remove 'sha256=' prefix
        
        return hmac.compare_digest(expected_signature, received_signature)
    
    def parse_webhook_event(self, 
                           headers: Dict[str, str], 
                           payload: Dict[str, Any]) -> Optional[GitHubWebhookEvent]:
        """
        Parse GitHub webhook event.
        
        Args:
            headers: Request headers
            payload: Webhook payload
            
        Returns:
            Parsed webhook event or None if invalid
        """
        try:
            event_type = headers.get('X-GitHub-Event')
            delivery_id = headers.get('X-GitHub-Delivery')
            
            if not event_type or not delivery_id:
                logger.error("Missing required webhook headers")
                return None
            
            repository = payload.get('repository', {}).get('full_name', '')
            action = payload.get('action', '')
            
            return GitHubWebhookEvent(
                event_type=event_type,
                repository=repository,
                action=action,
                payload=payload,
                delivery_id=delivery_id
            )
            
        except Exception as e:
            logger.error(f"Failed to parse webhook event: {e}")
            return None
    
    def get_repository_info(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """
        Get repository information from GitHub API.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Repository information or None if failed
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}"
            response = self.session.get(url)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get repository info for {owner}/{repo}: {e}")
            return None
    
    def get_pull_request(self, owner: str, repo: str, pr_number: int) -> Optional[Dict[str, Any]]:
        """
        Get pull request information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            Pull request information or None if failed
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/pulls/{pr_number}"
            response = self.session.get(url)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get PR {pr_number} for {owner}/{repo}: {e}")
            return None
    
    def create_issue_comment(self, 
                           owner: str, 
                           repo: str, 
                           issue_number: int, 
                           comment: str) -> Optional[Dict[str, Any]]:
        """
        Create a comment on an issue or pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            issue_number: Issue/PR number
            comment: Comment text
            
        Returns:
            Created comment information or None if failed
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/issues/{issue_number}/comments"
            data = {'body': comment}
            
            response = self.session.post(url, json=data)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to create comment on {owner}/{repo}#{issue_number}: {e}")
            return None
    
    def get_commit_status(self, owner: str, repo: str, sha: str) -> Optional[Dict[str, Any]]:
        """
        Get commit status checks.
        
        Args:
            owner: Repository owner
            repo: Repository name
            sha: Commit SHA
            
        Returns:
            Commit status information or None if failed
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/commits/{sha}/status"
            response = self.session.get(url)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to get commit status for {owner}/{repo}@{sha}: {e}")
            return None
    
    def create_webhook(self, 
                      owner: str, 
                      repo: str, 
                      webhook_url: str, 
                      events: List[str] = None) -> Optional[Dict[str, Any]]:
        """
        Create a webhook for the repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            webhook_url: URL to receive webhooks
            events: List of events to subscribe to
            
        Returns:
            Created webhook information or None if failed
        """
        if events is None:
            events = ['push', 'pull_request', 'issues']
        
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/hooks"
            data = {
                'name': 'web',
                'active': True,
                'events': events,
                'config': {
                    'url': webhook_url,
                    'content_type': 'json',
                    'insecure_ssl': '0'
                }
            }
            
            if self.webhook_secret:
                data['config']['secret'] = self.webhook_secret
            
            response = self.session.post(url, json=data)
            response.raise_for_status()
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Failed to create webhook for {owner}/{repo}: {e}")
            return None
    
    def handle_push_event(self, event: GitHubWebhookEvent) -> Dict[str, Any]:
        """
        Handle push webhook event.
        
        Args:
            event: GitHub webhook event
            
        Returns:
            Processing result
        """
        payload = event.payload
        
        return {
            'event_type': 'push',
            'repository': event.repository,
            'branch': payload.get('ref', '').replace('refs/heads/', ''),
            'commits': payload.get('commits', []),
            'pusher': payload.get('pusher', {}),
            'head_commit': payload.get('head_commit', {})
        }
    
    def handle_pull_request_event(self, event: GitHubWebhookEvent) -> Dict[str, Any]:
        """
        Handle pull request webhook event.
        
        Args:
            event: GitHub webhook event
            
        Returns:
            Processing result
        """
        payload = event.payload
        pr = payload.get('pull_request', {})
        
        return {
            'event_type': 'pull_request',
            'action': event.action,
            'repository': event.repository,
            'pr_number': pr.get('number'),
            'pr_title': pr.get('title'),
            'pr_body': pr.get('body'),
            'pr_state': pr.get('state'),
            'pr_merged': pr.get('merged', False),
            'base_branch': pr.get('base', {}).get('ref'),
            'head_branch': pr.get('head', {}).get('ref'),
            'author': pr.get('user', {}).get('login')
        }
