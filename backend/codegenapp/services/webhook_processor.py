"""
Webhook Processor Service

This service processes incoming webhook notifications and triggers appropriate
workflows and real-time updates.
"""

import logging
import json
from typing import Dict, Any, Optional
from datetime import datetime

from codegenapp.core.orchestration.coordinator import ServiceCoordinator
from codegenapp.services.github_service import GitHubService
from codegenapp.websocket.manager import WebSocketManager

logger = logging.getLogger(__name__)


class WebhookProcessor:
    """Service for processing webhook notifications"""
    
    def __init__(self):
        self.github_service = GitHubService()
        self.websocket_manager = WebSocketManager()
        
    async def process_github_webhook(
        self,
        event_type: str,
        payload: Dict[str, Any],
        delivery_id: Optional[str] = None
    ) -> None:
        """
        Process GitHub webhook notifications
        
        Args:
            event_type: Type of GitHub event (pull_request, push, etc.)
            payload: Webhook payload from GitHub
            delivery_id: GitHub delivery ID for tracking
        """
        try:
            logger.info(f"Processing GitHub webhook: {event_type}")
            
            if event_type == "pull_request":
                await self._process_pull_request_event(payload)
            elif event_type == "push":
                await self._process_push_event(payload)
            elif event_type == "issues":
                await self._process_issues_event(payload)
            else:
                logger.info(f"Ignoring unsupported event type: {event_type}")
                
        except Exception as e:
            logger.error(f"Error processing GitHub webhook {event_type}: {e}")
    
    async def _process_pull_request_event(self, payload: Dict[str, Any]) -> None:
        """Process pull request events"""
        try:
            action = payload.get("action")
            pr_data = payload.get("pull_request", {})
            repository = payload.get("repository", {})
            
            repo_full_name = repository.get("full_name")
            pr_number = pr_data.get("number")
            pr_title = pr_data.get("title")
            pr_state = pr_data.get("state")
            
            logger.info(f"PR {action}: {repo_full_name}#{pr_number} - {pr_title}")
            
            # Create notification data
            notification_data = {
                "type": "pull_request",
                "action": action,
                "repository": repo_full_name,
                "pr_number": pr_number,
                "pr_title": pr_title,
                "pr_state": pr_state,
                "pr_url": pr_data.get("html_url"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send real-time notification to connected clients
            await self.websocket_manager.broadcast_to_project(
                project_name=repo_full_name,
                message=notification_data
            )
            
            # Handle specific PR actions
            if action == "opened":
                await self._handle_pr_opened(payload)
            elif action == "closed" and pr_data.get("merged"):
                await self._handle_pr_merged(payload)
            elif action == "synchronize":
                await self._handle_pr_updated(payload)
                
        except Exception as e:
            logger.error(f"Error processing pull request event: {e}")
    
    async def _handle_pr_opened(self, payload: Dict[str, Any]) -> None:
        """Handle when a new PR is opened"""
        try:
            pr_data = payload.get("pull_request", {})
            repository = payload.get("repository", {})
            
            # Check if this PR was created by Codegen
            pr_title = pr_data.get("title", "")
            pr_body = pr_data.get("body", "")
            
            if "codegen" in pr_title.lower() or "codegen" in pr_body.lower():
                logger.info("Detected Codegen-created PR, triggering validation pipeline")
                
                # Trigger validation pipeline
                await self._trigger_validation_pipeline(payload)
                
        except Exception as e:
            logger.error(f"Error handling PR opened: {e}")
    
    async def _handle_pr_merged(self, payload: Dict[str, Any]) -> None:
        """Handle when a PR is merged"""
        try:
            pr_data = payload.get("pull_request", {})
            repository = payload.get("repository", {})
            
            repo_full_name = repository.get("full_name")
            pr_number = pr_data.get("number")
            
            logger.info(f"PR merged: {repo_full_name}#{pr_number}")
            
            # Send notification about successful merge
            notification_data = {
                "type": "pr_merged",
                "repository": repo_full_name,
                "pr_number": pr_number,
                "message": f"PR #{pr_number} has been successfully merged",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket_manager.broadcast_to_project(
                project_name=repo_full_name,
                message=notification_data
            )
            
        except Exception as e:
            logger.error(f"Error handling PR merged: {e}")
    
    async def _handle_pr_updated(self, payload: Dict[str, Any]) -> None:
        """Handle when a PR is updated (new commits pushed)"""
        try:
            pr_data = payload.get("pull_request", {})
            repository = payload.get("repository", {})
            
            repo_full_name = repository.get("full_name")
            pr_number = pr_data.get("number")
            
            logger.info(f"PR updated: {repo_full_name}#{pr_number}")
            
            # Check if this is a Codegen PR that needs re-validation
            pr_title = pr_data.get("title", "")
            pr_body = pr_data.get("body", "")
            
            if "codegen" in pr_title.lower() or "codegen" in pr_body.lower():
                logger.info("Codegen PR updated, triggering re-validation")
                
                # Trigger validation pipeline for updated PR
                await self._trigger_validation_pipeline(payload, is_update=True)
            
        except Exception as e:
            logger.error(f"Error handling PR updated: {e}")
    
    async def _trigger_validation_pipeline(
        self, 
        payload: Dict[str, Any], 
        is_update: bool = False
    ) -> None:
        """
        Trigger the validation pipeline for a PR
        
        Args:
            payload: GitHub webhook payload
            is_update: Whether this is an update to an existing PR
        """
        try:
            pr_data = payload.get("pull_request", {})
            repository = payload.get("repository", {})
            
            repo_full_name = repository.get("full_name")
            pr_number = pr_data.get("number")
            pr_branch = pr_data.get("head", {}).get("ref")
            clone_url = repository.get("clone_url")
            
            # Create validation request
            validation_request = {
                "repository": repo_full_name,
                "pr_number": pr_number,
                "pr_branch": pr_branch,
                "clone_url": clone_url,
                "is_update": is_update,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Triggering validation pipeline for {repo_full_name}#{pr_number}")
            
            # Send notification about validation start
            notification_data = {
                "type": "validation_started",
                "repository": repo_full_name,
                "pr_number": pr_number,
                "message": f"Starting validation pipeline for PR #{pr_number}",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket_manager.broadcast_to_project(
                project_name=repo_full_name,
                message=notification_data
            )
            
            # TODO: Integrate with workflow engine to start validation pipeline
            # This would trigger the Grainchain snapshot creation and Web-Eval-Agent validation
            
        except Exception as e:
            logger.error(f"Error triggering validation pipeline: {e}")
    
    async def _process_push_event(self, payload: Dict[str, Any]) -> None:
        """Process push events"""
        try:
            repository = payload.get("repository", {})
            ref = payload.get("ref", "")
            commits = payload.get("commits", [])
            
            repo_full_name = repository.get("full_name")
            branch = ref.replace("refs/heads/", "") if ref.startswith("refs/heads/") else ref
            
            logger.info(f"Push to {repo_full_name}:{branch} with {len(commits)} commits")
            
            # Send real-time notification
            notification_data = {
                "type": "push",
                "repository": repo_full_name,
                "branch": branch,
                "commit_count": len(commits),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket_manager.broadcast_to_project(
                project_name=repo_full_name,
                message=notification_data
            )
            
        except Exception as e:
            logger.error(f"Error processing push event: {e}")
    
    async def _process_issues_event(self, payload: Dict[str, Any]) -> None:
        """Process issues events"""
        try:
            action = payload.get("action")
            issue_data = payload.get("issue", {})
            repository = payload.get("repository", {})
            
            repo_full_name = repository.get("full_name")
            issue_number = issue_data.get("number")
            issue_title = issue_data.get("title")
            
            logger.info(f"Issue {action}: {repo_full_name}#{issue_number} - {issue_title}")
            
            # Send real-time notification
            notification_data = {
                "type": "issue",
                "action": action,
                "repository": repo_full_name,
                "issue_number": issue_number,
                "issue_title": issue_title,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket_manager.broadcast_to_project(
                project_name=repo_full_name,
                message=notification_data
            )
            
        except Exception as e:
            logger.error(f"Error processing issues event: {e}")
    
    async def process_test_webhook(self, payload: Dict[str, Any]) -> None:
        """Process test webhook for debugging"""
        try:
            logger.info(f"Processing test webhook: {payload}")
            
            # Send test notification
            notification_data = {
                "type": "test",
                "message": "Test webhook processed successfully",
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket_manager.broadcast_message(notification_data)
            
        except Exception as e:
            logger.error(f"Error processing test webhook: {e}")
