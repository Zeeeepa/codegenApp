"""
Merge Manager for Auto-Merge Functionality

Handles PR merging decisions based on validation results and user preferences.
"""

import asyncio
from typing import Dict, Any, Optional, List
import logging
from dataclasses import dataclass
from enum import Enum

from app.services.adapters.codegen_adapter import CodegenService
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class MergeDecision(Enum):
    """Possible merge decisions"""
    AUTO_MERGE = "auto_merge"
    MANUAL_REVIEW = "manual_review"
    REJECT = "reject"
    RETRY = "retry"


@dataclass
class MergeContext:
    """Context for merge decision making"""
    project_name: str
    pr_number: int
    pr_url: str
    validation_success: bool
    deployment_success: bool
    web_eval_success: bool
    auto_merge_enabled: bool
    validation_confidence: float
    error_count: int
    retry_count: int
    user_preferences: Dict[str, Any]


@dataclass
class MergeResult:
    """Result of merge operation"""
    decision: MergeDecision
    success: bool
    message: str
    pr_status: str
    merge_commit_sha: Optional[str] = None
    error_details: Optional[str] = None


class MergeManager:
    """Manages PR merge decisions and operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.codegen_service = CodegenService(self.settings)
        self.pending_merges: Dict[str, MergeContext] = {}
        
        # Default merge criteria
        self.merge_criteria = {
            "min_validation_confidence": 0.8,
            "max_error_count": 0,
            "max_retry_count": 3,
            "require_deployment_success": True,
            "require_web_eval_success": True
        }
    
    async def evaluate_merge_decision(
        self,
        merge_context: MergeContext
    ) -> MergeDecision:
        """Evaluate whether a PR should be merged automatically"""
        
        logger.info(f"Evaluating merge decision for PR {merge_context.pr_number}")
        
        # Check if auto-merge is enabled
        if not merge_context.auto_merge_enabled:
            logger.info("Auto-merge disabled, requiring manual review")
            return MergeDecision.MANUAL_REVIEW
        
        # Check validation success
        if not merge_context.validation_success:
            if merge_context.retry_count < self.merge_criteria["max_retry_count"]:
                logger.info("Validation failed, but retries available")
                return MergeDecision.RETRY
            else:
                logger.info("Validation failed, max retries reached")
                return MergeDecision.REJECT
        
        # Check deployment success
        if self.merge_criteria["require_deployment_success"] and not merge_context.deployment_success:
            logger.info("Deployment validation failed")
            return MergeDecision.REJECT
        
        # Check web evaluation success
        if self.merge_criteria["require_web_eval_success"] and not merge_context.web_eval_success:
            logger.info("Web evaluation failed")
            return MergeDecision.REJECT
        
        # Check validation confidence
        if merge_context.validation_confidence < self.merge_criteria["min_validation_confidence"]:
            logger.info(f"Validation confidence too low: {merge_context.validation_confidence}")
            return MergeDecision.MANUAL_REVIEW
        
        # Check error count
        if merge_context.error_count > self.merge_criteria["max_error_count"]:
            logger.info(f"Too many errors: {merge_context.error_count}")
            return MergeDecision.MANUAL_REVIEW
        
        # All criteria met
        logger.info("All merge criteria met, approving auto-merge")
        return MergeDecision.AUTO_MERGE
    
    async def execute_merge_decision(
        self,
        merge_context: MergeContext,
        decision: MergeDecision
    ) -> MergeResult:
        """Execute the merge decision"""
        
        merge_key = f"{merge_context.project_name}_{merge_context.pr_number}"
        self.pending_merges[merge_key] = merge_context
        
        try:
            if decision == MergeDecision.AUTO_MERGE:
                return await self._execute_auto_merge(merge_context)
            
            elif decision == MergeDecision.MANUAL_REVIEW:
                return await self._request_manual_review(merge_context)
            
            elif decision == MergeDecision.REJECT:
                return await self._reject_pr(merge_context)
            
            elif decision == MergeDecision.RETRY:
                return await self._schedule_retry(merge_context)
            
            else:
                return MergeResult(
                    decision=decision,
                    success=False,
                    message=f"Unknown merge decision: {decision}",
                    pr_status="error"
                )
                
        except Exception as e:
            logger.error(f"Failed to execute merge decision {decision}: {e}")
            return MergeResult(
                decision=decision,
                success=False,
                message=f"Merge execution failed: {str(e)}",
                pr_status="error",
                error_details=str(e)
            )
        finally:
            # Cleanup
            if merge_key in self.pending_merges:
                del self.pending_merges[merge_key]
    
    async def _execute_auto_merge(self, merge_context: MergeContext) -> MergeResult:
        """Execute automatic PR merge"""
        
        logger.info(f"Executing auto-merge for PR {merge_context.pr_number}")
        
        try:
            # Use GitHub API to merge PR
            merge_result = await self._merge_pr_via_github(
                merge_context.project_name,
                merge_context.pr_number,
                "Auto-merged after successful validation"
            )
            
            if merge_result["success"]:
                # Notify via Codegen API
                await self._notify_merge_success(merge_context, merge_result)
                
                return MergeResult(
                    decision=MergeDecision.AUTO_MERGE,
                    success=True,
                    message="PR merged successfully",
                    pr_status="merged",
                    merge_commit_sha=merge_result.get("merge_commit_sha")
                )
            else:
                return MergeResult(
                    decision=MergeDecision.AUTO_MERGE,
                    success=False,
                    message=f"Merge failed: {merge_result.get('error', 'Unknown error')}",
                    pr_status="merge_failed",
                    error_details=merge_result.get("error")
                )
                
        except Exception as e:
            logger.error(f"Auto-merge failed: {e}")
            return MergeResult(
                decision=MergeDecision.AUTO_MERGE,
                success=False,
                message=f"Auto-merge failed: {str(e)}",
                pr_status="merge_failed",
                error_details=str(e)
            )
    
    async def _request_manual_review(self, merge_context: MergeContext) -> MergeResult:
        """Request manual review for the PR"""
        
        logger.info(f"Requesting manual review for PR {merge_context.pr_number}")
        
        try:
            # Create review request message
            review_message = self._create_review_request_message(merge_context)
            
            # Send notification via Codegen API
            await self._notify_manual_review_required(merge_context, review_message)
            
            # Add PR comment requesting review
            await self._add_pr_comment(
                merge_context.project_name,
                merge_context.pr_number,
                review_message
            )
            
            return MergeResult(
                decision=MergeDecision.MANUAL_REVIEW,
                success=True,
                message="Manual review requested",
                pr_status="review_requested"
            )
            
        except Exception as e:
            logger.error(f"Failed to request manual review: {e}")
            return MergeResult(
                decision=MergeDecision.MANUAL_REVIEW,
                success=False,
                message=f"Failed to request manual review: {str(e)}",
                pr_status="error",
                error_details=str(e)
            )
    
    async def _reject_pr(self, merge_context: MergeContext) -> MergeResult:
        """Reject the PR due to validation failures"""
        
        logger.info(f"Rejecting PR {merge_context.pr_number}")
        
        try:
            # Create rejection message
            rejection_message = self._create_rejection_message(merge_context)
            
            # Close PR with rejection comment
            await self._close_pr_with_comment(
                merge_context.project_name,
                merge_context.pr_number,
                rejection_message
            )
            
            # Notify via Codegen API
            await self._notify_pr_rejection(merge_context, rejection_message)
            
            return MergeResult(
                decision=MergeDecision.REJECT,
                success=True,
                message="PR rejected due to validation failures",
                pr_status="rejected"
            )
            
        except Exception as e:
            logger.error(f"Failed to reject PR: {e}")
            return MergeResult(
                decision=MergeDecision.REJECT,
                success=False,
                message=f"Failed to reject PR: {str(e)}",
                pr_status="error",
                error_details=str(e)
            )
    
    async def _schedule_retry(self, merge_context: MergeContext) -> MergeResult:
        """Schedule a retry of the validation process"""
        
        logger.info(f"Scheduling retry for PR {merge_context.pr_number}")
        
        try:
            # Update retry count
            merge_context.retry_count += 1
            
            # Send retry request to Codegen API
            retry_message = f"Validation failed, retrying (attempt {merge_context.retry_count}/{self.merge_criteria['max_retry_count']})"
            
            await self._notify_retry_scheduled(merge_context, retry_message)
            
            return MergeResult(
                decision=MergeDecision.RETRY,
                success=True,
                message=f"Retry scheduled (attempt {merge_context.retry_count})",
                pr_status="retry_scheduled"
            )
            
        except Exception as e:
            logger.error(f"Failed to schedule retry: {e}")
            return MergeResult(
                decision=MergeDecision.RETRY,
                success=False,
                message=f"Failed to schedule retry: {str(e)}",
                pr_status="error",
                error_details=str(e)
            )
    
    async def _merge_pr_via_github(
        self,
        project_name: str,
        pr_number: int,
        commit_message: str
    ) -> Dict[str, Any]:
        """Merge PR using GitHub API"""
        
        # This would integrate with GitHub API
        # For now, return a mock result
        return {
            "success": True,
            "merge_commit_sha": f"abc123_{pr_number}",
            "message": "PR merged successfully"
        }
    
    async def _add_pr_comment(
        self,
        project_name: str,
        pr_number: int,
        comment: str
    ):
        """Add comment to PR"""
        
        # This would integrate with GitHub API
        logger.info(f"Adding comment to PR {pr_number}: {comment[:100]}...")
    
    async def _close_pr_with_comment(
        self,
        project_name: str,
        pr_number: int,
        comment: str
    ):
        """Close PR with comment"""
        
        # This would integrate with GitHub API
        logger.info(f"Closing PR {pr_number} with comment: {comment[:100]}...")
    
    def _create_review_request_message(self, merge_context: MergeContext) -> str:
        """Create message for manual review request"""
        
        return f"""
