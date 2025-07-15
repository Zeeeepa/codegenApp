"""
Validation Flow Orchestrator

Orchestrates the complete validation pipeline from PR creation to auto-merge.
"""

import asyncio
from typing import Dict, Any, Optional, Callable, List
import logging
from dataclasses import dataclass
from enum import Enum
import time

from app.core.validation.snapshot_manager import get_snapshot_manager, ValidationSnapshot
from app.core.workflow.deployment_executor import get_deployment_executor, DeploymentResult
from app.services.adapters.gemini_adapter import get_gemini_adapter, ValidationAnalysis
from app.services.web_eval_service import get_web_eval_service, WebEvalResult
from app.core.workflow.merge_manager import get_merge_manager, MergeContext, MergeDecision
from app.services.adapters.codegen_adapter import CodegenService
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class ValidationStatus(Enum):
    """Validation flow status"""
    INITIALIZING = "initializing"
    SNAPSHOT_CREATING = "snapshot_creating"
    CODE_CLONING = "code_cloning"
    DEPLOYING = "deploying"
    DEPLOYMENT_VALIDATING = "deployment_validating"
    WEB_EVALUATING = "web_evaluating"
    ANALYZING_RESULTS = "analyzing_results"
    MERGE_EVALUATING = "merge_evaluating"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class ValidationFlowContext:
    """Context for validation flow execution"""
    project_name: str
    pr_number: int
    pr_url: str
    pr_branch: str
    repo_url: str
    deployment_commands: List[str]
    auto_merge_enabled: bool
    target_url: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    user_preferences: Dict[str, Any] = None


@dataclass
class ValidationFlowResult:
    """Result of validation flow execution"""
    success: bool
    status: ValidationStatus
    snapshot_id: Optional[str]
    deployment_results: List[DeploymentResult]
    deployment_analysis: Optional[ValidationAnalysis]
    web_eval_results: Optional[WebEvalResult]
    web_eval_analysis: Optional[ValidationAnalysis]
    merge_decision: Optional[MergeDecision]
    error_logs: List[str]
    duration: float
    retry_count: int


