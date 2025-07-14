"""
Codegen Service - Python SDK integration for Codegen API
Implements all 9 endpoints identified from the frontend:
1. Get Users
2. Get User  
3. Get Current User Info
4. Create Agent Run
5. Get Agent Run
6. List Agent Runs
7. Resume Agent Run
8. Get Organizations
9. Get Agent Run Logs
"""

import httpx
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from urllib.parse import urljoin

from models.api_models import (
    AgentRunResponse, UserResponse, OrganizationResponse,
    CreateAgentRunRequest, ResumeAgentRunRequest, StopAgentRunRequest,
    PaginatedResponse, AgentRunStatus
)

logger = logging.getLogger(__name__)


class CodegenService:
    """Service for interacting with Codegen API"""
    
    def __init__(self, api_token: str, base_url: str = "https://api.codegen.com"):
        self.api_token = api_token
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
                "User-Agent": "Strands-Agents-Backend/1.0.0"
            }
        )
        
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()
    
    async def health_check(self) -> str:
        """Check service health"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                return "healthy"
            else:
                return f"unhealthy: HTTP {response.status_code}"
        except Exception as e:
            return f"unhealthy: {str(e)}"
    
    async def validate_token(self, token: str = None) -> UserResponse:
        """Validate API token and return user info"""
        if token and token != self.api_token:
            # Create temporary client with provided token
            temp_client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            try:
                response = await temp_client.get(f"{self.base_url}/v1/users/me")
                if response.status_code == 200:
                    user_data = response.json()
                    return UserResponse(**user_data)
                else:
                    raise Exception(f"Token validation failed: {response.status_code}")
            finally:
                await temp_client.aclose()
        else:
            return await self.get_current_user()
    
    # ============================================================================
    # USER ENDPOINTS
    # ============================================================================
    
    async def get_current_user(self) -> UserResponse:
        """Get current user info from /me endpoint"""
        try:
            response = await self.client.get(f"{self.base_url}/v1/users/me")
            response.raise_for_status()
            user_data = response.json()
            
            logger.info(f"✅ Retrieved current user: {user_data.get('github_username')}")
            return UserResponse(**user_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to get current user: {e.response.status_code}")
            raise Exception(f"Failed to get current user: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting current user: {e}")
            raise
    
    async def get_users(
        self, 
        organization_id: int, 
        page: int = 1, 
        size: int = 50
    ) -> PaginatedResponse[UserResponse]:
        """Get users in organization"""
        try:
            url = f"{self.base_url}/v1/organizations/{organization_id}/users"
            params = {"page": page, "size": size}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Convert items to UserResponse objects
            users = [UserResponse(**user) for user in data.get("items", [])]
            
            result = PaginatedResponse(
                items=users,
                total=data.get("total", 0),
                page=data.get("page", page),
                size=data.get("size", size),
                pages=data.get("pages", 0)
            )
            
            logger.info(f"✅ Retrieved {len(users)} users for org {organization_id}")
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to get users: {e.response.status_code}")
            raise Exception(f"Failed to get users: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting users: {e}")
            raise
    
    async def get_user(self, organization_id: int, user_id: int) -> UserResponse:
        """Get specific user in organization"""
        try:
            url = f"{self.base_url}/v1/organizations/{organization_id}/users/{user_id}"
            
            response = await self.client.get(url)
            response.raise_for_status()
            user_data = response.json()
            
            logger.info(f"✅ Retrieved user {user_id} from org {organization_id}")
            return UserResponse(**user_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to get user: {e.response.status_code}")
            raise Exception(f"Failed to get user: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting user: {e}")
            raise
    
    # ============================================================================
    # ORGANIZATION ENDPOINTS
    # ============================================================================
    
    async def get_organizations(
        self, 
        page: int = 1, 
        size: int = 50
    ) -> PaginatedResponse[OrganizationResponse]:
        """Get organizations for current user"""
        try:
            url = f"{self.base_url}/v1/organizations"
            params = {"page": page, "size": size}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Convert items to OrganizationResponse objects
            orgs = [OrganizationResponse(**org) for org in data.get("items", [])]
            
            result = PaginatedResponse(
                items=orgs,
                total=data.get("total", 0),
                page=data.get("page", page),
                size=data.get("size", size),
                pages=data.get("pages", 0)
            )
            
            logger.info(f"✅ Retrieved {len(orgs)} organizations")
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to get organizations: {e.response.status_code}")
            raise Exception(f"Failed to get organizations: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting organizations: {e}")
            raise
    
    # ============================================================================
    # AGENT RUN ENDPOINTS
    # ============================================================================
    
    async def create_agent_run(
        self, 
        organization_id: int, 
        request: CreateAgentRunRequest
    ) -> AgentRunResponse:
        """Create new agent run"""
        try:
            url = f"{self.base_url}/v1/organizations/{organization_id}/agent/run"
            
            # Prepare request data
            request_data = {
                "prompt": request.prompt,
            }
            
            if request.images:
                request_data["images"] = request.images
            
            # Add workflow context if provided
            if request.workflow_context:
                request_data.update(request.workflow_context)
            
            response = await self.client.post(url, json=request_data)
            response.raise_for_status()
            run_data = response.json()
            
            logger.info(f"✅ Created agent run {run_data.get('id')} for org {organization_id}")
            return AgentRunResponse(**run_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to create agent run: {e.response.status_code}")
            raise Exception(f"Failed to create agent run: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error creating agent run: {e}")
            raise
    
    async def get_agent_run(
        self, 
        organization_id: int, 
        agent_run_id: int
    ) -> AgentRunResponse:
        """Get specific agent run"""
        try:
            url = f"{self.base_url}/v1/organizations/{organization_id}/agent/run/{agent_run_id}"
            
            response = await self.client.get(url)
            response.raise_for_status()
            run_data = response.json()
            
            logger.info(f"✅ Retrieved agent run {agent_run_id}")
            return AgentRunResponse(**run_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to get agent run: {e.response.status_code}")
            raise Exception(f"Failed to get agent run: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting agent run: {e}")
            raise
    
    async def list_agent_runs(
        self, 
        organization_id: int,
        page: int = 1,
        size: int = 50,
        status_filter: Optional[List[AgentRunStatus]] = None
    ) -> PaginatedResponse[AgentRunResponse]:
        """List agent runs for organization"""
        try:
            # Note: This endpoint might not exist in the current API
            # We'll implement it by getting individual runs or use a different approach
            url = f"{self.base_url}/v1/organizations/{organization_id}/agent/runs"
            params = {"page": page, "size": size}
            
            if status_filter:
                params["status"] = [status.value for status in status_filter]
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Convert items to AgentRunResponse objects
            runs = [AgentRunResponse(**run) for run in data.get("items", [])]
            
            result = PaginatedResponse(
                items=runs,
                total=data.get("total", 0),
                page=data.get("page", page),
                size=data.get("size", size),
                pages=data.get("pages", 0)
            )
            
            logger.info(f"✅ Retrieved {len(runs)} agent runs for org {organization_id}")
            return result
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # Endpoint doesn't exist, return empty result
                logger.warning("⚠️ List agent runs endpoint not available")
                return PaginatedResponse(
                    items=[],
                    total=0,
                    page=page,
                    size=size,
                    pages=0
                )
            logger.error(f"❌ Failed to list agent runs: {e.response.status_code}")
            raise Exception(f"Failed to list agent runs: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error listing agent runs: {e}")
            raise
    
    async def resume_agent_run(
        self, 
        organization_id: int, 
        request: ResumeAgentRunRequest
    ) -> AgentRunResponse:
        """Resume agent run"""
        try:
            url = f"{self.base_url}/v1/organizations/{organization_id}/agent/run/resume"
            
            request_data = {
                "agent_run_id": request.agent_run_id,
                "prompt": request.prompt,
            }
            
            if request.images:
                request_data["images"] = request.images
            
            response = await self.client.post(url, json=request_data)
            response.raise_for_status()
            run_data = response.json()
            
            logger.info(f"✅ Resumed agent run {request.agent_run_id}")
            return AgentRunResponse(**run_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to resume agent run: {e.response.status_code}")
            raise Exception(f"Failed to resume agent run: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error resuming agent run: {e}")
            raise
    
    async def stop_agent_run(
        self, 
        organization_id: int, 
        request: StopAgentRunRequest
    ) -> AgentRunResponse:
        """Stop agent run"""
        try:
            url = f"{self.base_url}/v1/beta/organizations/{organization_id}/agent/run/stop"
            
            request_data = {
                "agent_run_id": request.agent_run_id,
            }
            
            response = await self.client.post(url, json=request_data)
            response.raise_for_status()
            run_data = response.json()
            
            logger.info(f"✅ Stopped agent run {request.agent_run_id}")
            return AgentRunResponse(**run_data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Failed to stop agent run: {e.response.status_code}")
            raise Exception(f"Failed to stop agent run: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error stopping agent run: {e}")
            raise
    
    async def get_agent_run_logs(
        self, 
        organization_id: int, 
        agent_run_id: int
    ) -> Dict[str, Any]:
        """Get agent run logs"""
        try:
            # This endpoint might not exist in the current API
            # We'll try to get logs from the run details or implement a different approach
            url = f"{self.base_url}/v1/organizations/{organization_id}/agent/run/{agent_run_id}/logs"
            
            response = await self.client.get(url)
            response.raise_for_status()
            logs_data = response.json()
            
            logger.info(f"✅ Retrieved logs for agent run {agent_run_id}")
            return logs_data
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # Endpoint doesn't exist, return empty logs
                logger.warning(f"⚠️ Logs endpoint not available for run {agent_run_id}")
                return {"logs": [], "message": "Logs not available"}
            logger.error(f"❌ Failed to get agent run logs: {e.response.status_code}")
            raise Exception(f"Failed to get agent run logs: {e.response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error getting agent run logs: {e}")
            raise
    
    # ============================================================================
    # WORKFLOW INTEGRATION METHODS
    # ============================================================================
    
    async def create_workflow_agent_run(
        self,
        organization_id: int,
        prompt: str,
        workflow_id: str,
        step_id: str,
        context: Dict[str, Any] = None
    ) -> AgentRunResponse:
        """Create agent run with workflow context"""
        workflow_context = {
            "workflow_id": workflow_id,
            "step_id": step_id,
            "context": context or {}
        }
        
        request = CreateAgentRunRequest(
            prompt=prompt,
            workflow_context=workflow_context
        )
        
        return await self.create_agent_run(organization_id, request)
    
    async def monitor_agent_run_until_complete(
        self,
        organization_id: int,
        agent_run_id: int,
        poll_interval: int = 5,
        timeout: int = 300
    ) -> AgentRunResponse:
        """Monitor agent run until completion"""
        start_time = datetime.utcnow()
        
        while True:
            run = await self.get_agent_run(organization_id, agent_run_id)
            
            # Check if run is complete
            if run.status in [
                AgentRunStatus.COMPLETE,
                AgentRunStatus.ERROR,
                AgentRunStatus.FAILED,
                AgentRunStatus.CANCELLED,
                AgentRunStatus.TIMEOUT,
                AgentRunStatus.MAX_ITERATIONS_REACHED,
                AgentRunStatus.OUT_OF_TOKENS
            ]:
                return run
            
            # Check timeout
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed > timeout:
                logger.warning(f"⚠️ Monitoring timeout for agent run {agent_run_id}")
                break
            
            # Wait before next poll
            await asyncio.sleep(poll_interval)
        
        return run
    
    async def batch_create_agent_runs(
        self,
        organization_id: int,
        requests: List[CreateAgentRunRequest]
    ) -> List[AgentRunResponse]:
        """Create multiple agent runs concurrently"""
        tasks = [
            self.create_agent_run(organization_id, request)
            for request in requests
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and log them
        successful_runs = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"❌ Failed to create agent run {i}: {result}")
            else:
                successful_runs.append(result)
        
        logger.info(f"✅ Created {len(successful_runs)}/{len(requests)} agent runs")
        return successful_runs
