"""
Workflow context management for CI/CD pipeline orchestration.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.workflow_state import WorkflowMetadata

logger = logging.getLogger(__name__)


class ContextValidationError(Exception):
    """Context validation error"""
    pass


class WorkflowContext:
    """Manages workflow execution context and data"""
    
    def __init__(self, metadata: WorkflowMetadata):
        self.metadata = metadata
        self._context_data: Dict[str, Any] = {}
        self._sensitive_keys: set = {"secrets", "tokens", "passwords", "keys"}
        
    def set(self, key: str, value: Any, sensitive: bool = False) -> None:
        """Set context value"""
        if sensitive:
            self._sensitive_keys.add(key)
        
        self._context_data[key] = value
        logger.debug(f"Context set: {key} = {'[SENSITIVE]' if sensitive else value}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get context value"""
        return self._context_data.get(key, default)
    
    def has(self, key: str) -> bool:
        """Check if context has key"""
        return key in self._context_data
    
    def remove(self, key: str) -> bool:
        """Remove context key"""
        if key in self._context_data:
            del self._context_data[key]
            self._sensitive_keys.discard(key)
            return True
        return False
    
    def update(self, data: Dict[str, Any], sensitive_keys: Optional[List[str]] = None) -> None:
        """Update context with dictionary"""
        self._context_data.update(data)
        
        if sensitive_keys:
            self._sensitive_keys.update(sensitive_keys)
        
        logger.debug(f"Context updated with {len(data)} keys")
    
    def merge_context(self, other_context: 'WorkflowContext') -> None:
        """Merge another context into this one"""
        self._context_data.update(other_context._context_data)
        self._sensitive_keys.update(other_context._sensitive_keys)
        
        logger.debug(f"Context merged from another context")
    
    def add_error_context(self, error: str, context_data: Optional[Dict[str, Any]] = None) -> None:
        """Add error context for debugging"""
        self.metadata.error_contexts.append(error)
        
        if context_data:
            error_key = f"error_context_{len(self.metadata.error_contexts)}"
            self.set(error_key, context_data)
        
        logger.warning(f"Error context added: {error}")
    
    def add_accumulated_context(self, context: str) -> None:
        """Add to accumulated context for continuous learning"""
        self.metadata.accumulated_context.append(context)
        logger.debug(f"Accumulated context added: {context[:100]}...")
    
    def get_full_context_for_agent(self) -> str:
        """Get complete context string for agent runs"""
        context_parts = []
        
        # Add project information
        context_parts.append(f"Project: {self.metadata.project_id}")
        context_parts.append(f"Repository: {self.metadata.repository.get('full_name', 'Unknown')}")
        context_parts.append(f"Iteration: {self.metadata.current_iteration}/{self.metadata.max_iterations}")
        
        # Add initial requirements
        context_parts.append(f"Initial Requirements: {self.metadata.initial_requirements}")
        
        # Add planning statement if available
        if self.metadata.planning_statement:
            context_parts.append(f"Planning Statement: {self.metadata.planning_statement}")
        
        # Add accumulated context from previous iterations
        if self.metadata.accumulated_context:
            context_parts.append("Previous Context:")
            for i, ctx in enumerate(self.metadata.accumulated_context[-5:], 1):  # Last 5 contexts
                context_parts.append(f"  {i}. {ctx}")
        
        # Add error contexts if any
        if self.metadata.error_contexts:
            context_parts.append("Error Contexts:")
            for i, error in enumerate(self.metadata.error_contexts[-3:], 1):  # Last 3 errors
                context_parts.append(f"  {i}. {error}")
        
        # Add current workflow context
        non_sensitive_context = {
            k: v for k, v in self._context_data.items() 
            if k not in self._sensitive_keys and not k.startswith('error_context_')
        }
        
        if non_sensitive_context:
            context_parts.append("Current Context:")
            for key, value in non_sensitive_context.items():
                if isinstance(value, (str, int, float, bool)):
                    context_parts.append(f"  {key}: {value}")
                else:
                    context_parts.append(f"  {key}: {type(value).__name__}")
        
        return "\n".join(context_parts)
    
    def get_validation_context(self) -> Dict[str, Any]:
        """Get context for validation processes"""
        return {
            "project_id": self.metadata.project_id,
            "repository": self.metadata.repository,
            "current_iteration": self.metadata.current_iteration,
            "validation_attempts": self.metadata.validation_attempts,
            "pr_number": self.metadata.current_pr_number,
            "agent_run_id": self.metadata.current_agent_run_id,
            "requirements": self.metadata.initial_requirements,
            "accumulated_context": self.metadata.accumulated_context[-3:],  # Last 3
            "error_contexts": self.metadata.error_contexts[-2:],  # Last 2
            "context_data": {
                k: v for k, v in self._context_data.items() 
                if k not in self._sensitive_keys
            }
        }
    
    def serialize(self) -> Dict[str, Any]:
        """Serialize context for persistence"""
        # Don't serialize sensitive data
        safe_data = {
            k: v for k, v in self._context_data.items() 
            if k not in self._sensitive_keys
        }
        
        return {
            "metadata": self.metadata.dict(),
            "context_data": safe_data,
            "sensitive_keys": list(self._sensitive_keys - set(safe_data.keys()))
        }
    
    @classmethod
    def deserialize(cls, data: Dict[str, Any]) -> 'WorkflowContext':
        """Deserialize context from persistence"""
        metadata = WorkflowMetadata(**data["metadata"])
        context = cls(metadata)
        
        context._context_data = data.get("context_data", {})
        context._sensitive_keys = set(data.get("sensitive_keys", []))
        
        return context
    
    def validate_requirements_completion(self) -> Dict[str, Any]:
        """Validate if initial requirements are completed"""
        # This is a placeholder for AI-powered requirement analysis
        # In a real implementation, this would use NLP to compare
        # initial requirements with current state
        
        validation_result = {
            "completed": False,
            "completion_percentage": 0,
            "missing_requirements": [],
            "analysis": "Placeholder analysis - requires AI implementation"
        }
        
        # Simple heuristic checks
        if self.has("pr_merged") and self.get("pr_merged"):
            validation_result["completion_percentage"] += 30
        
        if self.has("tests_passing") and self.get("tests_passing"):
            validation_result["completion_percentage"] += 20
        
        if self.has("validation_passed") and self.get("validation_passed"):
            validation_result["completion_percentage"] += 30
        
        if self.has("deployment_successful") and self.get("deployment_successful"):
            validation_result["completion_percentage"] += 20
        
        validation_result["completed"] = validation_result["completion_percentage"] >= 80
        
        logger.info(f"Requirements completion: {validation_result['completion_percentage']}%")
        return validation_result
    
    def should_continue_iteration(self) -> bool:
        """Determine if workflow should continue to next iteration"""
        # Check if requirements are completed
        completion = self.validate_requirements_completion()
        if completion["completed"]:
            return False
        
        # Check iteration limits
        if self.metadata.current_iteration >= self.metadata.max_iterations:
            logger.warning(f"Maximum iterations reached: {self.metadata.max_iterations}")
            return False
        
        # Check for repeated failures
        if len(self.metadata.error_contexts) >= 5:
            logger.warning("Too many error contexts, stopping iterations")
            return False
        
        return True
    
    def prepare_next_iteration(self) -> None:
        """Prepare context for next iteration"""
        self.metadata.current_iteration += 1
        self.metadata.validation_attempts = 0
        
        # Add current state to accumulated context
        current_state_summary = f"Iteration {self.metadata.current_iteration - 1} completed"
        if self.metadata.current_pr_number:
            current_state_summary += f" with PR #{self.metadata.current_pr_number}"
        
        self.add_accumulated_context(current_state_summary)
        
        # Clear temporary context but keep important data
        temp_keys = [k for k in self._context_data.keys() if k.startswith("temp_")]
        for key in temp_keys:
            self.remove(key)
        
        logger.info(f"Prepared for iteration {self.metadata.current_iteration}")
    
    def get_debug_info(self) -> Dict[str, Any]:
        """Get debug information for troubleshooting"""
        return {
            "metadata": self.metadata.dict(),
            "context_keys": list(self._context_data.keys()),
            "sensitive_keys": list(self._sensitive_keys),
            "context_size": len(json.dumps(self._context_data, default=str)),
            "accumulated_contexts": len(self.metadata.accumulated_context),
            "error_contexts": len(self.metadata.error_contexts),
            "agent_runs": len(self.metadata.agent_run_history),
            "prs": len(self.metadata.pr_history)
        }
