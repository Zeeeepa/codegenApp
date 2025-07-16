"""
State management for CI/CD workflow orchestration.

Manages workflow states, transitions, and persistence
across the CI/CD pipeline lifecycle.
"""

import json
import redis
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum

from ..models import AgentRunStatus, ValidationStatus, ResponseType


class WorkflowState(Enum):
    """Workflow state enumeration."""
    IDLE = "idle"
    AGENT_RUNNING = "agent_running"
    WAITING_USER_INPUT = "waiting_user_input"
    VALIDATING = "validating"
    DEPLOYING = "deploying"
    COMPLETED = "completed"
    FAILED = "failed"


class StateManager:
    """
    Manages workflow states and transitions.
    
    Provides centralized state management with Redis backing
    for distributed workflow coordination.
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.state_ttl = 86400  # 24 hours
    
    def get_project_state(self, project_id: str) -> Dict[str, Any]:
        """
        Get current state for a project.
        
        Args:
            project_id: ID of the project
            
        Returns:
            dict: Current project state
        """
        state_key = f"project_state:{project_id}"
        state_data = self.redis_client.get(state_key)
        
        if state_data:
            return json.loads(state_data)
        
        # Return default state
        return {
            "project_id": project_id,
            "workflow_state": WorkflowState.IDLE.value,
            "active_runs": [],
            "active_validations": [],
            "last_activity": None,
            "metadata": {}
        }
    
    def update_project_state(
        self,
        project_id: str,
        workflow_state: Optional[WorkflowState] = None,
        active_runs: Optional[List[str]] = None,
        active_validations: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Update project state.
        
        Args:
            project_id: ID of the project
            workflow_state: New workflow state (optional)
            active_runs: List of active run IDs (optional)
            active_validations: List of active validation IDs (optional)
            metadata: Additional metadata (optional)
        """
        current_state = self.get_project_state(project_id)
        
        # Update fields if provided
        if workflow_state:
            current_state["workflow_state"] = workflow_state.value
        if active_runs is not None:
            current_state["active_runs"] = active_runs
        if active_validations is not None:
            current_state["active_validations"] = active_validations
        if metadata:
            current_state["metadata"].update(metadata)
        
        current_state["last_activity"] = datetime.utcnow().isoformat()
        
        # Save to Redis
        state_key = f"project_state:{project_id}"
        self.redis_client.setex(
            state_key,
            self.state_ttl,
            json.dumps(current_state)
        )
    
    def add_active_run(self, project_id: str, run_id: str):
        """
        Add an active run to project state.
        
        Args:
            project_id: ID of the project
            run_id: ID of the run to add
        """
        current_state = self.get_project_state(project_id)
        active_runs = current_state.get("active_runs", [])
        
        if run_id not in active_runs:
            active_runs.append(run_id)
            self.update_project_state(
                project_id,
                active_runs=active_runs,
                workflow_state=WorkflowState.AGENT_RUNNING
            )
    
    def remove_active_run(self, project_id: str, run_id: str):
        """
        Remove an active run from project state.
        
        Args:
            project_id: ID of the project
            run_id: ID of the run to remove
        """
        current_state = self.get_project_state(project_id)
        active_runs = current_state.get("active_runs", [])
        
        if run_id in active_runs:
            active_runs.remove(run_id)
            
            # Determine new workflow state
            new_state = WorkflowState.IDLE
            if active_runs:
                new_state = WorkflowState.AGENT_RUNNING
            elif current_state.get("active_validations"):
                new_state = WorkflowState.VALIDATING
            
            self.update_project_state(
                project_id,
                active_runs=active_runs,
                workflow_state=new_state
            )
    
    def add_active_validation(self, project_id: str, validation_id: str):
        """
        Add an active validation to project state.
        
        Args:
            project_id: ID of the project
            validation_id: ID of the validation to add
        """
        current_state = self.get_project_state(project_id)
        active_validations = current_state.get("active_validations", [])
        
        if validation_id not in active_validations:
            active_validations.append(validation_id)
            self.update_project_state(
                project_id,
                active_validations=active_validations,
                workflow_state=WorkflowState.VALIDATING
            )
    
    def remove_active_validation(self, project_id: str, validation_id: str):
        """
        Remove an active validation from project state.
        
        Args:
            project_id: ID of the project
            validation_id: ID of the validation to remove
        """
        current_state = self.get_project_state(project_id)
        active_validations = current_state.get("active_validations", [])
        
        if validation_id in active_validations:
            active_validations.remove(validation_id)
            
            # Determine new workflow state
            new_state = WorkflowState.IDLE
            if current_state.get("active_runs"):
                new_state = WorkflowState.AGENT_RUNNING
            elif active_validations:
                new_state = WorkflowState.VALIDATING
            
            self.update_project_state(
                project_id,
                active_validations=active_validations,
                workflow_state=new_state
            )
    
    def get_run_state(self, run_id: str) -> Dict[str, Any]:
        """
        Get state for a specific agent run.
        
        Args:
            run_id: ID of the agent run
            
        Returns:
            dict: Agent run state
        """
        state_key = f"run_state:{run_id}"
        state_data = self.redis_client.get(state_key)
        
        if state_data:
            return json.loads(state_data)
        
        return {
            "run_id": run_id,
            "status": AgentRunStatus.PENDING.value,
            "progress": 0,
            "current_step": None,
            "response_type": None,
            "waiting_for_input": False,
            "metadata": {}
        }
    
    def update_run_state(
        self,
        run_id: str,
        status: Optional[AgentRunStatus] = None,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        response_type: Optional[ResponseType] = None,
        waiting_for_input: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Update agent run state.
        
        Args:
            run_id: ID of the agent run
            status: New status (optional)
            progress: Progress percentage (optional)
            current_step: Current step description (optional)
            response_type: Response type (optional)
            waiting_for_input: Whether waiting for input (optional)
            metadata: Additional metadata (optional)
        """
        current_state = self.get_run_state(run_id)
        
        # Update fields if provided
        if status:
            current_state["status"] = status.value
        if progress is not None:
            current_state["progress"] = progress
        if current_step:
            current_state["current_step"] = current_step
        if response_type:
            current_state["response_type"] = response_type.value
        if waiting_for_input is not None:
            current_state["waiting_for_input"] = waiting_for_input
        if metadata:
            current_state["metadata"].update(metadata)
        
        current_state["updated_at"] = datetime.utcnow().isoformat()
        
        # Save to Redis
        state_key = f"run_state:{run_id}"
        self.redis_client.setex(
            state_key,
            self.state_ttl,
            json.dumps(current_state)
        )
    
    def get_validation_state(self, validation_id: str) -> Dict[str, Any]:
        """
        Get state for a specific validation pipeline.
        
        Args:
            validation_id: ID of the validation pipeline
            
        Returns:
            dict: Validation pipeline state
        """
        state_key = f"validation_state:{validation_id}"
        state_data = self.redis_client.get(state_key)
        
        if state_data:
            return json.loads(state_data)
        
        return {
            "validation_id": validation_id,
            "status": ValidationStatus.PENDING.value,
            "progress": 0,
            "current_step": None,
            "steps_completed": [],
            "steps_failed": [],
            "metadata": {}
        }
    
    def update_validation_state(
        self,
        validation_id: str,
        status: Optional[ValidationStatus] = None,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        steps_completed: Optional[List[str]] = None,
        steps_failed: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Update validation pipeline state.
        
        Args:
            validation_id: ID of the validation pipeline
            status: New status (optional)
            progress: Progress percentage (optional)
            current_step: Current step description (optional)
            steps_completed: List of completed step IDs (optional)
            steps_failed: List of failed step IDs (optional)
            metadata: Additional metadata (optional)
        """
        current_state = self.get_validation_state(validation_id)
        
        # Update fields if provided
        if status:
            current_state["status"] = status.value
        if progress is not None:
            current_state["progress"] = progress
        if current_step:
            current_state["current_step"] = current_step
        if steps_completed is not None:
            current_state["steps_completed"] = steps_completed
        if steps_failed is not None:
            current_state["steps_failed"] = steps_failed
        if metadata:
            current_state["metadata"].update(metadata)
        
        current_state["updated_at"] = datetime.utcnow().isoformat()
        
        # Save to Redis
        state_key = f"validation_state:{validation_id}"
        self.redis_client.setex(
            state_key,
            self.state_ttl,
            json.dumps(current_state)
        )
    
    def cleanup_expired_states(self):
        """Clean up expired state entries."""
        # Redis TTL handles automatic cleanup
        pass
    
    def get_all_project_states(self) -> List[Dict[str, Any]]:
        """
        Get all project states.
        
        Returns:
            list: List of all project states
        """
        pattern = "project_state:*"
        keys = self.redis_client.keys(pattern)
        states = []
        
        for key in keys:
            state_data = self.redis_client.get(key)
            if state_data:
                states.append(json.loads(state_data))
        
        return states
    
    def health_check(self) -> bool:
        """
        Check Redis connectivity.
        
        Returns:
            bool: True if Redis is accessible
        """
        try:
            self.redis_client.ping()
            return True
        except Exception:
            return False

