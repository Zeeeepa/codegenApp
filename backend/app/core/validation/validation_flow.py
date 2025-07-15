"""
CodegenApp Validation Flow Orchestrator
Main orchestration engine for the validation pipeline with SWE-bench integration
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.core.monitoring import get_metrics_collector
from app.models.validation import (
    ValidationRequest,
    ValidationResult,
    ValidationStatus,
    ValidationStage,
    ValidationFlowStatus,
    StageResult,
    AutoMergeDecision
)
from app.core.validation.snapshot_manager import SnapshotManager
from app.core.workflow.deployment_executor import DeploymentExecutor
from app.services.adapters.gemini_adapter import GeminiAdapter
from app.services.web_eval_service import WebEvalService
from app.services.adapters.graph_sitter_adapter import GraphSitterAdapter
from app.core.workflow.merge_manager import MergeManager
from app.utils.exceptions import (
    ValidationException,
    ValidationTimeoutException,
    DeploymentException
)

logger = get_logger(__name__)
settings = get_settings()
metrics = get_metrics_collector()


class ValidationFlowOrchestrator:
    """
    Main orchestrator for validation flows
    
    Manages the complete validation pipeline from PR submission to auto-merge decision.
    Integrates SWE-bench patterns for robust testing and evaluation.
    """
    
    def __init__(self):
        self.active_flows: Dict[str, ValidationFlowStatus] = {}
        self.completed_flows: Dict[str, ValidationResult] = {}
        self.executor = ThreadPoolExecutor(max_workers=settings.validation.concurrent_limit)
        
        # Initialize service components
        self.snapshot_manager = SnapshotManager()
        self.deployment_executor = DeploymentExecutor()
        self.gemini_adapter = GeminiAdapter()
        self.web_eval_service = WebEvalService()
        self.graph_sitter_adapter = GraphSitterAdapter()
        self.merge_manager = MergeManager()
        
        logger.info("ValidationFlowOrchestrator initialized")
    
    async def run_validation(self, request: ValidationRequest) -> ValidationResult:
        """
        Run complete validation flow
        
        Executes all validation stages in sequence with proper error handling
        and progress tracking.
        """
        flow_id = request.flow_id
        start_time = datetime.utcnow()
        
        # Initialize flow status
        flow_status = ValidationFlowStatus(
            flow_id=flow_id,
            project_name=request.project_name,
            pr_number=request.pr_number,
            status=ValidationStatus.RUNNING,
            current_stage=ValidationStage.INITIALIZING,
            progress=0.0,
            started_at=start_time,
            updated_at=start_time
        )
        self.active_flows[flow_id] = flow_status
        
        # Initialize result
        result = ValidationResult(
            flow_id=flow_id,
            project_name=request.project_name,
            pr_number=request.pr_number,
            pr_url=request.pr_url,
            status=ValidationStatus.RUNNING,
            started_at=start_time
        )
        
        try:
            # Stage 1: Snapshot Creation
            await self._update_stage(flow_id, ValidationStage.SNAPSHOT_CREATION, 10.0)
            snapshot_result = await self._create_validation_snapshot(request)
            result.stages["snapshot_creation"] = snapshot_result
            
            # Stage 2: Codebase Cloning
            await self._update_stage(flow_id, ValidationStage.CODEBASE_CLONING, 20.0)
            clone_result = await self._clone_pr_codebase(request, snapshot_result.metadata.get("snapshot_id"))
            result.stages["codebase_cloning"] = clone_result
            
            # Stage 3: Deployment
            await self._update_stage(flow_id, ValidationStage.DEPLOYMENT, 35.0)
            deployment_result = await self._execute_deployment(request, clone_result.metadata.get("workspace_path"))
            result.stages["deployment"] = deployment_result
            result.deployment_success = deployment_result.success
            
            # Stage 4: Gemini Validation
            await self._update_stage(flow_id, ValidationStage.GEMINI_VALIDATION, 50.0)
            gemini_result = await self._run_gemini_validation(request, deployment_result)
            result.stages["gemini_validation"] = gemini_result
            result.gemini_validation_score = gemini_result.metadata.get("confidence_score", 0.0)
            
            # Stage 5: Web-Eval Testing
            await self._update_stage(flow_id, ValidationStage.WEB_EVAL_TESTING, 70.0)
            web_eval_result = await self._run_web_eval_testing(request, deployment_result)
            result.stages["web_eval_testing"] = web_eval_result
            result.web_eval_success = web_eval_result.success
            
            # Stage 6: Graph-Sitter Analysis
            await self._update_stage(flow_id, ValidationStage.GRAPH_SITTER_ANALYSIS, 85.0)
            graph_sitter_result = await self._run_graph_sitter_analysis(request, clone_result.metadata.get("workspace_path"))
            result.stages["graph_sitter_analysis"] = graph_sitter_result
            result.graph_sitter_analysis = graph_sitter_result.metadata
            
            # Stage 7: Auto-Merge Decision
            await self._update_stage(flow_id, ValidationStage.AUTO_MERGE_DECISION, 95.0)
            merge_decision = await self._make_auto_merge_decision(request, result)
            result.auto_merge_decision = merge_decision.decision
            result.auto_merge_reason = merge_decision.reason
            result.confidence_score = merge_decision.confidence
            
            # Stage 8: Cleanup
            await self._update_stage(flow_id, ValidationStage.CLEANUP, 100.0)
            await self._cleanup_validation_resources(request, snapshot_result.metadata.get("snapshot_id"))
            
            # Finalize result
            result.status = ValidationStatus.COMPLETED
            result.completed_at = datetime.utcnow()
            result.total_duration = (result.completed_at - result.started_at).total_seconds()
            
            # Generate recommendations
            result.recommendations = await self._generate_recommendations(result)
            
            logger.info(
                "Validation flow completed successfully",
                flow_id=flow_id,
                duration=result.total_duration,
                confidence_score=result.confidence_score
            )
            
        except ValidationTimeoutException as e:
            result.status = ValidationStatus.TIMEOUT
            result.error_messages.append(str(e))
            logger.error("Validation flow timed out", flow_id=flow_id, error=str(e))
            
        except Exception as e:
            result.status = ValidationStatus.FAILED
            result.error_messages.append(str(e))
            result.error_count += 1
            logger.error("Validation flow failed", flow_id=flow_id, error=str(e))
            
        finally:
            # Move from active to completed
            if flow_id in self.active_flows:
                del self.active_flows[flow_id]
            self.completed_flows[flow_id] = result
            
            # Record final metrics
            metrics.record_validation_complete(
                project=request.project_name,
                status=result.status.value,
                duration=result.total_duration,
                stage="complete"
            )
        
        return result
    
    async def get_status(self, flow_id: str) -> Optional[ValidationFlowStatus]:
        """Get current status of a validation flow"""
        return self.active_flows.get(flow_id)
    
    async def get_result(self, flow_id: str) -> Optional[ValidationResult]:
        """Get final result of a validation flow"""
        return self.completed_flows.get(flow_id)
    
    async def get_active_flows(self) -> List[ValidationFlowStatus]:
        """Get all active validation flows"""
        return list(self.active_flows.values())
    
    async def cancel_flow(self, flow_id: str) -> bool:
        """Cancel a running validation flow"""
        if flow_id not in self.active_flows:
            return False
        
        flow_status = self.active_flows[flow_id]
        flow_status.status = ValidationStatus.CANCELLED
        flow_status.updated_at = datetime.utcnow()
        
        # TODO: Implement actual cancellation logic for running stages
        
        logger.info("Validation flow cancelled", flow_id=flow_id)
        return True
    
    async def retry_flow(self, flow_id: str, from_stage: Optional[str] = None):
        """Retry a failed validation flow"""
        if flow_id not in self.completed_flows:
            raise ValidationException(f"Flow {flow_id} not found")
        
        original_result = self.completed_flows[flow_id]
        
        # Create new retry request
        retry_request = ValidationRequest(
            flow_id=f"{flow_id}_retry_{int(time.time())}",
            project_name=original_result.project_name,
            pr_number=original_result.pr_number,
            pr_url=original_result.pr_url,
            deployment_commands=[],  # TODO: Extract from original
            retry_count=1
        )
        
        # Start retry
        await self.run_validation(retry_request)
    
    async def update_flow_status(self, flow_id: str, status: str, error_message: Optional[str] = None):
        """Update flow status externally"""
        if flow_id in self.active_flows:
            flow_status = self.active_flows[flow_id]
            flow_status.status = ValidationStatus(status)
            flow_status.updated_at = datetime.utcnow()
            if error_message:
                flow_status.error_message = error_message
    
    # Private helper methods
    
    async def _update_stage(self, flow_id: str, stage: ValidationStage, progress: float):
        """Update current stage and progress"""
        if flow_id in self.active_flows:
            flow_status = self.active_flows[flow_id]
            flow_status.current_stage = stage
            flow_status.progress = progress
            flow_status.updated_at = datetime.utcnow()
            
            # Estimate completion time
            if progress > 0:
                elapsed = (datetime.utcnow() - flow_status.started_at).total_seconds()
                total_estimated = elapsed * (100.0 / progress)
                remaining = total_estimated - elapsed
                flow_status.estimated_completion = datetime.utcnow() + timedelta(seconds=remaining)
    
    async def _create_validation_snapshot(self, request: ValidationRequest) -> StageResult:
        """Create isolated validation environment snapshot"""
        start_time = datetime.utcnow()
        
        try:
            snapshot_id = await self.snapshot_manager.create_snapshot(
                project_name=request.project_name,
                tools_required=["git", "docker", "node", "python"]
            )
            
            return StageResult(
                stage=ValidationStage.SNAPSHOT_CREATION,
                status=ValidationStatus.COMPLETED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=True,
                metadata={"snapshot_id": snapshot_id}
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.SNAPSHOT_CREATION,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _clone_pr_codebase(self, request: ValidationRequest, snapshot_id: str) -> StageResult:
        """Clone PR codebase into validation environment"""
        start_time = datetime.utcnow()
        
        try:
            workspace_path = await self.snapshot_manager.clone_pr_to_snapshot(
                snapshot_id=snapshot_id,
                pr_url=request.pr_url,
                base_branch=request.base_branch
            )
            
            return StageResult(
                stage=ValidationStage.CODEBASE_CLONING,
                status=ValidationStatus.COMPLETED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=True,
                metadata={"workspace_path": workspace_path}
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.CODEBASE_CLONING,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _execute_deployment(self, request: ValidationRequest, workspace_path: str) -> StageResult:
        """Execute deployment commands"""
        start_time = datetime.utcnow()
        
        try:
            deployment_result = await self.deployment_executor.execute_commands(
                commands=request.deployment_commands,
                workspace_path=workspace_path,
                timeout=settings.deployment.timeout
            )
            
            return StageResult(
                stage=ValidationStage.DEPLOYMENT,
                status=ValidationStatus.COMPLETED if deployment_result.success else ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=deployment_result.success,
                output=deployment_result.stdout,
                error_message=deployment_result.stderr if not deployment_result.success else None,
                metadata={"exit_code": deployment_result.exit_code}
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.DEPLOYMENT,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _run_gemini_validation(self, request: ValidationRequest, deployment_result: StageResult) -> StageResult:
        """Run Gemini AI validation analysis"""
        start_time = datetime.utcnow()
        
        try:
            gemini_result = await self.gemini_adapter.validate_deployment(
                project_name=request.project_name,
                pr_url=request.pr_url,
                deployment_output=deployment_result.output,
                deployment_success=deployment_result.success
            )
            
            return StageResult(
                stage=ValidationStage.GEMINI_VALIDATION,
                status=ValidationStatus.COMPLETED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=gemini_result.success,
                metadata={
                    "confidence_score": gemini_result.confidence_score,
                    "analysis": gemini_result.analysis,
                    "recommendations": gemini_result.recommendations
                }
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.GEMINI_VALIDATION,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _run_web_eval_testing(self, request: ValidationRequest, deployment_result: StageResult) -> StageResult:
        """Run Web-Eval-Agent comprehensive testing"""
        start_time = datetime.utcnow()
        
        try:
            web_eval_result = await self.web_eval_service.run_comprehensive_tests(
                project_name=request.project_name,
                deployment_url=deployment_result.metadata.get("deployment_url"),
                test_config=request.validation_config.get("web_eval", {})
            )
            
            return StageResult(
                stage=ValidationStage.WEB_EVAL_TESTING,
                status=ValidationStatus.COMPLETED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=web_eval_result.success,
                metadata={
                    "tests_passed": web_eval_result.tests_passed,
                    "tests_failed": web_eval_result.tests_failed,
                    "coverage": web_eval_result.coverage_percentage,
                    "performance_metrics": web_eval_result.performance_metrics
                }
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.WEB_EVAL_TESTING,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _run_graph_sitter_analysis(self, request: ValidationRequest, workspace_path: str) -> StageResult:
        """Run Graph-Sitter code analysis"""
        start_time = datetime.utcnow()
        
        try:
            analysis_result = await self.graph_sitter_adapter.analyze_codebase(
                workspace_path=workspace_path,
                languages=settings.graph_sitter.supported_languages
            )
            
            return StageResult(
                stage=ValidationStage.GRAPH_SITTER_ANALYSIS,
                status=ValidationStatus.COMPLETED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=analysis_result.success,
                metadata={
                    "complexity_score": analysis_result.complexity_score,
                    "files_analyzed": analysis_result.files_analyzed,
                    "potential_issues": analysis_result.potential_issues,
                    "refactoring_suggestions": analysis_result.refactoring_suggestions
                }
            )
            
        except Exception as e:
            return StageResult(
                stage=ValidationStage.GRAPH_SITTER_ANALYSIS,
                status=ValidationStatus.FAILED,
                started_at=start_time,
                completed_at=datetime.utcnow(),
                success=False,
                error_message=str(e)
            )
    
    async def _make_auto_merge_decision(self, request: ValidationRequest, result: ValidationResult) -> AutoMergeDecision:
        """Make intelligent auto-merge decision"""
        return await self.merge_manager.make_decision(
            project_name=request.project_name,
            pr_number=request.pr_number,
            validation_result=result,
            auto_merge_enabled=request.auto_merge_enabled
        )
    
    async def _cleanup_validation_resources(self, request: ValidationRequest, snapshot_id: str):
        """Clean up validation resources"""
        try:
            await self.snapshot_manager.cleanup_snapshot(snapshot_id)
            logger.info("Validation resources cleaned up", snapshot_id=snapshot_id)
        except Exception as e:
            logger.error("Failed to cleanup validation resources", error=str(e))
    
    async def _generate_recommendations(self, result: ValidationResult) -> List[str]:
        """Generate actionable recommendations based on validation results"""
        recommendations = []
        
        # Deployment recommendations
        if not result.deployment_success:
            recommendations.append("Fix deployment issues before merging")
        
        # Code quality recommendations
        if result.gemini_validation_score < 0.7:
            recommendations.append("Consider improving code quality based on AI analysis")
        
        # Testing recommendations
        if not result.web_eval_success:
            recommendations.append("Address UI/UX issues found in web evaluation")
        
        # Complexity recommendations
        complexity_score = result.graph_sitter_analysis.get("complexity_score", 0)
        if complexity_score > 0.8:
            recommendations.append("Consider refactoring to reduce code complexity")
        
        return recommendations

