"""
Grainchain Webhook Service - Enhanced grainchain integration with webhook support
Handles PR validation requests from Cloudflare Workers
"""

import asyncio
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


@dataclass
class ValidationRequest:
    """PR validation request from webhook"""
    project_id: str
    pr_number: int
    pr_url: str
    head_sha: str
    base_sha: str
    webhook_url: str
    created_at: datetime
    status: str = "pending"
    validation_id: Optional[str] = None
    sandbox_id: Optional[str] = None
    results: Optional[Dict[str, Any]] = None


class ValidationResult(BaseModel):
    """Validation result model"""
    validation_id: str
    project_id: str
    pr_number: int
    status: str = Field(..., description="pending, running, completed, failed")
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    sandbox_id: Optional[str] = None


class GrainchainWebhookService:
    """Enhanced grainchain service with webhook validation support"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))
        
        # In-memory storage for validation requests (in production, use database)
        self.active_validations: Dict[str, ValidationRequest] = {}
        self.validation_history: List[ValidationRequest] = []
        
        # Configuration
        self.max_concurrent_validations = config.get("max_concurrent_validations", 5)
        self.validation_timeout = config.get("validation_timeout", 600)  # 10 minutes
        self.cleanup_interval = config.get("cleanup_interval", 3600)  # 1 hour
        
        # Start background cleanup task
        asyncio.create_task(self._cleanup_old_validations())
    
    async def trigger_validation(self, request_data: Dict[str, Any]) -> ValidationResult:
        """Trigger grainchain validation for a PR"""
        
        # Generate validation ID
        validation_id = f"val_{request_data['project_id'].replace('/', '_')}_{request_data['pr_number']}_{int(datetime.utcnow().timestamp())}"
        
        # Create validation request
        validation_request = ValidationRequest(
            project_id=request_data["project_id"],
            pr_number=request_data["pr_number"],
            pr_url=request_data["pr_url"],
            head_sha=request_data["head_sha"],
            base_sha=request_data["base_sha"],
            webhook_url=request_data["webhook_url"],
            created_at=datetime.utcnow(),
            validation_id=validation_id
        )
        
        # Check concurrent validation limits
        active_count = len([v for v in self.active_validations.values() if v.status in ["pending", "running"]])
        if active_count >= self.max_concurrent_validations:
            logger.warning(f"Max concurrent validations ({self.max_concurrent_validations}) reached")
            validation_request.status = "failed"
            validation_request.results = {"error": "Max concurrent validations reached"}
            return self._validation_request_to_result(validation_request)
        
        # Store validation request
        self.active_validations[validation_id] = validation_request
        
        # Start validation process in background
        asyncio.create_task(self._process_validation(validation_request))
        
        logger.info(f"🚀 Started validation {validation_id} for PR #{request_data['pr_number']}")
        
        return self._validation_request_to_result(validation_request)
    
    async def get_validation_status(self, validation_id: str) -> Optional[ValidationResult]:
        """Get validation status by ID"""
        validation_request = self.active_validations.get(validation_id)
        if not validation_request:
            # Check history
            for historical in self.validation_history:
                if historical.validation_id == validation_id:
                    return self._validation_request_to_result(historical)
            return None
        
        return self._validation_request_to_result(validation_request)
    
    async def list_project_validations(self, project_id: str, limit: int = 10) -> List[ValidationResult]:
        """List validations for a specific project"""
        project_validations = []
        
        # Get from active validations
        for validation in self.active_validations.values():
            if validation.project_id == project_id:
                project_validations.append(self._validation_request_to_result(validation))
        
        # Get from history
        for validation in self.validation_history:
            if validation.project_id == project_id:
                project_validations.append(self._validation_request_to_result(validation))
        
        # Sort by created_at descending and limit
        project_validations.sort(key=lambda x: x.started_at or datetime.min, reverse=True)
        return project_validations[:limit]
    
    async def cancel_validation(self, validation_id: str) -> bool:
        """Cancel a running validation"""
        validation_request = self.active_validations.get(validation_id)
        if not validation_request:
            return False
        
        if validation_request.status in ["completed", "failed"]:
            return False
        
        # Cancel sandbox if exists
        if validation_request.sandbox_id:
            try:
                await self._destroy_sandbox(validation_request.sandbox_id)
            except Exception as e:
                logger.error(f"Failed to destroy sandbox {validation_request.sandbox_id}: {e}")
        
        # Update status
        validation_request.status = "cancelled"
        validation_request.results = {"cancelled_at": datetime.utcnow().isoformat()}
        
        # Move to history
        self.validation_history.append(validation_request)
        del self.active_validations[validation_id]
        
        logger.info(f"❌ Cancelled validation {validation_id}")
        return True
    
    async def _process_validation(self, validation_request: ValidationRequest):
        """Process validation in background"""
        try:
            validation_request.status = "running"
            
            # Step 1: Create sandbox for validation
            logger.info(f"📦 Creating sandbox for validation {validation_request.validation_id}")
            
            sandbox_id = await self._create_sandbox(validation_request)
            validation_request.sandbox_id = sandbox_id
            
            # Step 2: Wait for sandbox to be ready
            await self._wait_for_sandbox_ready(sandbox_id)
            
            # Step 3: Run validation tests
            logger.info(f"🧪 Running validation tests for {validation_request.validation_id}")
            
            test_results = await self._run_validation_tests(validation_request)
            
            # Step 4: Collect results
            validation_request.status = "completed"
            validation_request.results = {
                "test_results": test_results,
                "sandbox_id": validation_request.sandbox_id,
                "completed_at": datetime.utcnow().isoformat(),
                "success": test_results.get("overall_success", False)
            }
            
            # Step 5: Send webhook notification
            await self._send_webhook_notification(validation_request)
            
            # Step 6: Cleanup sandbox
            await self._cleanup_validation_sandbox(validation_request)
            
            logger.info(f"✅ Completed validation {validation_request.validation_id}")
            
        except Exception as e:
            logger.error(f"❌ Validation {validation_request.validation_id} failed: {e}")
            
            validation_request.status = "failed"
            validation_request.results = {
                "error": str(e),
                "failed_at": datetime.utcnow().isoformat()
            }
            
            # Send failure notification
            await self._send_webhook_notification(validation_request)
            
            # Cleanup sandbox if created
            if validation_request.sandbox_id:
                await self._cleanup_validation_sandbox(validation_request)
        
        finally:
            # Move to history after completion
            self.validation_history.append(validation_request)
            if validation_request.validation_id in self.active_validations:
                del self.active_validations[validation_request.validation_id]
    
    async def _create_sandbox(self, validation_request: ValidationRequest) -> str:
        """Create sandbox for PR validation"""
        # Mock implementation - replace with actual grainchain integration
        sandbox_config = {
            "name": f"pr-validation-{validation_request.pr_number}",
            "image": "ubuntu:latest",
            "environment": {
                "PR_NUMBER": str(validation_request.pr_number),
                "HEAD_SHA": validation_request.head_sha,
                "BASE_SHA": validation_request.base_sha,
                "PROJECT_ID": validation_request.project_id
            },
            "timeout": self.validation_timeout
        }
        
        # Simulate sandbox creation
        await asyncio.sleep(2)
        sandbox_id = f"sandbox_{validation_request.validation_id}"
        
        logger.info(f"Created sandbox {sandbox_id} for validation {validation_request.validation_id}")
        return sandbox_id
    
    async def _wait_for_sandbox_ready(self, sandbox_id: str):
        """Wait for sandbox to be ready"""
        # Mock implementation
        await asyncio.sleep(3)
        logger.info(f"Sandbox {sandbox_id} is ready")
    
    async def _run_validation_tests(self, validation_request: ValidationRequest) -> Dict[str, Any]:
        """Run validation tests in sandbox"""
        # Mock implementation - replace with actual test execution
        await asyncio.sleep(10)  # Simulate test execution
        
        # Mock test results
        test_results = {
            "overall_success": True,
            "tests_run": 15,
            "tests_passed": 14,
            "tests_failed": 1,
            "coverage": 85.5,
            "build_success": True,
            "lint_issues": 2,
            "security_issues": 0,
            "performance_score": 92,
            "details": {
                "unit_tests": {"passed": 10, "failed": 0},
                "integration_tests": {"passed": 4, "failed": 1},
                "build_time": 45.2,
                "bundle_size": "2.3MB"
            }
        }
        
        return test_results
    
    async def _send_webhook_notification(self, validation_request: ValidationRequest):
        """Send webhook notification about validation status"""
        try:
            notification_data = {
                "validation_id": validation_request.validation_id,
                "project_id": validation_request.project_id,
                "pr_number": validation_request.pr_number,
                "status": validation_request.status,
                "results": validation_request.results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send to webhook URL
            response = await self.client.post(
                validation_request.webhook_url,
                json=notification_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Sent webhook notification for {validation_request.validation_id}")
            else:
                logger.warning(f"Webhook notification failed with status {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
    
    async def _cleanup_validation_sandbox(self, validation_request: ValidationRequest):
        """Cleanup validation sandbox"""
        if validation_request.sandbox_id:
            try:
                await self._destroy_sandbox(validation_request.sandbox_id)
                logger.info(f"Cleaned up sandbox {validation_request.sandbox_id}")
            except Exception as e:
                logger.error(f"Failed to cleanup sandbox {validation_request.sandbox_id}: {e}")
    
    async def _destroy_sandbox(self, sandbox_id: str):
        """Destroy a sandbox"""
        # Mock implementation
        await asyncio.sleep(1)
        logger.info(f"Destroyed sandbox {sandbox_id}")
    
    async def _cleanup_old_validations(self):
        """Background task to cleanup old validation records"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                
                # Remove old history entries
                self.validation_history = [
                    v for v in self.validation_history 
                    if v.created_at > cutoff_time
                ]
                
                logger.debug(f"Cleaned up old validation records, {len(self.validation_history)} remaining")
                
            except Exception as e:
                logger.error(f"Error in validation cleanup: {e}")
    
    def _validation_request_to_result(self, validation_request: ValidationRequest) -> ValidationResult:
        """Convert ValidationRequest to ValidationResult"""
        return ValidationResult(
            validation_id=validation_request.validation_id,
            project_id=validation_request.project_id,
            pr_number=validation_request.pr_number,
            status=validation_request.status,
            results=validation_request.results,
            error=validation_request.results.get("error") if validation_request.results else None,
            started_at=validation_request.created_at,
            completed_at=datetime.fromisoformat(validation_request.results.get("completed_at")) if validation_request.results and validation_request.results.get("completed_at") else None,
            sandbox_id=validation_request.sandbox_id
        )

