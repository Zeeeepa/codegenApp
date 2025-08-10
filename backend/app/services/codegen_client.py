"""
Comprehensive Codegen Agent API Client
Provides full integration with Codegen's agent capabilities for single-user operation.
"""

import os
import httpx
import asyncio
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime
import json
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(Enum):
    """Types of tasks the agent can perform"""
    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    BUG_FIX = "bug_fix"
    FEATURE_IMPLEMENTATION = "feature_implementation"
    DOCUMENTATION = "documentation"
    TESTING = "testing"
    REFACTORING = "refactoring"
    ANALYSIS = "analysis"
    DEPLOYMENT = "deployment"
    CUSTOM = "custom"


@dataclass
class CodegenAgentRequest:
    """Request structure for Codegen Agent API"""
    task_type: TaskType
    description: str
    repository_url: Optional[str] = None
    branch: Optional[str] = None
    files: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = None
    priority: int = 5  # 1-10 scale
    timeout_minutes: int = 30
    streaming: bool = True
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AgentResponse:
    """Response from Codegen Agent"""
    agent_id: str
    status: AgentStatus
    task_type: TaskType
    description: str
    created_at: datetime
    updated_at: datetime
    progress: float  # 0.0 to 1.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    logs: Optional[List[str]] = None
    artifacts: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, Any]] = None


@dataclass
class StreamingUpdate:
    """Real-time update from streaming agent"""
    agent_id: str
    timestamp: datetime
    event_type: str  # progress, log, result, error, completion
    data: Dict[str, Any]


