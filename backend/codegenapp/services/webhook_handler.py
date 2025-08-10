"""
Webhook handler service for processing GitHub webhooks.
Coordinates webhook processing with project management and agent runs.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException

from .adapters.github_adapter import GitHubAdapter, GitHubWebhookEvent
from ..repositories.project_repository import ProjectRepository
from ..repositories.agent_run_repository import AgentRunRepository
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)


class WebhookHandler:
    """Service for handling GitHub webhooks"""
    
    def __init__(self, 
                 github_adapter: GitHubAdapter,
                 project_repo: ProjectRepository,
                 agent_run_repo: AgentRunRepository):
        self.github_adapter = github_adapter
        self.project_repo = project_repo
        self.agent_run_repo = agent_run_repo
    
    async def process_webhook(self, 
                            headers: Dict[str, str], 
                            payload: bytes) -> Dict[str, Any]:
        """
        Process incoming GitHub webhook.
        
        Args:
            headers: Request headers
            payload: Raw webhook payload
            
        Returns:
            Processing result
        """
        # Verify webhook signature
        signature = headers.get('X-Hub-Signature-256', '')
        if not self.github_adapter.verify_webhook_signature(payload, signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
        # Parse webhook event
        import json
        payload_dict = json.loads(payload.decode('utf-8'))
        event = self.github_adapter.parse_webhook_event(headers, payload_dict)
        
        if not event:
            raise HTTPException(status_code=400, detail="Invalid webhook event")
        
        logger.info(f"Processing webhook: {event.event_type} for {event.repository}")
        
        # Route to appropriate handler
        if event.event_type == 'push':
            return await self._handle_push_event(event)
        elif event.event_type == 'pull_request':
            return await self._handle_pull_request_event(event)
        elif event.event_type == 'issues':
            return await self._handle_issues_event(event)
        else:
            logger.info(f"Unhandled webhook event type: {event.event_type}")
            return {'status': 'ignored', 'reason': f'Unhandled event type: {event.event_type}'}
    
    async def _handle_push_event(self, event: GitHubWebhookEvent) -> Dict[str, Any]:
        """Handle push webhook event"""
        try:
            # Find project by repository
            project = self.project_repo.get_by_github_repo(event.repository)
            if not project:
                logger.warning(f"No project found for repository: {event.repository}")
                return {'status': 'ignored', 'reason': 'No matching project'}
            
            # Process push event
            push_data = self.github_adapter.handle_push_event(event)
            
            # Check if this is a push to main/master branch
            if push_data['branch'] in ['main', 'master']:
                logger.info(f"Push to main branch detected for project {project.id}")
                
                # Trigger validation pipeline if configured
                if project.validation_settings.get('auto_validate_on_push', False):
                    await self._trigger_validation_pipeline(project.id, push_data)
            
            return {
                'status': 'processed',
                'project_id': project.id,
                'event_data': push_data
            }
            
        except Exception as e:
            logger.error(f"Failed to handle push event: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def _handle_pull_request_event(self, event: GitHubWebhookEvent) -> Dict[str, Any]:
        """Handle pull request webhook event"""
        try:
            # Find project by repository
            project = self.project_repo.get_by_github_repo(event.repository)
            if not project:
                logger.warning(f"No project found for repository: {event.repository}")
                return {'status': 'ignored', 'reason': 'No matching project'}
            
            # Process PR event
            pr_data = self.github_adapter.handle_pull_request_event(event)
            
            # Handle different PR actions
            if event.action == 'opened':
                await self._handle_pr_opened(project, pr_data)
            elif event.action == 'synchronize':
                await self._handle_pr_updated(project, pr_data)
            elif event.action == 'closed' and pr_data['pr_merged']:
                await self._handle_pr_merged(project, pr_data)
            
            return {
                'status': 'processed',
                'project_id': project.id,
                'event_data': pr_data
            }
            
        except Exception as e:
            logger.error(f"Failed to handle PR event: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def _handle_issues_event(self, event: GitHubWebhookEvent) -> Dict[str, Any]:
        """Handle issues webhook event"""
        try:
            # Find project by repository
            project = self.project_repo.get_by_github_repo(event.repository)
            if not project:
                return {'status': 'ignored', 'reason': 'No matching project'}
            
            # Log issue event for now
            logger.info(f"Issue {event.action} for project {project.id}")
            
            return {
                'status': 'processed',
                'project_id': project.id,
                'action': event.action
            }
            
        except Exception as e:
            logger.error(f"Failed to handle issues event: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def _handle_pr_opened(self, project, pr_data: Dict[str, Any]) -> None:
        """Handle PR opened event"""
        logger.info(f"PR #{pr_data['pr_number']} opened for project {project.id}")
        
        # Auto-trigger validation if configured
        if project.validation_settings.get('auto_validate_on_pr', False):
            await self._trigger_validation_pipeline(project.id, pr_data)
    
    async def _handle_pr_updated(self, project, pr_data: Dict[str, Any]) -> None:
        """Handle PR updated event"""
        logger.info(f"PR #{pr_data['pr_number']} updated for project {project.id}")
        
        # Re-run validation if configured
        if project.validation_settings.get('auto_validate_on_pr_update', False):
            await self._trigger_validation_pipeline(project.id, pr_data)
    
    async def _handle_pr_merged(self, project, pr_data: Dict[str, Any]) -> None:
        """Handle PR merged event"""
        logger.info(f"PR #{pr_data['pr_number']} merged for project {project.id}")
        
        # Trigger deployment if configured
        if project.deployment_settings.get('auto_deploy_on_merge', False):
            await self._trigger_deployment(project.id, pr_data)
    
    from ..repositories.agent_run_repository import AgentRunRepository
from ..database.connection import DatabaseManager