## 🔍 Manual Review Required

This PR requires manual review before merging.

**Validation Summary:**
- Deployment Success: {'✅' if merge_context.deployment_success else '❌'}
- Web Evaluation Success: {'✅' if merge_context.web_eval_success else '❌'}
- Validation Confidence: {merge_context.validation_confidence:.2f}
- Error Count: {merge_context.error_count}

**Reason for Manual Review:**
- Validation confidence below threshold ({self.merge_criteria['min_validation_confidence']})
- Or other criteria not met for auto-merge

Please review the validation results and merge manually if appropriate.
"""
    
    def _create_rejection_message(self, merge_context: MergeContext) -> str:
        """Create message for PR rejection"""
        
        return f"""
## ❌ PR Rejected - Validation Failed

This PR has been automatically rejected due to validation failures.

**Validation Summary:**
- Deployment Success: {'✅' if merge_context.deployment_success else '❌'}
- Web Evaluation Success: {'✅' if merge_context.web_eval_success else '❌'}
- Validation Confidence: {merge_context.validation_confidence:.2f}
- Error Count: {merge_context.error_count}
- Retry Count: {merge_context.retry_count}/{self.merge_criteria['max_retry_count']}

**Rejection Reasons:**
- Maximum retry attempts exceeded
- Critical validation failures
- Unable to resolve errors automatically

