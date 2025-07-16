"""
Codegen API service integration.

Provides integration with the Codegen API for agent runs,
code generation, and problem-solving within the CI/CD system.
"""

import os
import asyncio
import aiohttp
from typing import Dict, Any, Optional
from datetime import datetime


class CodegenService:
    """
    Service for integrating with Codegen API.
    
    Handles agent run execution, continuation, and response processing
    for the CI/CD workflow system.
    """
    
    def __init__(self):
        self.api_url = os.getenv("CODEGEN_API_URL", "https://api.codegen.com")
        self.api_key = os.getenv("CODEGEN_API_KEY")
        self.org_id = os.getenv("CODEGEN_ORG_ID")
        self.user_id = os.getenv("CODEGEN_USER_ID")
        
        if not self.api_key:
            raise ValueError("CODEGEN_API_KEY environment variable is required")
        if not self.org_id:
            raise ValueError("CODEGEN_ORG_ID environment variable is required")
    
    async def execute_agent_run(
        self,
        context_prompt: str,
        project_id: str,
        run_id: str,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Execute a new agent run via Codegen API.
        
        Args:
            context_prompt: Full context prompt for the agent
            project_id: ID of the project
            run_id: ID of the agent run for tracking
            timeout: Request timeout in seconds
            
        Returns:
            dict: Agent execution response
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Organization-ID": self.org_id,
            "X-User-ID": self.user_id or "",
            "X-Request-ID": run_id
        }
        
        payload = {
            "prompt": context_prompt,
            "project_context": {
                "project_id": project_id,
                "run_id": run_id
            },
            "settings": {
                "timeout": timeout,
                "max_tokens": 4000,
                "temperature": 0.7
            }
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            try:
                async with session.post(
                    f"{self.api_url}/v1/agent/run",
                    headers=headers,
                    json=payload
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._process_agent_response(result)
                    else:
                        error_text = await response.text()
                        raise Exception(f"Codegen API error ({response.status}): {error_text}")
                        
            except asyncio.TimeoutError:
                raise Exception(f"Codegen API request timed out after {timeout} seconds")
            except aiohttp.ClientError as e:
                raise Exception(f"Codegen API client error: {str(e)}")
    
    async def continue_agent_run(
        self,
        run_id: str,
        continuation_text: str,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Continue an existing agent run with additional input.
        
        Args:
            run_id: ID of the agent run to continue
            continuation_text: Additional input text
            timeout: Request timeout in seconds
            
        Returns:
            dict: Agent continuation response
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Organization-ID": self.org_id,
            "X-User-ID": self.user_id or "",
            "X-Request-ID": run_id
        }
        
        payload = {
            "run_id": run_id,
            "continuation": continuation_text,
            "settings": {
                "timeout": timeout,
                "max_tokens": 4000,
                "temperature": 0.7
            }
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            try:
                async with session.post(
                    f"{self.api_url}/v1/agent/continue",
                    headers=headers,
                    json=payload
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        return self._process_agent_response(result)
                    else:
                        error_text = await response.text()
                        raise Exception(f"Codegen API error ({response.status}): {error_text}")
                        
            except asyncio.TimeoutError:
                raise Exception(f"Codegen API request timed out after {timeout} seconds")
            except aiohttp.ClientError as e:
                raise Exception(f"Codegen API client error: {str(e)}")
    
    async def get_agent_run_status(self, run_id: str) -> Dict[str, Any]:
        """
        Get the status of an agent run.
        
        Args:
            run_id: ID of the agent run
            
        Returns:
            dict: Agent run status
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Organization-ID": self.org_id,
            "X-User-ID": self.user_id or ""
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{self.api_url}/v1/agent/run/{run_id}/status",
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 404:
                        raise ValueError(f"Agent run {run_id} not found")
                    else:
                        error_text = await response.text()
                        raise Exception(f"Codegen API error ({response.status}): {error_text}")
                        
            except aiohttp.ClientError as e:
                raise Exception(f"Codegen API client error: {str(e)}")
    
    async def cancel_agent_run(self, run_id: str) -> bool:
        """
        Cancel a running agent run.
        
        Args:
            run_id: ID of the agent run to cancel
            
        Returns:
            bool: True if cancelled successfully
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Organization-ID": self.org_id,
            "X-User-ID": self.user_id or ""
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.api_url}/v1/agent/run/{run_id}/cancel",
                    headers=headers
                ) as response:
                    
                    return response.status == 200
                    
            except aiohttp.ClientError:
                return False
    
    def _process_agent_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and normalize agent response.
        
        Args:
            response: Raw agent response
            
        Returns:
            dict: Processed response
        """
        # Extract key information from response
        processed = {
            "content": response.get("content", ""),
            "status": response.get("status", "completed"),
            "metadata": response.get("metadata", {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check for PR creation indicators
        content = processed["content"].lower()
        if any(indicator in content for indicator in ["pull request", "pr created", "github.com", "/pull/"]):
            processed["pr_url"] = self._extract_pr_url(processed["content"])
            processed["type"] = "pr"
        
        # Check for plan indicators
        elif any(indicator in content for indicator in ["plan:", "steps:", "confirm", "proceed"]):
            processed["type"] = "plan"
            processed["plan_content"] = self._extract_plan_content(processed["content"])
        
        # Default to regular response
        else:
            processed["type"] = "regular"
        
        # Extract any error information
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
        pr_pattern = r'https://github\.com/[^/]+/[^/]+/pull/\d+'
        match = re.search(pr_pattern, content)
        
        if match:
            return match.group(0)
        
        # Look for other PR URL patterns
        pr_patterns = [
            r'https://[^/]+/[^/]+/[^/]+/pull/\d+',
            r'https://[^/]+/[^/]+/[^/]+/merge_requests/\d+'
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
        # Simple plan extraction - can be enhanced with more sophisticated parsing
        lines = content.split('\n')
        plan_lines = []
        in_plan = False
        
        for line in lines:
            line = line.strip()
            if any(indicator in line.lower() for indicator in ["plan:", "steps:", "approach:"]):
                in_plan = True
                continue
            
            if in_plan and line:
                if line.startswith(('1.', '2.', '3.', '-', '*')):
                    plan_lines.append(line)
                elif not line.startswith(('4.', '5.', '6.', '7.', '8.', '9.')):
                    # Stop if we hit non-plan content
                    break
        
        return {
            "steps": plan_lines,
            "summary": content[:200] + "..." if len(content) > 200 else content
        }
    
    async def health_check(self) -> bool:
        """
        Check if Codegen API is accessible.
        
        Returns:
            bool: True if API is accessible
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Organization-ID": self.org_id
        }
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(
                    f"{self.api_url}/v1/health",
                    headers=headers
                ) as response:
                    return response.status == 200
        except:
            return False
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Get service configuration information.
        
        Returns:
            dict: Service information (without sensitive data)
        """
        return {
            "api_url": self.api_url,
            "org_id": self.org_id,
            "user_id": self.user_id,
            "has_api_key": bool(self.api_key),
            "service_name": "codegen_service",
            "version": "1.0.0"
        }

