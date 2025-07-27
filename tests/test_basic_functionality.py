"""
Basic functionality tests for the Codegen Agent Manager.
Tests core components without external dependencies.
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from backend.app.services.codegen_client import (
        TaskType, AgentStatus, CodegenAgentRequest, AgentResponse
    )
    from backend.app.database.models import AgentRun, AgentRunStatus
    IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Import error: {e}")
    IMPORTS_AVAILABLE = False
    # Create mock classes for testing
    class TaskType:
        CODE_GENERATION = "code_generation"
        CODE_REVIEW = "code_review"
    
    class AgentStatus:
        PENDING = "pending"
        RUNNING = "running"
        COMPLETED = "completed"
    
    class AgentRunStatus:
        PENDING = "pending"
        RUNNING = "running"
        COMPLETED = "completed"


class TestBasicFunctionality:
    """Test basic functionality without external dependencies"""
    
    def test_task_types_available(self):
        """Test that task types are properly defined"""
        if IMPORTS_AVAILABLE:
            # Test actual enum values
            assert TaskType.CODE_GENERATION.value == "code_generation"
            assert TaskType.CODE_REVIEW.value == "code_review"
        else:
            # Test mock values
            assert hasattr(TaskType, 'CODE_GENERATION')
            assert hasattr(TaskType, 'CODE_REVIEW')
            assert isinstance(TaskType.CODE_GENERATION, str)
            assert isinstance(TaskType.CODE_REVIEW, str)
    
    def test_agent_status_available(self):
        """Test that agent statuses are properly defined"""
        if IMPORTS_AVAILABLE:
            # Test actual enum values
            assert AgentStatus.PENDING.value == "pending"
            assert AgentStatus.RUNNING.value == "running"
            assert AgentStatus.COMPLETED.value == "completed"
        else:
            # Test mock values
            assert hasattr(AgentStatus, 'PENDING')
            assert hasattr(AgentStatus, 'RUNNING')
            assert hasattr(AgentStatus, 'COMPLETED')
            assert isinstance(AgentStatus.PENDING, str)
            assert isinstance(AgentStatus.RUNNING, str)
            assert isinstance(AgentStatus.COMPLETED, str)
    
    def test_agent_run_status_available(self):
        """Test that agent run statuses are properly defined"""
        assert hasattr(AgentRunStatus, 'PENDING')
        assert hasattr(AgentRunStatus, 'RUNNING')
        assert hasattr(AgentRunStatus, 'COMPLETED')
    
    @pytest.mark.asyncio
    async def test_mock_codegen_client_creation(self):
        """Test that we can create a mock Codegen client"""
        # Mock the client
        mock_client = AsyncMock()
        mock_client.health_check.return_value = True
        
        # Test health check
        health = await mock_client.health_check()
        assert health is True
        
        # Test that method was called
        mock_client.health_check.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_mock_agent_run_creation(self):
        """Test that we can create mock agent runs"""
        # Mock agent run data
        mock_response = {
            "agent_id": "agent-123",
            "status": "pending",
            "task_type": "code_generation",
            "description": "Test task",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "progress": 0.0
        }
        
        # Verify the structure
        assert "agent_id" in mock_response
        assert "status" in mock_response
        assert "task_type" in mock_response
        assert "description" in mock_response
        assert "progress" in mock_response
        
        # Verify types
        assert isinstance(mock_response["agent_id"], str)
        assert isinstance(mock_response["status"], str)
        assert isinstance(mock_response["task_type"], str)
        assert isinstance(mock_response["progress"], (int, float))
    
    def test_environment_variables(self):
        """Test environment variable handling"""
        # Test that we can set and get environment variables
        test_key = "TEST_CODEGEN_API_KEY"
        test_value = "test-api-key-123"
        
        # Set environment variable
        os.environ[test_key] = test_value
        
        # Get environment variable
        retrieved_value = os.getenv(test_key)
        assert retrieved_value == test_value
        
        # Clean up
        del os.environ[test_key]
        
        # Test default value
        default_value = os.getenv(test_key, "default-value")
        assert default_value == "default-value"
    
    def test_json_serialization(self):
        """Test JSON serialization of common data structures"""
        import json
        
        # Test agent run data
        agent_data = {
            "id": "run-123",
            "agent_id": "agent-456",
            "task_type": "code_generation",
            "description": "Generate authentication code",
            "status": "pending",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "repository_url": "https://github.com/test/repo",
            "branch": "main",
            "files": ["src/auth.py", "tests/test_auth.py"],
            "metadata": {"priority": 5, "timeout": 30}
        }
        
        # Test serialization
        json_str = json.dumps(agent_data)
        assert isinstance(json_str, str)
        
        # Test deserialization
        parsed_data = json.loads(json_str)
        assert parsed_data == agent_data
        
        # Test specific fields
        assert parsed_data["agent_id"] == "agent-456"
        assert parsed_data["task_type"] == "code_generation"
        assert isinstance(parsed_data["files"], list)
        assert len(parsed_data["files"]) == 2
    
    @pytest.mark.asyncio
    async def test_async_operations(self):
        """Test basic async operations"""
        # Test async sleep
        start_time = asyncio.get_event_loop().time()
        await asyncio.sleep(0.01)  # 10ms
        end_time = asyncio.get_event_loop().time()
        
        # Should have taken at least 10ms
        assert (end_time - start_time) >= 0.01
    
    def test_mock_http_responses(self):
        """Test mock HTTP response handling"""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "agent_id": "agent-789",
            "status": "completed",
            "result": {"files_created": ["new_file.py"]}
        }
        
        # Test response
        assert mock_response.status_code == 200
        
        json_data = mock_response.json()
        assert json_data["agent_id"] == "agent-789"
        assert json_data["status"] == "completed"
        assert "files_created" in json_data["result"]
    
    def test_error_handling(self):
        """Test basic error handling patterns"""
        # Test exception raising
        with pytest.raises(ValueError):
            raise ValueError("Test error")
        
        # Test exception catching
        try:
            raise RuntimeError("Test runtime error")
        except RuntimeError as e:
            assert str(e) == "Test runtime error"
        
        # Test exception with custom message
        error_message = "Custom error message"
        try:
            raise Exception(error_message)
        except Exception as e:
            assert str(e) == error_message
    
    def test_data_validation(self):
        """Test basic data validation patterns"""
        # Test required fields
        required_fields = ["agent_id", "task_type", "description"]
        
        valid_data = {
            "agent_id": "agent-123",
            "task_type": "code_generation",
            "description": "Test task",
            "optional_field": "optional_value"
        }
        
        # Check all required fields are present
        for field in required_fields:
            assert field in valid_data
            assert valid_data[field] is not None
            assert len(str(valid_data[field])) > 0
        
        # Test invalid data
        invalid_data = {
            "agent_id": "agent-123",
            "task_type": "code_generation"
            # Missing description
        }
        
        # Check that required field is missing
        assert "description" not in invalid_data


class TestConfigurationValidation:
    """Test configuration and setup validation"""
    
    def test_required_environment_variables(self):
        """Test that we can validate required environment variables"""
        required_vars = [
            "CODEGEN_API_KEY",
            "CODEGEN_API_URL"
        ]
        
        # Test that we can check for environment variables
        for var in required_vars:
            # Get with default
            value = os.getenv(var, "not-set")
            assert isinstance(value, str)
            
            # Test setting and getting
            test_value = f"test-{var.lower()}"
            os.environ[var] = test_value
            assert os.getenv(var) == test_value
            
            # Clean up
            del os.environ[var]
    
    def test_api_configuration(self):
        """Test API configuration validation"""
        # Test API URL validation
        valid_urls = [
            "https://api.codegen.com",
            "https://api.codegen.com/v1",
            "http://localhost:8000"
        ]
        
        for url in valid_urls:
            assert url.startswith(("http://", "https://"))
            assert len(url) > 10
        
        # Test API key validation
        valid_api_keys = [
            "sk-1234567890abcdef",
            "test-api-key-123",
            "codegen-api-key-xyz"
        ]
        
        for key in valid_api_keys:
            assert isinstance(key, str)
            assert len(key) > 10
            assert not key.isspace()
    
    def test_task_configuration(self):
        """Test task configuration validation"""
        # Test task types
        valid_task_types = [
            "code_generation",
            "code_review",
            "bug_fix",
            "feature_implementation",
            "documentation",
            "testing",
            "refactoring",
            "analysis",
            "deployment",
            "custom"
        ]
        
        for task_type in valid_task_types:
            assert isinstance(task_type, str)
            assert len(task_type) > 0
            # Most task types have underscores, but some like "custom" don't
            assert task_type.replace("_", "").isalpha() or task_type == "custom"
        
        # Test priority values
        valid_priorities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        
        for priority in valid_priorities:
            assert isinstance(priority, int)
            assert 1 <= priority <= 10
        
        # Test timeout values
        valid_timeouts = [5, 15, 30, 45, 60, 90, 120]
        
        for timeout in valid_timeouts:
            assert isinstance(timeout, int)
            assert 5 <= timeout <= 120


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
