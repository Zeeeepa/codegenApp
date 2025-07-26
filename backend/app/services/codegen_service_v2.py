"""
Official Codegen API service integration (v2).

This service provides integration with the official Codegen API endpoints,
replacing the custom implementation with proper agent run lifecycle management.
"""

import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from ..config.settings import get_settings


logger = logging.getLogger(__name__)


class AgentRunStatus(str, Enum):
    """Agent run status enumeration matching official API."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CodegenServiceV2:
    """
    Official Codegen API service integration.
    
    Provides integration with the official Codegen API endpoints for
    agent run management, following the documented API specification.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.codegen_api_base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
        
        if not self.settings.is_official_api_enabled():
            raise ValueError(
                "Official Codegen API is not properly configured. "
                "Please set CODEGEN_API_KEY and CODEGEN_ORG_ID environment variables."
            )
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._close_session()
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes default
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                headers=self.settings.get_codegen_headers()
            )
    
    async def _close_session(self):
        """Close aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
    
    async def create_agent_run(
        self,
        message: str,
        repository_owner: str,
        repository_name: str,
        branch: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new agent run using the official API.
        
        Args:
            message: The message/prompt for the agent
            repository_owner: GitHub repository owner
            repository_name: GitHub repository name
            branch: Target branch (optional, defaults to main)
            metadata: Additional metadata for the run
            
        Returns:
            dict: Agent run response from API
            
        Raises:
            Exception: If API request fails
        """
        await self._ensure_session()
        
        payload = {
            "message": message,
            "repository": {
                "owner": repository_owner,
                "name": repository_name,
            },
            "organization_id": self.settings.codegen_org_id,
        }
        
        # Add optional fields
        if branch:
            payload["repository"]["branch"] = branch
        
        if metadata:
            payload["metadata"] = metadata
        
        endpoint = f"{self.base_url}/api/v1/agents/runs"
        
        try:
            logger.info(f"Creating agent run for {repository_owner}/{repository_name}")
            
            async with self.session.post(endpoint, json=payload) as response:
                if response.status == 201:
                    result = await response.json()
                    logger.info(f"Agent run created successfully: {result.get('id')}")
                    return self._process_agent_response(result)
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to create agent run: {response.status} - {error_text}")
                    raise Exception(f"Codegen API error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error("Agent run creation timed out")
            raise Exception("Codegen API request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"Client error during agent run creation: {str(e)}")
            raise Exception(f"Codegen API client error: {str(e)}")
    
    async def resume_agent_run(
        self,
        run_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Resume an existing agent run with additional input.
        
        Args:
            run_id: ID of the agent run to resume
            message: Additional message/input for the agent
            
        Returns:
            dict: Agent run response from API
            
        Raises:
            Exception: If API request fails
        """
        await self._ensure_session()
        
        payload = {
            "message": message
        }
        
        endpoint = f"{self.base_url}/api/v1/agents/runs/{run_id}/resume"
        
        try:
            logger.info(f"Resuming agent run: {run_id}")
            
            async with self.session.post(endpoint, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"Agent run resumed successfully: {run_id}")
                    return self._process_agent_response(result)
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to resume agent run: {response.status} - {error_text}")
                    raise Exception(f"Codegen API error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error(f"Agent run resume timed out: {run_id}")
            raise Exception("Codegen API request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"Client error during agent run resume: {str(e)}")
            raise Exception(f"Codegen API client error: {str(e)}")
    
    async def get_agent_run(self, run_id: str) -> Dict[str, Any]:
        """
        Get the details of an agent run.
        
        Args:
            run_id: ID of the agent run
            
        Returns:
            dict: Agent run details
            
        Raises:
            Exception: If API request fails
        """
        await self._ensure_session()
        
        endpoint = f"{self.base_url}/api/v1/agents/runs/{run_id}"
        
        try:
            logger.debug(f"Getting agent run details: {run_id}")
            
            async with self.session.get(endpoint) as response:
                if response.status == 200:
                    result = await response.json()
                    return self._process_agent_response(result)
                elif response.status == 404:
                    raise ValueError(f"Agent run {run_id} not found")
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to get agent run: {response.status} - {error_text}")
                    raise Exception(f"Codegen API error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error(f"Agent run get timed out: {run_id}")
            raise Exception("Codegen API request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"Client error during agent run get: {str(e)}")
            raise Exception(f"Codegen API client error: {str(e)}")
    
    async def cancel_agent_run(self, run_id: str) -> bool:
        """
        Cancel a running agent run.
        
        Args:
            run_id: ID of the agent run to cancel
            
        Returns:
            bool: True if cancelled successfully
        """
        await self._ensure_session()
        
        endpoint = f"{self.base_url}/api/v1/agents/runs/{run_id}/cancel"
        
        try:
            logger.info(f"Cancelling agent run: {run_id}")
            
            async with self.session.post(endpoint) as response:
                if response.status == 200:
                    logger.info(f"Agent run cancelled successfully: {run_id}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to cancel agent run: {response.status} - {error_text}")
                    return False
                    
        except (asyncio.TimeoutError, aiohttp.ClientError) as e:
            logger.error(f"Error cancelling agent run {run_id}: {str(e)}")
            return False
    
    async def list_agent_runs(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[AgentRunStatus] = None
    ) -> Dict[str, Any]:
        """
        List agent runs for the organization.
        
        Args:
            limit: Maximum number of runs to return
            offset: Number of runs to skip
            status: Filter by status (optional)
            
        Returns:
            dict: List of agent runs with pagination info
        """
        await self._ensure_session()
        
        params = {
            "limit": limit,
            "offset": offset,
        }
        
        if status:
            params["status"] = status.value
        
        endpoint = f"{self.base_url}/api/v1/agents/runs"
        
        try:
            logger.debug(f"Listing agent runs with params: {params}")
            
            async with self.session.get(endpoint, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    # Process each run in the list
                    if "runs" in result:
                        result["runs"] = [
                            self._process_agent_response(run) 
                            for run in result["runs"]
                        ]
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to list agent runs: {response.status} - {error_text}")
                    raise Exception(f"Codegen API error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error("Agent runs list timed out")
            raise Exception("Codegen API request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"Client error during agent runs list: {str(e)}")
            raise Exception(f"Codegen API client error: {str(e)}")
    
    def _process_agent_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and normalize agent response from official API.
        
        Args:
            response: Raw agent response from API
            
        Returns:
            dict: Processed response with enhanced metadata
        """
        # Extract key information from official API response
        processed = {
            "id": response.get("id"),
            "status": response.get("status", "unknown"),
            "message": response.get("message", ""),
            "created_at": response.get("created_at"),
            "updated_at": response.get("updated_at"),
            "metadata": response.get("metadata", {}),
            "repository": response.get("repository", {}),
            "organization_id": response.get("organization_id"),
        }
        
        # Add processing timestamp
        processed["processed_at"] = datetime.utcnow().isoformat()
        
        # Analyze message content for type classification
        message_content = processed["message"].lower()
        
        # Check for PR creation indicators
        if any(indicator in message_content for indicator in [
            "pull request", "pr created", "github.com", "/pull/", "merge request"
        ]):
            processed["type"] = "pr"
            processed["pr_url"] = self._extract_pr_url(processed["message"])
        
        # Check for plan indicators
        elif any(indicator in message_content for indicator in [
            "plan:", "steps:", "confirm", "proceed", "approach:"
        ]):
            processed["type"] = "plan"
            processed["plan_content"] = self._extract_plan_content(processed["message"])
        
        # Default to regular response
        else:
            processed["type"] = "regular"
        
        # Add error information if present
        if response.get("error"):
            processed["error"] = response["error"]
            processed["status"] = "failed"
        
        return processed
    
    def _extract_pr_url(self, content: str) -> Optional[str]:
        """
        Extract PR URL from agent response content.
        
        Args:
            content: Agent response content
            
        Returns:
            str: Extracted PR URL or None
        """
        import re
        
        # Look for GitHub PR URLs
        pr_patterns = [
            r'https://github\.com/[^/\s]+/[^/\s]+/pull/\d+',
            r'https://[^/\s]+/[^/\s]+/[^/\s]+/pull/\d+',
            r'https://[^/\s]+/[^/\s]+/[^/\s]+/merge_requests/\d+'
        ]
        
        for pattern in pr_patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(0)
        
        return None
    
    def _extract_plan_content(self, content: str) -> Dict[str, Any]:
        """
        Extract plan content from agent response.
        
        Args:
            content: Agent response content
            
        Returns:
            dict: Extracted plan information
        """
        lines = content.split('\n')
        plan_lines = []
        in_plan = False
        
        for line in lines:
            line = line.strip()
            if any(indicator in line.lower() for indicator in [
                "plan:", "steps:", "approach:", "strategy:"
            ]):
                in_plan = True
                continue
            
            if in_plan and line:
                if line.startswith(('1.', '2.', '3.', '-', '*', '•')):
                    plan_lines.append(line)
                elif not any(line.startswith(f'{i}.') for i in range(4, 20)):
                    # Stop if we hit non-plan content
                    break
        
        return {
            "steps": plan_lines,
            "summary": content[:300] + "..." if len(content) > 300 else content,
            "step_count": len(plan_lines)
        }
    
    async def health_check(self) -> bool:
        """
        Check if Codegen API is accessible.
        
        Returns:
            bool: True if API is accessible
        """
        try:
            await self._ensure_session()
            
            # Use a simple endpoint to check connectivity
            endpoint = f"{self.base_url}/api/v1/agents/runs"
            params = {"limit": 1}
            
            async with self.session.get(endpoint, params=params) as response:
                return response.status in [200, 401, 403]  # 401/403 means API is up but auth issue
                
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Get service configuration information.
        
        Returns:
            dict: Service information (without sensitive data)
        """
        return {
            "service_name": "codegen_service_v2",
            "version": "2.0.0",
            "api_base_url": self.base_url,
            "organization_id": self.settings.codegen_org_id,
            "has_api_key": bool(self.settings.codegen_api_key),
            "official_api_enabled": self.settings.is_official_api_enabled(),
            "supported_endpoints": [
                "POST /api/v1/agents/runs",
                "POST /api/v1/agents/runs/{id}/resume",
                "GET /api/v1/agents/runs/{id}",
                "POST /api/v1/agents/runs/{id}/cancel",
                "GET /api/v1/agents/runs"
            ]
        }


# Convenience functions for backward compatibility
async def create_agent_run(
    message: str,
    repository_owner: str,
    repository_name: str,
    branch: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function to create an agent run.
    
    Args:
        message: The message/prompt for the agent
        repository_owner: GitHub repository owner
        repository_name: GitHub repository name
        branch: Target branch (optional)
        metadata: Additional metadata
        
    Returns:
        dict: Agent run response
    """
    async with CodegenServiceV2() as service:
        return await service.create_agent_run(
            message=message,
            repository_owner=repository_owner,
            repository_name=repository_name,
            branch=branch,
            metadata=metadata
        )


async def resume_agent_run(run_id: str, message: str) -> Dict[str, Any]:
    """
    Convenience function to resume an agent run.
    
    Args:
        run_id: ID of the agent run to resume
        message: Additional message/input
        
    Returns:
        dict: Agent run response
    """
    async with CodegenServiceV2() as service:
        return await service.resume_agent_run(run_id=run_id, message=message)


async def get_agent_run(run_id: str) -> Dict[str, Any]:
    """
    Convenience function to get agent run details.
    
    Args:
        run_id: ID of the agent run
        
    Returns:
        dict: Agent run details
    """
    async with CodegenServiceV2() as service:
        return await service.get_agent_run(run_id=run_id)