Please fix the issues and create a new PR.
"""
    
    async def _notify_merge_success(self, merge_context: MergeContext, merge_result: Dict[str, Any]):
        """Notify about successful merge via Codegen API"""
        
        message = f"✅ PR #{merge_context.pr_number} merged successfully! Commit: {merge_result.get('merge_commit_sha', 'N/A')}"
        logger.info(f"Merge success notification: {message}")
        
        # This would send notification via Codegen API
    
    async def _notify_manual_review_required(self, merge_context: MergeContext, review_message: str):
        """Notify about manual review requirement via Codegen API"""
        
        message = f"🔍 PR #{merge_context.pr_number} requires manual review"
        logger.info(f"Manual review notification: {message}")
        
        # This would send notification via Codegen API
    
    async def _notify_pr_rejection(self, merge_context: MergeContext, rejection_message: str):
        """Notify about PR rejection via Codegen API"""
        
        message = f"❌ PR #{merge_context.pr_number} rejected due to validation failures"
        logger.info(f"PR rejection notification: {message}")
        
        # This would send notification via Codegen API
    
    async def _notify_retry_scheduled(self, merge_context: MergeContext, retry_message: str):
        """Notify about scheduled retry via Codegen API"""
        
        message = f"🔄 PR #{merge_context.pr_number} retry scheduled (attempt {merge_context.retry_count})"
        logger.info(f"Retry notification: {message}")
        
        # This would send notification via Codegen API
    
    def get_pending_merges(self) -> List[MergeContext]:
        """Get list of pending merge operations"""
        return list(self.pending_merges.values())
    
    def update_merge_criteria(self, new_criteria: Dict[str, Any]):
        """Update merge criteria"""
        self.merge_criteria.update(new_criteria)
        logger.info(f"Merge criteria updated: {self.merge_criteria}")


# Global merge manager instance
_merge_manager = None

def get_merge_manager() -> MergeManager:
    """Get the global merge manager instance"""
    global _merge_manager
    if _merge_manager is None:
        _merge_manager = MergeManager()
    return _merge_manager