class CodegenAgentClient:
    """Comprehensive client for Codegen Agent API"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("CODEGEN_API_KEY")
        self.base_url = base_url or os.getenv("CODEGEN_API_URL", "https://api.codegen.com")
        
        if not self.api_key:
            raise ValueError("CODEGEN_API_KEY environment variable is required")
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Agent-Run-Manager/1.0.0"
            },
            timeout=httpx.Timeout(60.0)
        )
        
        logger.info(f"Initialized Codegen Agent Client with base URL: {self.base_url}")
    
    async def create_agent_run(self, request: CodegenAgentRequest) -> AgentResponse:
        """Create a new agent run"""
        try:
            payload = {
                "task_type": request.task_type.value,
                "description": request.description,
                "repository_url": request.repository_url,
                "branch": request.branch,
                "files": request.files,
                "context": request.context,
                "priority": request.priority,
                "timeout_minutes": request.timeout_minutes,
                "streaming": request.streaming,
                "metadata": request.metadata or {}
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            logger.info(f"Creating agent run: {request.task_type.value} - {request.description[:100]}...")
            
            response = await self.client.post("/v1/agents/runs", json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            return AgentResponse(
                agent_id=data["agent_id"],
                status=AgentStatus(data["status"]),
                task_type=TaskType(data["task_type"]),
                description=data["description"],
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
                progress=data.get("progress", 0.0),
                result=data.get("result"),
                error=data.get("error"),
                logs=data.get("logs", []),
                artifacts=data.get("artifacts", []),
                metrics=data.get("metrics")
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error creating agent run: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error creating agent run: {e}")
            raise
    
    async def get_agent_run(self, agent_id: str) -> AgentResponse:
        """Get details of a specific agent run"""
        try:
            response = await self.client.get(f"/v1/agents/runs/{agent_id}")
            response.raise_for_status()
            
            data = response.json()
            
            return AgentResponse(
                agent_id=data["agent_id"],
                status=AgentStatus(data["status"]),
                task_type=TaskType(data["task_type"]),
                description=data["description"],
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
                progress=data.get("progress", 0.0),
                result=data.get("result"),
                error=data.get("error"),
                logs=data.get("logs", []),
                artifacts=data.get("artifacts", []),
                metrics=data.get("metrics")
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent run: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting agent run: {e}")
            raise
    
    async def list_agent_runs(
        self, 
        status: Optional[AgentStatus] = None,
        task_type: Optional[TaskType] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AgentResponse]:
        """List agent runs with optional filtering"""
        try:
            params = {
                "limit": limit,
                "offset": offset
            }
            
            if status:
                params["status"] = status.value
            if task_type:
                params["task_type"] = task_type.value
            
            response = await self.client.get("/v1/agents/runs", params=params)
            response.raise_for_status()
            
            data = response.json()
            runs = []
            
            for run_data in data.get("runs", []):
                runs.append(AgentResponse(
                    agent_id=run_data["agent_id"],
                    status=AgentStatus(run_data["status"]),
                    task_type=TaskType(run_data["task_type"]),
                    description=run_data["description"],
                    created_at=datetime.fromisoformat(run_data["created_at"]),
                    updated_at=datetime.fromisoformat(run_data["updated_at"]),
                    progress=run_data.get("progress", 0.0),
                    result=run_data.get("result"),
                    error=run_data.get("error"),
                    logs=run_data.get("logs", []),
                    artifacts=run_data.get("artifacts", []),
                    metrics=run_data.get("metrics")
                ))
            
            return runs
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error listing agent runs: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error listing agent runs: {e}")
            raise
    
    async def cancel_agent_run(self, agent_id: str) -> bool:
        """Cancel a running agent"""
        try:
            response = await self.client.post(f"/v1/agents/runs/{agent_id}/cancel")
            response.raise_for_status()
            
            logger.info(f"Successfully cancelled agent run: {agent_id}")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error cancelling agent run: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Error cancelling agent run: {e}")
            return False
    
    async def stream_agent_updates(self, agent_id: str) -> AsyncGenerator[StreamingUpdate, None]:
        """Stream real-time updates from an agent run"""
        try:
            async with self.client.stream(
                "GET", 
                f"/v1/agents/runs/{agent_id}/stream",
                headers={"Accept": "text/event-stream"}
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])  # Remove "data: " prefix
                            
                            yield StreamingUpdate(
                                agent_id=agent_id,
                                timestamp=datetime.fromisoformat(data["timestamp"]),
                                event_type=data["event_type"],
                                data=data["data"]
                            )
                            
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse streaming data: {line}")
                            continue
                        except KeyError as e:
                            logger.warning(f"Missing key in streaming data: {e}")
                            continue
                            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error streaming agent updates: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error streaming agent updates: {e}")
            raise
    
    async def get_agent_logs(self, agent_id: str, limit: int = 100) -> List[str]:
        """Get logs from an agent run"""
        try:
            response = await self.client.get(
                f"/v1/agents/runs/{agent_id}/logs",
                params={"limit": limit}
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get("logs", [])
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent logs: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting agent logs: {e}")
            raise
    
    async def get_agent_artifacts(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get artifacts (files, PRs, etc.) created by an agent run"""
        try:
            response = await self.client.get(f"/v1/agents/runs/{agent_id}/artifacts")
            response.raise_for_status()
            
            data = response.json()
            return data.get("artifacts", [])
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent artifacts: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting agent artifacts: {e}")
            raise
    
    async def get_agent_metrics(self, agent_id: str) -> Dict[str, Any]:
        """Get performance metrics from an agent run"""
        try:
            response = await self.client.get(f"/v1/agents/runs/{agent_id}/metrics")
            response.raise_for_status()
            
            data = response.json()
            return data.get("metrics", {})
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting agent metrics: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting agent metrics: {e}")
            raise
    
    async def health_check(self) -> bool:
        """Check if the Codegen API is healthy"""
        try:
            response = await self.client.get("/health")
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def get_api_info(self) -> Dict[str, Any]:
        """Get API information and capabilities"""
        try:
            response = await self.client.get("/v1/info")
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting API info: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting API info: {e}")
            raise
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Convenience functions for common operations
async def create_code_generation_task(
    description: str,
    repository_url: str,
    branch: str = "main",
    files: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None
) -> AgentResponse:
    """Create a code generation task"""
    async with CodegenAgentClient() as client:
        request = CodegenAgentRequest(
            task_type=TaskType.CODE_GENERATION,
            description=description,
            repository_url=repository_url,
            branch=branch,
            files=files,
            context=context
        )
        return await client.create_agent_run(request)


async def create_code_review_task(
    description: str,
    repository_url: str,
    branch: str = "main",
    files: Optional[List[str]] = None
) -> AgentResponse:
    """Create a code review task"""
    async with CodegenAgentClient() as client:
        request = CodegenAgentRequest(
            task_type=TaskType.CODE_REVIEW,
            description=description,
            repository_url=repository_url,
            branch=branch,
            files=files
        )
        return await client.create_agent_run(request)


async def create_bug_fix_task(
    description: str,
    repository_url: str,
    branch: str = "main",
    context: Optional[Dict[str, Any]] = None
) -> AgentResponse:
    """Create a bug fix task"""
    async with CodegenAgentClient() as client:
        request = CodegenAgentRequest(
            task_type=TaskType.BUG_FIX,
            description=description,
            repository_url=repository_url,
            branch=branch,
            context=context,
            priority=8  # Higher priority for bug fixes
        )
        return await client.create_agent_run(request)


# Global client instance for reuse
_global_client: Optional[CodegenAgentClient] = None


async def get_global_client() -> CodegenAgentClient:
    """Get or create global client instance"""
    global _global_client
    if _global_client is None:
        _global_client = CodegenAgentClient()
    return _global_client


async def cleanup_global_client():
    """Cleanup global client instance"""
    global _global_client
    if _global_client:
        await _global_client.close()
        _global_client = None