class ValidationFlowOrchestrator:
    """Orchestrates the complete validation pipeline"""
    
    def __init__(self):
        self.settings = get_settings()
        self.codegen_service = CodegenService(self.settings)
        self.snapshot_manager = get_snapshot_manager()
        self.deployment_executor = get_deployment_executor()
        self.gemini_adapter = get_gemini_adapter()
        self.web_eval_service = get_web_eval_service()
        self.merge_manager = get_merge_manager()
        
        self.active_flows: Dict[str, ValidationFlowContext] = {}
    
    async def start_validation_flow(
        self,
        flow_context: ValidationFlowContext,
        progress_callback: Optional[Callable[[ValidationStatus, str], None]] = None
    ) -> ValidationFlowResult:
        """Start the complete validation flow"""
        
        flow_id = f"flow_{flow_context.project_name}_{flow_context.pr_number}"
        self.active_flows[flow_id] = flow_context
        
        start_time = time.time()
        error_logs = []
        
        logger.info(f"Starting validation flow for PR {flow_context.pr_number}")
        
        try:
            # Phase 1: Create validation snapshot
            if progress_callback:
                progress_callback(ValidationStatus.SNAPSHOT_CREATING, "Creating validation environment")
            
            snapshot = await self._create_validation_snapshot(flow_context, error_logs)
            if not snapshot:
                return self._create_failed_result(
                    ValidationStatus.FAILED,
                    error_logs,
                    time.time() - start_time,
                    flow_context.retry_count
                )
            
            # Phase 2: Clone PR code
            if progress_callback:
                progress_callback(ValidationStatus.CODE_CLONING, "Cloning PR code")
            
            clone_success = await self._clone_pr_code(snapshot, flow_context, error_logs)
            if not clone_success:
                return self._create_failed_result(
                    ValidationStatus.FAILED,
                    error_logs,
                    time.time() - start_time,
                    flow_context.retry_count,
                    snapshot.snapshot_id
                )
            
            # Phase 3: Execute deployment
            if progress_callback:
                progress_callback(ValidationStatus.DEPLOYING, "Executing deployment commands")
            
            deployment_results = await self._execute_deployment(
                snapshot, 
                flow_context, 
                error_logs,
                progress_callback
            )
            
            # Phase 4: Validate deployment
            if progress_callback:
                progress_callback(ValidationStatus.DEPLOYMENT_VALIDATING, "Validating deployment")
            
            deployment_analysis = await self._validate_deployment(
                snapshot,
                deployment_results,
                flow_context,
                error_logs
            )
            
            # Check if deployment validation failed and handle retry
            if not deployment_analysis.success:
                return await self._handle_deployment_failure(
                    flow_context,
                    deployment_analysis,
                    error_logs,
                    time.time() - start_time,
                    snapshot.snapshot_id,
                    progress_callback
                )
            
            # Phase 5: Web evaluation
            if progress_callback:
                progress_callback(ValidationStatus.WEB_EVALUATING, "Running web evaluation tests")
            
            web_eval_results, web_eval_analysis = await self._run_web_evaluation(
                snapshot,
                flow_context,
                error_logs,
                progress_callback
            )
            
            # Check if web evaluation failed and handle retry
            if web_eval_analysis and not web_eval_analysis.success:
                return await self._handle_web_eval_failure(
                    flow_context,
                    web_eval_analysis,
                    error_logs,
                    time.time() - start_time,
                    snapshot.snapshot_id,
                    progress_callback
                )
            
            # Phase 6: Evaluate merge decision
            if progress_callback:
                progress_callback(ValidationStatus.MERGE_EVALUATING, "Evaluating merge decision")
            
            merge_decision = await self._evaluate_merge_decision(
                flow_context,
                deployment_analysis,
                web_eval_analysis,
                error_logs
            )
            
            # Phase 7: Execute merge decision
            await self._execute_merge_decision(flow_context, merge_decision, error_logs)
            
            # Success!
            if progress_callback:
                progress_callback(ValidationStatus.COMPLETED, "Validation flow completed successfully")
            
            return ValidationFlowResult(
                success=True,
                status=ValidationStatus.COMPLETED,
                snapshot_id=snapshot.snapshot_id,
                deployment_results=deployment_results,
                deployment_analysis=deployment_analysis,
                web_eval_results=web_eval_results,
                web_eval_analysis=web_eval_analysis,
                merge_decision=merge_decision,
                error_logs=error_logs,
                duration=time.time() - start_time,
                retry_count=flow_context.retry_count
            )
            
        except Exception as e:
            error_msg = f"Validation flow failed: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            
            if progress_callback:
                progress_callback(ValidationStatus.FAILED, error_msg)
            
            return self._create_failed_result(
                ValidationStatus.FAILED,
                error_logs,
                time.time() - start_time,
                flow_context.retry_count
            )
        finally:
            # Cleanup
            if flow_id in self.active_flows:
                del self.active_flows[flow_id]
    
    async def _create_validation_snapshot(
        self,
        flow_context: ValidationFlowContext,
        error_logs: List[str]
    ) -> Optional[ValidationSnapshot]:
        """Create validation snapshot"""
        
        try:
            snapshot = await self.snapshot_manager.create_snapshot(
                flow_context.project_name,
                flow_context.pr_number,
                flow_context.deployment_commands
            )
            
            logger.info(f"Validation snapshot created: {snapshot.snapshot_id}")
            return snapshot
            
        except Exception as e:
            error_msg = f"Failed to create validation snapshot: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            return None
    
    async def _clone_pr_code(
        self,
        snapshot: ValidationSnapshot,
        flow_context: ValidationFlowContext,
        error_logs: List[str]
    ) -> bool:
        """Clone PR code into snapshot"""
        
        try:
            success = await self.snapshot_manager.clone_pr_code(
                snapshot,
                flow_context.repo_url,
                flow_context.pr_branch
            )
            
            if success:
                logger.info(f"PR code cloned successfully for {snapshot.snapshot_id}")
            else:
                error_logs.append("Failed to clone PR code")
            
            return success
            
        except Exception as e:
            error_msg = f"Failed to clone PR code: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            return False
    
    async def _execute_deployment(
        self,
        snapshot: ValidationSnapshot,
        flow_context: ValidationFlowContext,
        error_logs: List[str],
        progress_callback: Optional[Callable[[ValidationStatus, str], None]] = None
    ) -> List[DeploymentResult]:
        """Execute deployment commands"""
        
        try:
            def deployment_progress(status: str, message: str):
                if progress_callback:
                    progress_callback(ValidationStatus.DEPLOYING, f"Deployment: {message}")
            
            deployment_results = await self.deployment_executor.execute_deployment(
                snapshot,
                flow_context.deployment_commands,
                deployment_progress
            )
            
            logger.info(f"Deployment executed for {snapshot.snapshot_id}")
            return deployment_results
            
        except Exception as e:
            error_msg = f"Deployment execution failed: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            return []
    
    async def _validate_deployment(
        self,
        snapshot: ValidationSnapshot,
        deployment_results: List[DeploymentResult],
        flow_context: ValidationFlowContext,
        error_logs: List[str]
    ) -> ValidationAnalysis:
        """Validate deployment using Gemini AI"""
        
        try:
            # Get deployment context
            deployment_context = await self.deployment_executor.validate_deployment_success(
                snapshot,
                deployment_results
            )
            
            # Analyze with Gemini
            analysis = await self.gemini_adapter.analyze_deployment_results(
                deployment_results,
                deployment_context,
                flow_context.project_name
            )
            
            logger.info(f"Deployment validation completed for {snapshot.snapshot_id}")
            return analysis
            
        except Exception as e:
            error_msg = f"Deployment validation failed: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            
            # Return failed analysis
            return ValidationAnalysis(
                success=False,
                confidence=0.0,
                summary="Deployment validation failed",
                issues=[{"type": "error", "description": error_msg, "severity": "high"}],
                recommendations=["Check deployment logs for details"]
            )
    
    async def _run_web_evaluation(
        self,
        snapshot: ValidationSnapshot,
        flow_context: ValidationFlowContext,
        error_logs: List[str],
        progress_callback: Optional[Callable[[ValidationStatus, str], None]] = None
    ) -> tuple[Optional[WebEvalResult], Optional[ValidationAnalysis]]:
        """Run web evaluation tests"""
        
        try:
            # Determine target URL
            target_url = flow_context.target_url or "http://localhost:3000"
            
            def web_eval_progress(status: str, message: str):
                if progress_callback:
                    progress_callback(ValidationStatus.WEB_EVALUATING, f"Web Eval: {message}")
            
            # Run web evaluation
            web_eval_results = await self.web_eval_service.run_web_evaluation(
                snapshot,
                target_url,
                progress_callback=web_eval_progress
            )
            
            # Analyze results with Gemini
            web_eval_analysis = await self.gemini_adapter.analyze_web_eval_results(
                {
                    "success": web_eval_results.success,
                    "test_count": web_eval_results.test_count,
                    "passed_tests": web_eval_results.passed_tests,
                    "failed_tests": web_eval_results.failed_tests,
                    "test_results": web_eval_results.test_results,
                    "performance_metrics": web_eval_results.performance_metrics
                },
                flow_context.project_name
            )
            
            logger.info(f"Web evaluation completed for {snapshot.snapshot_id}")
            return web_eval_results, web_eval_analysis
            
        except Exception as e:
            error_msg = f"Web evaluation failed: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            
            # Return failed results
            failed_analysis = ValidationAnalysis(
                success=False,
                confidence=0.0,
                summary="Web evaluation failed",
                issues=[{"type": "error", "description": error_msg, "severity": "high"}],
                recommendations=["Check web evaluation logs for details"]
            )
            
            return None, failed_analysis
    
    async def _evaluate_merge_decision(
        self,
        flow_context: ValidationFlowContext,
        deployment_analysis: ValidationAnalysis,
        web_eval_analysis: Optional[ValidationAnalysis],
        error_logs: List[str]
    ) -> MergeDecision:
        """Evaluate merge decision based on validation results"""
        
        try:
            merge_context = MergeContext(
                project_name=flow_context.project_name,
                pr_number=flow_context.pr_number,
                pr_url=flow_context.pr_url,
                validation_success=deployment_analysis.success and (web_eval_analysis.success if web_eval_analysis else True),
                deployment_success=deployment_analysis.success,
                web_eval_success=web_eval_analysis.success if web_eval_analysis else True,
                auto_merge_enabled=flow_context.auto_merge_enabled,
                validation_confidence=min(
                    deployment_analysis.confidence,
                    web_eval_analysis.confidence if web_eval_analysis else 1.0
                ),
                error_count=len(error_logs),
                retry_count=flow_context.retry_count,
                user_preferences=flow_context.user_preferences or {}
            )
            
            decision = await self.merge_manager.evaluate_merge_decision(merge_context)
            logger.info(f"Merge decision for PR {flow_context.pr_number}: {decision}")
            
            return decision
            
        except Exception as e:
            error_msg = f"Failed to evaluate merge decision: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
            
            # Default to manual review on error
            return MergeDecision.MANUAL_REVIEW
    
    async def _execute_merge_decision(
        self,
        flow_context: ValidationFlowContext,
        merge_decision: MergeDecision,
        error_logs: List[str]
    ):
        """Execute the merge decision"""
        
        try:
            merge_context = MergeContext(
                project_name=flow_context.project_name,
                pr_number=flow_context.pr_number,
                pr_url=flow_context.pr_url,
                validation_success=True,  # We only get here if validation succeeded
                deployment_success=True,
                web_eval_success=True,
                auto_merge_enabled=flow_context.auto_merge_enabled,
                validation_confidence=0.9,  # High confidence if we got this far
                error_count=len(error_logs),
                retry_count=flow_context.retry_count,
                user_preferences=flow_context.user_preferences or {}
            )
            
            merge_result = await self.merge_manager.execute_merge_decision(
                merge_context,
                merge_decision
            )
            
            logger.info(f"Merge decision executed for PR {flow_context.pr_number}: {merge_result.success}")
            
        except Exception as e:
            error_msg = f"Failed to execute merge decision: {str(e)}"
            error_logs.append(error_msg)
            logger.error(error_msg)
    
    async def _handle_deployment_failure(
        self,
        flow_context: ValidationFlowContext,
        deployment_analysis: ValidationAnalysis,
        error_logs: List[str],
        duration: float,
        snapshot_id: str,
        progress_callback: Optional[Callable[[ValidationStatus, str], None]] = None
    ) -> ValidationFlowResult:
        """Handle deployment failure with retry logic"""
        
        if flow_context.retry_count < flow_context.max_retries:
            # Send error context to Codegen API for fixes
            await self._send_error_context_to_codegen(
                flow_context,
                deployment_analysis,
                "deployment"
            )
            
            if progress_callback:
                progress_callback(
                    ValidationStatus.RETRYING,
                    f"Deployment failed, requesting fixes (retry {flow_context.retry_count + 1})"
                )
            
            return ValidationFlowResult(
                success=False,
                status=ValidationStatus.RETRYING,
                snapshot_id=snapshot_id,
                deployment_results=[],
                deployment_analysis=deployment_analysis,
                web_eval_results=None,
                web_eval_analysis=None,
                merge_decision=None,
                error_logs=error_logs,
                duration=duration,
                retry_count=flow_context.retry_count
            )
        else:
            # Max retries reached, create new session with all error contexts
            await self._create_new_session_with_error_context(flow_context, error_logs)
            
            return self._create_failed_result(
                ValidationStatus.FAILED,
                error_logs,
                duration,
                flow_context.retry_count,
                snapshot_id
            )
    
    async def _handle_web_eval_failure(
        self,
        flow_context: ValidationFlowContext,
        web_eval_analysis: ValidationAnalysis,
        error_logs: List[str],
        duration: float,
        snapshot_id: str,
        progress_callback: Optional[Callable[[ValidationStatus, str], None]] = None
    ) -> ValidationFlowResult:
        """Handle web evaluation failure with retry logic"""
        
        # Send error context to Codegen API for fixes
        await self._send_error_context_to_codegen(
            flow_context,
            web_eval_analysis,
            "web_evaluation"
        )
        
        if progress_callback:
            progress_callback(
                ValidationStatus.RETRYING,
                "Web evaluation failed, requesting PR updates"
            )
        
        return ValidationFlowResult(
            success=False,
            status=ValidationStatus.RETRYING,
            snapshot_id=snapshot_id,
            deployment_results=[],
            deployment_analysis=None,
            web_eval_results=None,
            web_eval_analysis=web_eval_analysis,
            merge_decision=None,
            error_logs=error_logs,
            duration=duration,
            retry_count=flow_context.retry_count
        )
    
    async def _send_error_context_to_codegen(
        self,
        flow_context: ValidationFlowContext,
        analysis: ValidationAnalysis,
        failure_type: str
    ):
        """Send error context to Codegen API for automatic fixes"""
        
        try:
            error_context = f"""
{failure_type.title()} validation failed for PR #{flow_context.pr_number}.

Error Summary: {analysis.summary}

Issues Found:
{chr(10).join([f"- {issue.get('description', 'Unknown issue')}" for issue in analysis.issues])}

Suggested Fixes:
{chr(10).join([f"- {fix}" for fix in (analysis.suggested_fixes or [])])}

Please update the PR with code changes to resolve these issues.
"""
            
            # This would send the error context to Codegen API as a continuation
            logger.info(f"Sending error context to Codegen API for PR {flow_context.pr_number}")
            
            # Mock implementation - would actually call Codegen API
            # await self.codegen_service.continue_conversation(
            #     run_id=flow_context.codegen_run_id,
            #     message=error_context
            # )
            
        except Exception as e:
            logger.error(f"Failed to send error context to Codegen API: {e}")
    
    async def _create_new_session_with_error_context(
        self,
        flow_context: ValidationFlowContext,
        error_logs: List[str]
    ):
        """Create new Codegen session with all error contexts"""
        
        try:
            all_errors = "\n".join(error_logs)
            new_session_message = f"""
Original request failed after {flow_context.max_retries} retry attempts.

All Error Contexts:
{all_errors}

Please create a new implementation that addresses all these issues.
"""
            
            logger.info(f"Creating new Codegen session for PR {flow_context.pr_number}")
            
            # Mock implementation - would actually call Codegen API
            # await self.codegen_service.create_new_run(
            #     project=flow_context.project_name,
            #     message=new_session_message
            # )
            
        except Exception as e:
            logger.error(f"Failed to create new Codegen session: {e}")
    
    def _create_failed_result(
        self,
        status: ValidationStatus,
        error_logs: List[str],
        duration: float,
        retry_count: int,
        snapshot_id: Optional[str] = None
    ) -> ValidationFlowResult:
        """Create failed validation result"""
        
        return ValidationFlowResult(
            success=False,
            status=status,
            snapshot_id=snapshot_id,
            deployment_results=[],
            deployment_analysis=None,
            web_eval_results=None,
            web_eval_analysis=None,
            merge_decision=None,
            error_logs=error_logs,
            duration=duration,
            retry_count=retry_count
        )
    
    def get_active_flows(self) -> List[ValidationFlowContext]:
        """Get list of active validation flows"""
        return list(self.active_flows.values())
    
    def cancel_flow(self, project_name: str, pr_number: int):
        """Cancel an active validation flow"""
        flow_id = f"flow_{project_name}_{pr_number}"
        if flow_id in self.active_flows:
            del self.active_flows[flow_id]
            logger.info(f"Validation flow cancelled: {flow_id}")


# Global validation flow orchestrator instance
_validation_flow_orchestrator = None

def get_validation_flow_orchestrator() -> ValidationFlowOrchestrator:
    """Get the global validation flow orchestrator instance"""
    global _validation_flow_orchestrator
    if _validation_flow_orchestrator is None:
        _validation_flow_orchestrator = ValidationFlowOrchestrator()
    return _validation_flow_orchestrator

