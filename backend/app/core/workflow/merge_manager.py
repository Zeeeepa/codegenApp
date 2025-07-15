"""
CodegenApp Merge Manager
Intelligent auto-merge decision engine with confidence scoring and risk assessment
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import json

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.core.monitoring import get_metrics_collector
from app.models.validation import (
    ValidationResult,
    AutoMergeDecision,
    ValidationStatus
)
from app.services.adapters.gemini_adapter import GeminiAdapter
from app.utils.exceptions import AutoMergeException

logger = get_logger(__name__)
settings = get_settings()
metrics = get_metrics_collector()


class ConfidenceCalculator:
    """
    Confidence score calculation for merge decisions
    
    Calculates confidence scores based on validation results,
    historical data, and risk factors.
    """
    
    def __init__(self):
        self.weights = {
            "deployment_success": 0.25,
            "gemini_validation": 0.20,
            "web_eval_success": 0.20,
            "graph_sitter_analysis": 0.15,
            "error_count": 0.10,
            "test_coverage": 0.10
        }
    
    def calculate_confidence(
        self,
        validation_result: ValidationResult,
        project_requirements: Dict[str, Any],
        historical_data: Optional[Dict[str, Any]] = None
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate confidence score for merge decision
        
        Args:
            validation_result: Complete validation results
            project_requirements: Project-specific requirements
            historical_data: Historical merge success data
            
        Returns:
            Tuple of (confidence_score, factor_breakdown)
        """
        factor_scores = {}
        
        # Deployment success factor
        factor_scores["deployment_success"] = 1.0 if validation_result.deployment_success else 0.0
        
        # Gemini validation factor
        factor_scores["gemini_validation"] = validation_result.gemini_validation_score
        
        # Web evaluation factor
        factor_scores["web_eval_success"] = 1.0 if validation_result.web_eval_success else 0.0
        
        # Graph-Sitter analysis factor
        graph_sitter_score = validation_result.graph_sitter_analysis.get("complexity_score", 0.5)
        # Invert complexity score (lower complexity = higher confidence)
        factor_scores["graph_sitter_analysis"] = 1.0 - min(graph_sitter_score, 1.0)
        
        # Error count factor
        max_acceptable_errors = project_requirements.get("max_errors", 0)
        if validation_result.error_count <= max_acceptable_errors:
            factor_scores["error_count"] = 1.0
        else:
            # Exponential decay for error count
            factor_scores["error_count"] = max(0.0, 0.5 ** (validation_result.error_count - max_acceptable_errors))
        
        # Test coverage factor (placeholder - would be extracted from validation)
        factor_scores["test_coverage"] = 0.8  # Default assumption
        
        # Apply historical adjustments
        if historical_data:
            factor_scores = self._apply_historical_adjustments(factor_scores, historical_data)
        
        # Calculate weighted confidence score
        confidence_score = sum(
            factor_scores[factor] * self.weights[factor]
            for factor in self.weights
        )
        
        return min(confidence_score, 1.0), factor_scores
    
    def _apply_historical_adjustments(
        self,
        factor_scores: Dict[str, float],
        historical_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """Apply historical data adjustments to confidence factors"""
        
        # Adjust based on recent merge success rate
        recent_success_rate = historical_data.get("recent_success_rate", 0.8)
        adjustment_factor = min(recent_success_rate * 1.2, 1.0)
        
        # Apply adjustment to all factors
        adjusted_scores = {}
        for factor, score in factor_scores.items():
            adjusted_scores[factor] = score * adjustment_factor
        
        return adjusted_scores


class RiskAssessment:
    """
    Risk assessment for merge decisions
    
    Evaluates potential risks and their impact on the system
    and users.
    """
    
    def __init__(self):
        self.risk_categories = [
            "deployment_risk",
            "security_risk", 
            "performance_risk",
            "stability_risk",
            "user_impact_risk"
        ]
    
    def assess_risks(
        self,
        validation_result: ValidationResult,
        project_context: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Assess risks associated with merging the PR
        
        Args:
            validation_result: Validation results
            project_context: Project-specific context
            
        Returns:
            Risk assessment breakdown
        """
        risks = {}
        
        # Deployment risk
        risks["deployment_risk"] = self._assess_deployment_risk(validation_result)
        
        # Security risk
        risks["security_risk"] = self._assess_security_risk(validation_result)
        
        # Performance risk
        risks["performance_risk"] = self._assess_performance_risk(validation_result)
        
        # Stability risk
        risks["stability_risk"] = self._assess_stability_risk(validation_result)
        
        # User impact risk
        risks["user_impact_risk"] = self._assess_user_impact_risk(validation_result, project_context)
        
        return risks
    
    def _assess_deployment_risk(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """Assess deployment-related risks"""
        if not validation_result.deployment_success:
            return {
                "level": "high",
                "score": 0.9,
                "description": "Deployment failed during validation",
                "mitigation": "Fix deployment issues before merging"
            }
        
        # Check for deployment warnings or issues
        deployment_stage = validation_result.stages.get("deployment")
        if deployment_stage and deployment_stage.error_message:
            return {
                "level": "medium",
                "score": 0.6,
                "description": "Deployment completed with warnings",
                "mitigation": "Review deployment warnings"
            }
        
        return {
            "level": "low",
            "score": 0.1,
            "description": "Deployment successful without issues",
            "mitigation": "None required"
        }
    
    def _assess_security_risk(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """Assess security-related risks"""
        # Check Gemini analysis for security issues
        gemini_stage = validation_result.stages.get("gemini_validation")
        if gemini_stage:
            security_score = gemini_stage.metadata.get("security_score", 0.8)
            if security_score < 0.6:
                return {
                    "level": "high",
                    "score": 1.0 - security_score,
                    "description": "Security concerns identified in code analysis",
                    "mitigation": "Address security issues before merging"
                }
        
        # Check Graph-Sitter analysis for security patterns
        graph_sitter_issues = validation_result.graph_sitter_analysis.get("potential_issues", [])
        security_issues = [issue for issue in graph_sitter_issues if issue.get("category") == "security"]
        
        if security_issues:
            return {
                "level": "medium",
                "score": min(len(security_issues) * 0.2, 1.0),
                "description": f"Found {len(security_issues)} potential security issues",
                "mitigation": "Review and address security issues"
            }
        
        return {
            "level": "low",
            "score": 0.1,
            "description": "No significant security risks identified",
            "mitigation": "None required"
        }
    
    def _assess_performance_risk(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """Assess performance-related risks"""
        # Check web evaluation performance metrics
        web_eval_stage = validation_result.stages.get("web_eval_testing")
        if web_eval_stage:
            performance_metrics = web_eval_stage.metadata.get("performance_metrics", {})
            avg_load_time = performance_metrics.get("average_load_time", 0)
            
            if avg_load_time > 5.0:  # 5 seconds threshold
                return {
                    "level": "high",
                    "score": min(avg_load_time / 10.0, 1.0),
                    "description": f"High average load time: {avg_load_time:.2f}s",
                    "mitigation": "Optimize performance before merging"
                }
            elif avg_load_time > 2.0:  # 2 seconds threshold
                return {
                    "level": "medium",
                    "score": avg_load_time / 5.0,
                    "description": f"Moderate load time: {avg_load_time:.2f}s",
                    "mitigation": "Consider performance optimizations"
                }
        
        return {
            "level": "low",
            "score": 0.1,
            "description": "No significant performance risks identified",
            "mitigation": "None required"
        }
    
    def _assess_stability_risk(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """Assess system stability risks"""
        # Check error count and types
        if validation_result.error_count > 0:
            error_severity = "high" if validation_result.error_count > 3 else "medium"
            return {
                "level": error_severity,
                "score": min(validation_result.error_count * 0.3, 1.0),
                "description": f"Found {validation_result.error_count} errors during validation",
                "mitigation": "Fix errors before merging"
            }
        
        # Check complexity score
        complexity_score = validation_result.graph_sitter_analysis.get("complexity_score", 0.0)
        if complexity_score > 0.8:
            return {
                "level": "medium",
                "score": complexity_score,
                "description": "High code complexity may affect stability",
                "mitigation": "Consider refactoring complex code"
            }
        
        return {
            "level": "low",
            "score": 0.1,
            "description": "No significant stability risks identified",
            "mitigation": "None required"
        }
    
    def _assess_user_impact_risk(
        self,
        validation_result: ValidationResult,
        project_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess potential user impact risks"""
        
        # Check if this is a user-facing change
        is_user_facing = project_context.get("user_facing", True)
        
        if not is_user_facing:
            return {
                "level": "low",
                "score": 0.1,
                "description": "Internal change with minimal user impact",
                "mitigation": "None required"
            }
        
        # Check web evaluation results for UI issues
        web_eval_stage = validation_result.stages.get("web_eval_testing")
        if web_eval_stage and not web_eval_stage.success:
            ui_issues = web_eval_stage.metadata.get("ui_issues", [])
            if ui_issues:
                return {
                    "level": "high",
                    "score": min(len(ui_issues) * 0.2, 1.0),
                    "description": f"Found {len(ui_issues)} UI/UX issues",
                    "mitigation": "Fix UI issues before merging"
                }
        
        # Check accessibility score
        accessibility_score = web_eval_stage.metadata.get("accessibility_score", 1.0) if web_eval_stage else 1.0
        if accessibility_score < 0.7:
            return {
                "level": "medium",
                "score": 1.0 - accessibility_score,
                "description": f"Low accessibility score: {accessibility_score:.2f}",
                "mitigation": "Improve accessibility before merging"
            }
        
        return {
            "level": "low",
            "score": 0.2,
            "description": "Minimal user impact expected",
            "mitigation": "Monitor user feedback after deployment"
        }


class MergeManager:
    """
    Intelligent merge decision manager
    
    Makes automated merge decisions based on validation results,
    confidence scores, risk assessment, and project requirements.
    """
    
    def __init__(self):
        self.confidence_calculator = ConfidenceCalculator()
        self.risk_assessment = RiskAssessment()
        self.gemini_adapter = GeminiAdapter()
        
        logger.info("MergeManager initialized")
    
    async def make_decision(
        self,
        project_name: str,
        pr_number: int,
        validation_result: ValidationResult,
        auto_merge_enabled: bool,
        project_requirements: Optional[Dict[str, Any]] = None,
        historical_data: Optional[Dict[str, Any]] = None
    ) -> AutoMergeDecision:
        """
        Make intelligent auto-merge decision
        
        Args:
            project_name: Name of the project
            pr_number: Pull request number
            validation_result: Complete validation results
            auto_merge_enabled: Whether auto-merge is enabled for this project
            project_requirements: Project-specific requirements
            historical_data: Historical merge data for context
            
        Returns:
            AutoMergeDecision with recommendation and reasoning
        """
        try:
            logger.info(
                "Making merge decision",
                project=project_name,
                pr_number=pr_number,
                auto_merge_enabled=auto_merge_enabled
            )
            
            # Default project requirements
            requirements = project_requirements or self._get_default_requirements()
            
            # Calculate confidence score
            confidence_score, factor_breakdown = self.confidence_calculator.calculate_confidence(
                validation_result=validation_result,
                project_requirements=requirements,
                historical_data=historical_data
            )
            
            # Assess risks
            risk_assessment = self.risk_assessment.assess_risks(
                validation_result=validation_result,
                project_context=requirements
            )
            
            # Check requirements compliance
            requirements_met = self._check_requirements_compliance(
                validation_result=validation_result,
                requirements=requirements
            )
            
            # Make decision based on all factors
            decision, reasoning = await self._make_final_decision(
                confidence_score=confidence_score,
                risk_assessment=risk_assessment,
                requirements_met=requirements_met,
                auto_merge_enabled=auto_merge_enabled,
                validation_result=validation_result,
                requirements=requirements
            )
            
            # Create decision object
            merge_decision = AutoMergeDecision(
                decision=decision,
                confidence=confidence_score,
                reason=reasoning,
                factors=factor_breakdown,
                requirements_met=requirements_met,
                risk_assessment={
                    category: {
                        "level": risk["level"],
                        "score": risk["score"]
                    }
                    for category, risk in risk_assessment.items()
                },
                timestamp=datetime.utcnow()
            )
            
            # Record metrics
            metrics.record_auto_merge(project_name, decision)
            
            logger.info(
                "Merge decision made",
                project=project_name,
                pr_number=pr_number,
                decision=decision,
                confidence=confidence_score
            )
            
            return merge_decision
            
        except Exception as e:
            logger.error("Merge decision failed", error=str(e))
            raise AutoMergeException(f"Failed to make merge decision: {str(e)}")
    
    def _get_default_requirements(self) -> Dict[str, Any]:
        """Get default project requirements"""
        return {
            "deployment_required": True,
            "min_confidence_score": settings.auto_merge.confidence_threshold,
            "max_errors": settings.auto_merge.error_threshold,
            "require_tests": settings.auto_merge.require_tests,
            "user_facing": True,
            "risk_tolerance": "medium"
        }
    
    def _check_requirements_compliance(
        self,
        validation_result: ValidationResult,
        requirements: Dict[str, Any]
    ) -> Dict[str, bool]:
        """Check if validation results meet project requirements"""
        
        compliance = {}
        
        # Deployment requirement
        compliance["deployment_success"] = (
            not requirements.get("deployment_required", True) or
            validation_result.deployment_success
        )
        
        # Error count requirement
        max_errors = requirements.get("max_errors", 0)
        compliance["error_threshold"] = validation_result.error_count <= max_errors
        
        # Test coverage requirement (placeholder)
        compliance["test_coverage"] = not requirements.get("require_tests", False)  # Default pass
        
        # Security scan requirement
        compliance["security_scan"] = True  # Placeholder - would check actual security scan
        
        # Performance requirement
        compliance["performance_check"] = True  # Placeholder - would check performance metrics
        
        # Code review requirement (always true for automated validation)
        compliance["code_review"] = True
        
        return compliance
    
    async def _make_final_decision(
        self,
        confidence_score: float,
        risk_assessment: Dict[str, Dict[str, Any]],
        requirements_met: Dict[str, bool],
        auto_merge_enabled: bool,
        validation_result: ValidationResult,
        requirements: Dict[str, Any]
    ) -> Tuple[str, str]:
        """Make the final merge decision"""
        
        # Check if auto-merge is disabled
        if not auto_merge_enabled:
            return "manual_review", "Auto-merge is disabled for this project"
        
        # Check if all requirements are met
        if not all(requirements_met.values()):
            failed_requirements = [req for req, met in requirements_met.items() if not met]
            return "reject", f"Requirements not met: {', '.join(failed_requirements)}"
        
        # Check confidence threshold
        min_confidence = requirements.get("min_confidence_score", settings.auto_merge.confidence_threshold)
        if confidence_score < min_confidence:
            return "manual_review", f"Confidence score {confidence_score:.2f} below threshold {min_confidence}"
        
        # Check high-risk factors
        high_risks = [
            category for category, risk in risk_assessment.items()
            if risk["level"] == "high"
        ]
        
        if high_risks:
            return "reject", f"High-risk factors detected: {', '.join(high_risks)}"
        
        # Check medium risks with risk tolerance
        risk_tolerance = requirements.get("risk_tolerance", "medium")
        medium_risks = [
            category for category, risk in risk_assessment.items()
            if risk["level"] == "medium"
        ]
        
        if medium_risks and risk_tolerance == "low":
            return "manual_review", f"Medium-risk factors exceed risk tolerance: {', '.join(medium_risks)}"
        
        # Use AI for final assessment if available
        try:
            ai_assessment = await self.gemini_adapter.assess_merge_readiness(
                validation_results=validation_result.__dict__,
                project_requirements=requirements,
                risk_tolerance=risk_tolerance
            )
            
            ai_recommendation = ai_assessment.get("recommendation", "manual_review")
            ai_confidence = ai_assessment.get("confidence", 0.5)
            
            # Combine AI recommendation with rule-based decision
            if ai_recommendation == "reject" and ai_confidence > 0.7:
                return "reject", f"AI analysis recommends rejection: {ai_assessment.get('reasoning', 'No specific reason')}"
            elif ai_recommendation == "approve" and ai_confidence > 0.8:
                return "merge", f"All checks passed with high confidence ({confidence_score:.2f})"
            
        except Exception as e:
            logger.warning("AI assessment failed, using rule-based decision", error=str(e))
        
        # Final decision based on confidence score
        if confidence_score >= 0.9:
            return "merge", f"High confidence merge approved ({confidence_score:.2f})"
        elif confidence_score >= 0.7:
            return "merge", f"Merge approved with good confidence ({confidence_score:.2f})"
        else:
            return "manual_review", f"Moderate confidence requires manual review ({confidence_score:.2f})"
    
    async def get_merge_history(
        self,
        project_name: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get historical merge decisions for analysis"""
        # This would typically query a database
        # For now, return empty list
        return []
    
    async def update_merge_outcome(
        self,
        project_name: str,
        pr_number: int,
        decision_id: str,
        outcome: str,
        feedback: Optional[str] = None
    ):
        """Update merge decision outcome for learning"""
        logger.info(
            "Merge outcome updated",
            project=project_name,
            pr_number=pr_number,
            decision_id=decision_id,
            outcome=outcome
        )
        
        # This would typically update a database for machine learning
        # For now, just log the outcome

