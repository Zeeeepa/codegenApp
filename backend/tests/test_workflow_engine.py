"""
Comprehensive tests for the CI/CD Workflow Engine.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

from app.core.workflow.cicd_engine import CICDWorkflowEngine, WorkflowEngineError
from app.core.workflow.state_machine import StateMachine, InvalidTransitionError, TimeoutError
from app.core.workflow.workflow_context import WorkflowContext
from app.models.workflow_state import (
    WorkflowState, WorkflowExecution, WorkflowMetadata, 
    WorkflowConfig, WorkflowEvent
)


class TestWorkflowEngine:
    """Test suite for CI/CD Workflow Engine"""
    
    @pytest.fixture
    def mock_codegen_adapter(self):
        """Mock Codegen adapter"""
        adapter = AsyncMock()
        adapter.create_agent_run.return_value = {"id": "agent_run_123"}
        adapter.get_agent_run_status.return_value = {
            "status": "completed",
            "type": "plan",
            "response": "Generated implementation plan"
        }
        return adapter
    
    @pytest.fixture
    def mock_websocket_manager(self):
        """Mock WebSocket manager"""
        manager = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_webhook_processor(self):
        """Mock webhook processor"""
        processor = AsyncMock()
        return processor
    
    @pytest.fixture
    def workflow_config(self):
        """Test workflow configuration"""
        return WorkflowConfig(
            planning_timeout=60,  # Shorter timeouts for testing
            coding_timeout=120,
            validation_timeout=60,
            max_retries_per_state=2,
            max_concurrent_workflows=5
        )
    
    @pytest.fixture
    def workflow_engine(self, mock_codegen_adapter, mock_websocket_manager, 
                       mock_webhook_processor, workflow_config):
        """Create workflow engine instance"""
        return CICDWorkflowEngine(
            codegen_adapter=mock_codegen_adapter,
            websocket_manager=mock_websocket_manager,
            webhook_processor=mock_webhook_processor,
            config=workflow_config
        )
    
    @pytest.fixture
    def sample_repository(self):
        """Sample repository data"""
        return {
            "id": 123456,
            "name": "test-repo",
            "full_name": "testuser/test-repo",
            "owner": {"login": "testuser"},
            "private": False,
            "html_url": "https://github.com/testuser/test-repo"
        }
    
    @pytest.mark.asyncio
    async def test_start_workflow_success(self, workflow_engine, sample_repository):
        """Test successful workflow start"""
        execution = await workflow_engine.start_workflow(
            project_id="test-project",
            repository=sample_repository,
            initial_requirements="Create a simple web API",
            auto_confirm_plan=True,
            max_iterations=5
        )
        
        assert execution.id is not None
        assert execution.project_id == "test-project"
        assert execution.current_state == WorkflowState.IDLE
        assert execution.metadata.initial_requirements == "Create a simple web API"
        assert execution.metadata.auto_confirm_plan is True
        assert execution.metadata.max_iterations == 5
        
        # Verify workflow is stored
        assert execution.id in workflow_engine.active_workflows
        assert execution.id in workflow_engine.workflow_contexts
    
    @pytest.mark.asyncio
    async def test_start_workflow_concurrent_limit(self, workflow_engine, sample_repository):
        """Test concurrent workflow limit enforcement"""
        # Start maximum allowed workflows
        for i in range(workflow_engine.config.max_concurrent_workflows):
            await workflow_engine.start_workflow(
                project_id=f"project-{i}",
                repository=sample_repository,
                initial_requirements=f"Requirement {i}"
            )
        
        # Try to start one more - should fail
        with pytest.raises(WorkflowEngineError, match="Maximum concurrent workflows reached"):
            await workflow_engine.start_workflow(
                project_id="overflow-project",
                repository=sample_repository,
                initial_requirements="This should fail"
            )
    
    @pytest.mark.asyncio
    async def test_workflow_state_transitions(self, workflow_engine, sample_repository):
        """Test workflow state transitions"""
        execution = await workflow_engine.start_workflow(
            project_id="test-project",
            repository=sample_repository,
            initial_requirements="Test requirements",
            auto_confirm_plan=True
        )
        
        workflow_id = execution.id
        
        # Wait a bit for workflow to start
        await asyncio.sleep(0.1)
        
        # Check that workflow transitioned to planning
        updated_execution = workflow_engine.active_workflows[workflow_id]
        assert updated_execution.current_state == WorkflowState.PLANNING
        
        # Verify state history
        assert len(updated_execution.state_history) > 0
        assert updated_execution.state_history[-1].to_state == WorkflowState.PLANNING
    
    @pytest.mark.asyncio
    async def test_workflow_context_management(self, workflow_engine, sample_repository):
        """Test workflow context management"""
        execution = await workflow_engine.start_workflow(
            project_id="test-project",
            repository=sample_repository,
            initial_requirements="Test requirements"
        )
        
        workflow_id = execution.id
        context = workflow_engine.workflow_contexts[workflow_id]
        
        # Test context operations
        context.set("test_key", "test_value")
        assert context.get("test_key") == "test_value"
        assert context.has("test_key") is True
        
        # Test sensitive data handling
        context.set("secret_key", "secret_value", sensitive=True)
        serialized = context.serialize()
        assert "secret_key" not in serialized["context_data"]
        assert "secret_key" in serialized["sensitive_keys"]
        
        # Test error context
        context.add_error_context("Test error", {"error_code": 500})
        assert "Test error" in context.metadata.error_contexts
    
    @pytest.mark.asyncio
    async def test_workflow_cancellation(self, workflow_engine, sample_repository):
        """Test workflow cancellation"""
        execution = await workflow_engine.start_workflow(
            project_id="test-project",
            repository=sample_repository,
            initial_requirements="Test requirements"
        )
        
        workflow_id = execution.id
        
        # Cancel workflow
        success = await workflow_engine.cancel_workflow(workflow_id)
        assert success is True
        
        # Verify workflow is cleaned up
        assert workflow_id not in workflow_engine.active_workflows
        assert workflow_id not in workflow_engine.workflow_contexts
        
        # Try to cancel again - should fail
        success = await workflow_engine.cancel_workflow(workflow_id)
        assert success is False
    
    @pytest.mark.asyncio
    async def test_workflow_status_retrieval(self, workflow_engine, sample_repository):
        """Test workflow status retrieval"""
        execution = await workflow_engine.start_workflow(
            project_id="test-project",
            repository=sample_repository,
            initial_requirements="Test requirements"
        )
        
        workflow_id = execution.id
        
        # Get status
        status = await workflow_engine.get_workflow_status(workflow_id)
        assert status is not None
        assert "execution" in status
        assert "summary" in status
        assert "context_debug" in status
        
        # Test non-existent workflow
        status = await workflow_engine.get_workflow_status("non-existent")
        assert status is None
    
    @pytest.mark.asyncio
    async def test_active_workflows_listing(self, workflow_engine, sample_repository):
        """Test active workflows listing"""
        # Start multiple workflows
        workflow_ids = []
        for i in range(3):
            execution = await workflow_engine.start_workflow(
                project_id=f"project-{i}",
                repository=sample_repository,
                initial_requirements=f"Requirement {i}"
            )
            workflow_ids.append(execution.id)
        
        # Get active workflows
        active_workflows = await workflow_engine.get_active_workflows()
        assert len(active_workflows) == 3
        
        # Verify workflow data
        for workflow in active_workflows:
            assert workflow["id"] in workflow_ids
            assert "project_id" in workflow
            assert "state" in workflow
            assert "created_at" in workflow


class TestStateMachine:
    """Test suite for State Machine"""
    
    @pytest.fixture
    def state_machine(self):
        """Create state machine instance"""
        config = WorkflowConfig()
        return StateMachine(config)
    
    @pytest.fixture
    def sample_execution(self):
        """Create sample workflow execution"""
        metadata = WorkflowMetadata(
            project_id="test-project",
            repository={"name": "test-repo"},
            initial_requirements="Test requirements"
        )
        
        return WorkflowExecution(
            id="test-workflow",
            project_id="test-project",
            current_state=WorkflowState.IDLE,
            metadata=metadata,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
    
    @pytest.mark.asyncio
    async def test_valid_state_transition(self, state_machine, sample_execution):
        """Test valid state transition"""
        conditions = {
            "initial_requirements": True,
            "project_configured": True
        }
        
        transition = await state_machine.transition(
            sample_execution,
            WorkflowState.PLANNING,
            "start_planning",
            conditions
        )
        
        assert transition.from_state == WorkflowState.IDLE
        assert transition.to_state == WorkflowState.PLANNING
        assert transition.trigger == "start_planning"
        assert sample_execution.current_state == WorkflowState.PLANNING
        assert len(sample_execution.state_history) == 1
    
    @pytest.mark.asyncio
    async def test_invalid_state_transition(self, state_machine, sample_execution):
        """Test invalid state transition"""
        conditions = {"invalid_condition": True}
        
        with pytest.raises(InvalidTransitionError):
            await state_machine.transition(
                sample_execution,
                WorkflowState.COMPLETED,  # Invalid transition from IDLE
                "invalid_trigger",
                conditions
            )
    
    @pytest.mark.asyncio
    async def test_transition_validation(self, state_machine, sample_execution):
        """Test transition validation"""
        # Valid conditions
        valid_conditions = {
            "initial_requirements": True,
            "project_configured": True
        }
        
        is_valid = await state_machine.validate_transition(
            sample_execution,
            WorkflowState.PLANNING,
            valid_conditions
        )
        assert is_valid is True
        
        # Invalid conditions
        invalid_conditions = {"missing_requirement": False}
        
        is_valid = await state_machine.validate_transition(
            sample_execution,
            WorkflowState.PLANNING,
            invalid_conditions
        )
        assert is_valid is False
    
    def test_valid_transitions_lookup(self, state_machine):
        """Test valid transitions lookup"""
        valid_states = state_machine.get_valid_transitions(WorkflowState.IDLE)
        assert WorkflowState.PLANNING in valid_states
        
        # Terminal states should have no valid transitions
        valid_states = state_machine.get_valid_transitions(WorkflowState.COMPLETED)
        assert len(valid_states) == 0
    
    def test_terminal_state_detection(self, state_machine):
        """Test terminal state detection"""
        assert state_machine.is_terminal_state(WorkflowState.COMPLETED) is True
        assert state_machine.is_terminal_state(WorkflowState.FAILED) is True
        assert state_machine.is_terminal_state(WorkflowState.CANCELLED) is True
        assert state_machine.is_terminal_state(WorkflowState.PLANNING) is False
    
    @pytest.mark.asyncio
    async def test_retry_logic(self, state_machine, sample_execution):
        """Test retry logic"""
        # Initially can retry
        can_retry = await state_machine.can_retry(sample_execution)
        assert can_retry is True
        
        # Exceed retry limit
        sample_execution.retry_count = sample_execution.max_retries
        can_retry = await state_machine.can_retry(sample_execution)
        assert can_retry is False
        
        # Reset for retry
        sample_execution.retry_count = 0
        sample_execution.current_state = WorkflowState.FAILED
        
        reset_execution = await state_machine.reset_for_retry(sample_execution)
        assert reset_execution.current_state == WorkflowState.IDLE
        assert reset_execution.retry_count == 1
    
    def test_execution_summary(self, state_machine, sample_execution):
        """Test execution summary generation"""
        # Add some state history
        sample_execution.started_at = datetime.utcnow() - timedelta(minutes=5)
        sample_execution.current_state = WorkflowState.PLANNING
        
        summary = state_machine.get_execution_summary(sample_execution)
        
        assert summary["id"] == sample_execution.id
        assert summary["project_id"] == sample_execution.project_id
        assert summary["current_state"] == WorkflowState.PLANNING.value
        assert "total_time_seconds" in summary
        assert "retry_count" in summary
        assert "is_terminal" in summary


class TestWorkflowContext:
    """Test suite for Workflow Context"""
    
    @pytest.fixture
    def sample_metadata(self):
        """Create sample metadata"""
        return WorkflowMetadata(
            project_id="test-project",
            repository={"name": "test-repo"},
            initial_requirements="Test requirements"
        )
    
    @pytest.fixture
    def workflow_context(self, sample_metadata):
        """Create workflow context instance"""
        return WorkflowContext(sample_metadata)
    
    def test_context_operations(self, workflow_context):
        """Test basic context operations"""
        # Set and get values
        workflow_context.set("key1", "value1")
        assert workflow_context.get("key1") == "value1"
        assert workflow_context.has("key1") is True
        
        # Default values
        assert workflow_context.get("nonexistent", "default") == "default"
        
        # Remove values
        success = workflow_context.remove("key1")
        assert success is True
        assert workflow_context.has("key1") is False
    
    def test_sensitive_data_handling(self, workflow_context):
        """Test sensitive data handling"""
        workflow_context.set("password", "secret123", sensitive=True)
        workflow_context.set("public_data", "not_secret")
        
        serialized = workflow_context.serialize()
        
        # Sensitive data should not be in serialized context
        assert "password" not in serialized["context_data"]
        assert "public_data" in serialized["context_data"]
        assert "password" in serialized["sensitive_keys"]
    
    def test_context_merging(self, sample_metadata):
        """Test context merging"""
        context1 = WorkflowContext(sample_metadata)
        context2 = WorkflowContext(sample_metadata)
        
        context1.set("key1", "value1")
        context2.set("key2", "value2")
        context2.set("secret", "secret_value", sensitive=True)
        
        context1.merge_context(context2)
        
        assert context1.get("key1") == "value1"
        assert context1.get("key2") == "value2"
        assert context1.get("secret") == "secret_value"
        assert "secret" in context1._sensitive_keys
    
    def test_error_context_management(self, workflow_context):
        """Test error context management"""
        workflow_context.add_error_context("Test error", {"code": 500})
        
        assert "Test error" in workflow_context.metadata.error_contexts
        assert workflow_context.has("error_context_1") is True
    
    def test_accumulated_context(self, workflow_context):
        """Test accumulated context management"""
        workflow_context.add_accumulated_context("Context 1")
        workflow_context.add_accumulated_context("Context 2")
        
        assert len(workflow_context.metadata.accumulated_context) == 2
        assert "Context 1" in workflow_context.metadata.accumulated_context
        assert "Context 2" in workflow_context.metadata.accumulated_context
    
    def test_agent_context_generation(self, workflow_context):
        """Test agent context generation"""
        workflow_context.set("current_state", "planning")
        workflow_context.add_accumulated_context("Previous iteration completed")
        workflow_context.add_error_context("Minor error occurred")
        
        agent_context = workflow_context.get_full_context_for_agent()
        
        assert "Project: test-project" in agent_context
        assert "Initial Requirements: Test requirements" in agent_context
        assert "Previous Context:" in agent_context
        assert "Error Contexts:" in agent_context
        assert "current_state: planning" in agent_context
    
    def test_validation_context(self, workflow_context):
        """Test validation context generation"""
        workflow_context.metadata.current_pr_number = 123
        workflow_context.metadata.validation_attempts = 2
        workflow_context.set("test_status", "passing")
        
        validation_context = workflow_context.get_validation_context()
        
        assert validation_context["project_id"] == "test-project"
        assert validation_context["pr_number"] == 123
        assert validation_context["validation_attempts"] == 2
        assert "test_status" in validation_context["context_data"]
    
    def test_requirements_completion_validation(self, workflow_context):
        """Test requirements completion validation"""
        # Initially not completed
        result = workflow_context.validate_requirements_completion()
        assert result["completed"] is False
        assert result["completion_percentage"] == 0
        
        # Add completion indicators
        workflow_context.set("pr_merged", True)
        workflow_context.set("tests_passing", True)
        workflow_context.set("validation_passed", True)
        workflow_context.set("deployment_successful", True)
        
        result = workflow_context.validate_requirements_completion()
        assert result["completed"] is True
        assert result["completion_percentage"] == 100
    
    def test_iteration_management(self, workflow_context):
        """Test iteration management"""
        # Should continue initially
        assert workflow_context.should_continue_iteration() is True
        
        # Prepare next iteration
        workflow_context.metadata.current_pr_number = 123
        workflow_context.prepare_next_iteration()
        
        assert workflow_context.metadata.current_iteration == 2
        assert workflow_context.metadata.validation_attempts == 0
        assert len(workflow_context.metadata.accumulated_context) > 0
        
        # Reach max iterations
        workflow_context.metadata.current_iteration = workflow_context.metadata.max_iterations
        assert workflow_context.should_continue_iteration() is False
    
    def test_serialization_deserialization(self, workflow_context):
        """Test context serialization and deserialization"""
        workflow_context.set("key1", "value1")
        workflow_context.set("secret", "secret_value", sensitive=True)
        workflow_context.add_error_context("Test error")
        
        # Serialize
        serialized = workflow_context.serialize()
        
        # Deserialize
        deserialized_context = WorkflowContext.deserialize(serialized)
        
        assert deserialized_context.get("key1") == "value1"
        assert deserialized_context.metadata.project_id == workflow_context.metadata.project_id
        assert len(deserialized_context.metadata.error_contexts) == 1
        
        # Sensitive data should not be deserialized
        assert deserialized_context.get("secret") is None
    
    def test_debug_info(self, workflow_context):
        """Test debug info generation"""
        workflow_context.set("test_key", "test_value")
        workflow_context.add_error_context("Test error")
        workflow_context.metadata.agent_run_history.append("run_123")
        
        debug_info = workflow_context.get_debug_info()
        
        assert "metadata" in debug_info
        assert "context_keys" in debug_info
        assert "context_size" in debug_info
        assert debug_info["error_contexts"] == 1
        assert debug_info["agent_runs"] == 1


# Performance and Integration Tests
class TestWorkflowPerformance:
    """Performance tests for workflow engine"""
    
    @pytest.mark.asyncio
    async def test_concurrent_workflow_handling(self, workflow_engine, sample_repository):
        """Test handling multiple concurrent workflows"""
        # Start multiple workflows concurrently
        tasks = []
        for i in range(3):
            task = workflow_engine.start_workflow(
                project_id=f"concurrent-project-{i}",
                repository=sample_repository,
                initial_requirements=f"Concurrent requirement {i}"
            )
            tasks.append(task)
        
        # Wait for all to start
        executions = await asyncio.gather(*tasks)
        
        assert len(executions) == 3
        assert len(workflow_engine.active_workflows) == 3
        
        # Verify each workflow has unique ID
        workflow_ids = [e.id for e in executions]
        assert len(set(workflow_ids)) == 3
    
    @pytest.mark.asyncio
    async def test_workflow_memory_usage(self, workflow_engine, sample_repository):
        """Test workflow memory usage stays within limits"""
        execution = await workflow_engine.start_workflow(
            project_id="memory-test-project",
            repository=sample_repository,
            initial_requirements="Test memory usage"
        )
        
        context = workflow_engine.workflow_contexts[execution.id]
        
        # Add large amount of data to context
        large_data = "x" * 1000  # 1KB string
        for i in range(50):  # 50KB total
            context.set(f"large_key_{i}", large_data)
        
        debug_info = context.get_debug_info()
        context_size = debug_info["context_size"]
        
        # Should be within reasonable limits (less than 1MB)
        assert context_size < 1024 * 1024  # 1MB limit
    
    @pytest.mark.asyncio
    async def test_workflow_cleanup_on_completion(self, workflow_engine, sample_repository):
        """Test proper cleanup when workflow completes"""
        execution = await workflow_engine.start_workflow(
            project_id="cleanup-test-project",
            repository=sample_repository,
            initial_requirements="Test cleanup"
        )
        
        workflow_id = execution.id
        
        # Simulate workflow completion
        await workflow_engine._cleanup_workflow(workflow_id)
        
        # Verify cleanup
        assert workflow_id not in workflow_engine.active_workflows
        assert workflow_id not in workflow_engine.workflow_contexts


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
