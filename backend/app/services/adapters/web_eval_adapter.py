"""
Web-Eval-Agent Service Adapter

This adapter provides integration with the Web-Eval-Agent service for UI testing
and browser automation validation.
"""

import asyncio
import logging
import subprocess
import tempfile
import os
from typing import Dict, Any, Optional, List
from pathlib import Path

from app.core.orchestration.coordinator import ServiceAdapter
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class WebEvalValidationRequest:
    """Request model for Web-Eval-Agent validation"""
    
    def __init__(
        self,
        project_url: str,
        test_scenarios: List[str],
        deployment_url: Optional[str] = None,
        setup_commands: Optional[List[str]] = None,
        environment_vars: Optional[Dict[str, str]] = None
    ):
        self.project_url = project_url
        self.test_scenarios = test_scenarios
        self.deployment_url = deployment_url
        self.setup_commands = setup_commands or []
        self.environment_vars = environment_vars or {}


class WebEvalValidationResult:
    """Result model for Web-Eval-Agent validation"""
    
    def __init__(
        self,
        success: bool,
        test_results: List[Dict[str, Any]],
        error_message: Optional[str] = None,
        logs: Optional[str] = None,
        screenshots: Optional[List[str]] = None
    ):
        self.success = success
        self.test_results = test_results
        self.error_message = error_message
        self.logs = logs
        self.screenshots = screenshots or []


class WebEvalAdapter(ServiceAdapter):
    """Service adapter for Web-Eval-Agent integration"""
    
    def __init__(self):
        self.settings = get_settings()
        self.gemini_api_key = self.settings.gemini_api_key
        self.service_name = "web-eval-agent"
        
    async def is_healthy(self) -> bool:
        """Check if Web-Eval-Agent service is available"""
        try:
            # Check if we have the required API key
            if not self.gemini_api_key:
                logger.error("Gemini API key not configured")
                return False
                
            # Try to run a simple web-eval-agent command to check availability
            result = await self._run_command(["python", "--version"], timeout=5)
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Web-Eval-Agent health check failed: {e}")
            return False
    
    async def validate_deployment(
        self, 
        request: WebEvalValidationRequest
    ) -> WebEvalValidationResult:
        """
        Validate a deployment using Web-Eval-Agent
        
        Args:
            request: Validation request with project details and test scenarios
            
        Returns:
            WebEvalValidationResult with validation results
        """
        try:
            logger.info(f"Starting Web-Eval-Agent validation for {request.project_url}")
            
            # Create temporary directory for the validation
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Clone the Web-Eval-Agent repository
                await self._clone_web_eval_agent(temp_path)
                
                # Set up environment variables
                env_vars = {
                    "GEMINI_API_KEY": self.gemini_api_key,
                    **request.environment_vars
                }
                
                # Run validation tests
                validation_result = await self._run_validation_tests(
                    temp_path,
                    request,
                    env_vars
                )
                
                return validation_result
                
        except Exception as e:
            logger.error(f"Web-Eval-Agent validation failed: {e}")
            return WebEvalValidationResult(
                success=False,
                test_results=[],
                error_message=str(e)
            )
    
    async def validate_ui_components(
        self,
        deployment_url: str,
        test_scenarios: List[str],
        environment_vars: Optional[Dict[str, str]] = None
    ) -> WebEvalValidationResult:
        """
        Validate UI components and interactions
        
        Args:
            deployment_url: URL of the deployed application
            test_scenarios: List of test scenarios to validate
            environment_vars: Additional environment variables
            
        Returns:
            WebEvalValidationResult with UI validation results
        """
        request = WebEvalValidationRequest(
            project_url=deployment_url,
            test_scenarios=test_scenarios,
            deployment_url=deployment_url,
            environment_vars=environment_vars or {}
        )
        
        return await self.validate_deployment(request)
    
    async def _clone_web_eval_agent(self, temp_path: Path) -> None:
        """Clone the Web-Eval-Agent repository"""
        web_eval_path = temp_path / "web-eval-agent"
        
        clone_cmd = [
            "git", "clone", 
            "https://github.com/zeeeepa/web-eval-agent.git",
            str(web_eval_path)
        ]
        
        result = await self._run_command(clone_cmd, timeout=60)
        if result.returncode != 0:
            raise Exception(f"Failed to clone Web-Eval-Agent: {result.stderr}")
        
        logger.info("Successfully cloned Web-Eval-Agent repository")
    
    async def _run_validation_tests(
        self,
        temp_path: Path,
        request: WebEvalValidationRequest,
        env_vars: Dict[str, str]
    ) -> WebEvalValidationResult:
        """Run validation tests using Web-Eval-Agent"""
        web_eval_path = temp_path / "web-eval-agent"
        
        # Create test configuration
        test_config = {
            "target_url": request.deployment_url or request.project_url,
            "test_scenarios": request.test_scenarios,
            "gemini_api_key": self.gemini_api_key
        }
        
        # Write test configuration to file
        config_file = web_eval_path / "test_config.json"
        import json
        with open(config_file, 'w') as f:
            json.dump(test_config, f, indent=2)
        
        # Run Web-Eval-Agent validation
        validation_cmd = [
            "python", "main.py",
            "--config", str(config_file),
            "--output", "validation_results.json"
        ]
        
        result = await self._run_command(
            validation_cmd,
            cwd=web_eval_path,
            env=env_vars,
            timeout=300  # 5 minutes timeout
        )
        
        # Parse results
        results_file = web_eval_path / "validation_results.json"
        if results_file.exists():
            with open(results_file, 'r') as f:
                results_data = json.load(f)
            
            return WebEvalValidationResult(
                success=results_data.get("success", False),
                test_results=results_data.get("test_results", []),
                logs=result.stdout,
                error_message=results_data.get("error_message") if not results_data.get("success") else None
            )
        else:
            return WebEvalValidationResult(
                success=False,
                test_results=[],
                error_message=f"Validation failed: {result.stderr}",
                logs=result.stdout
            )
    
    async def _run_command(
        self,
        cmd: List[str],
        cwd: Optional[Path] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: int = 30
    ) -> subprocess.CompletedProcess:
        """Run a command asynchronously"""
        
        # Prepare environment
        full_env = os.environ.copy()
        if env:
            full_env.update(env)
        
        # Run command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd,
            env=full_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=process.returncode,
                stdout=stdout.decode('utf-8') if stdout else '',
                stderr=stderr.decode('utf-8') if stderr else ''
            )
            
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise Exception(f"Command timed out after {timeout} seconds: {' '.join(cmd)}")
    
    async def get_service_info(self) -> Dict[str, Any]:
        """Get service information"""
        return {
            "service_name": self.service_name,
            "version": "1.0.0",
            "status": "healthy" if await self.is_healthy() else "unhealthy",
            "gemini_api_configured": bool(self.gemini_api_key),
            "capabilities": [
                "ui_validation",
                "browser_automation",
                "component_testing",
                "flow_validation"
            ]
        }
