"""
Pytest configuration and shared fixtures for strands-agents backend tests
"""

import pytest
import asyncio
from typing import Dict, Any, AsyncGenerator
from unittest.mock import AsyncMock, MagicMock
import tempfile
import os

from app.config.settings import Settings
from app.core.workflow.engine import WorkflowEngine, WorkflowEngineFactory
from app.core.orchestration.coordinator import ServiceCoordinator
from app.core.orchestration.state_manager import StateManagerFactory, WorkflowStateManager
from app.services.adapters.codegen_adapter import CodegenService
from app.services.adapters.grainchain_adapter import GrainchainAdapter
from app.models.domain.workflow import WorkflowDefinition, WorkflowStep, WorkflowExecution


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_settings() -> Settings:
    """Test settings configuration"""
    return Settings(
        debug=True,
        log_level="DEBUG",
        codegen_api_token="test-token",
        codegen_api_base_url="https://api.test.com",
        database_url="sqlite:///./test.db",
        redis_url="redis://localhost:6379/1",
        grainchain_config={
            "default_provider": "local",
            "docker_host": "unix://var/run/docker.sock",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 5,
            "working_directory": "/tmp"
        },
        workflow_config={
            "max_concurrent_workflows": 10,
            "default_timeout": 300,
            "retry_attempts": 2,
            "retry_delay": 1
        }
    )


@pytest.fixture
async def state_manager() -> AsyncGenerator[WorkflowStateManager, None]:
    """Create test state manager"""
    manager = StateManagerFactory.create_in_memory_manager()
    await manager.start()
    yield manager
    await manager.stop()


@pytest.fixture
def service_coordinator() -> ServiceCoordinator:
    """Create test service coordinator"""
    return ServiceCoordinator()


@pytest.fixture
def mock_codegen_adapter() -> CodegenService:
    """Create mock codegen adapter"""
    adapter = MagicMock(spec=CodegenService)
    adapter.execute_action = AsyncMock()
    adapter.health_check = AsyncMock(return_value="healthy")
    adapter.cleanup = AsyncMock()
    
    # Mock specific methods
    adapter.get_current_user = AsyncMock(return_value={
        "id": "test-user",
        "github_username": "testuser",
        "email": "test@example.com"
    })
    adapter.validate_token = AsyncMock(return_value={
        "id": "test-user",
        "github_username": "testuser", 
        "email": "test@example.com"
    })
    
    return adapter


@pytest.fixture
def mock_grainchain_adapter() -> GrainchainAdapter:
    """Create mock grainchain adapter"""
    config = {
        "default_provider": "local",
        "default_timeout": 60,
        "max_concurrent_sandboxes": 5,
        "working_directory": "/tmp"
    }
    adapter = GrainchainAdapter(config)
    
    # Mock the execute_action method
    adapter.execute_action = AsyncMock()
    adapter.health_check = AsyncMock(return_value="healthy")
    adapter.cleanup = AsyncMock()
    
    return adapter


@pytest.fixture
async def workflow_engine(
    service_coordinator: ServiceCoordinator,
    state_manager: WorkflowStateManager,
    mock_codegen_adapter: CodegenService,
    mock_grainchain_adapter: GrainchainAdapter
) -> WorkflowEngine:
    """Create test workflow engine with mocked adapters"""
    # Register mock adapters
    service_coordinator.register_adapter("codegen", mock_codegen_adapter)
    service_coordinator.register_adapter("grainchain", mock_grainchain_adapter)
    
    # Create engine
    engine = WorkflowEngineFactory.create_engine(
        coordinator=service_coordinator,
        state_manager=state_manager
    )
    
    return engine


@pytest.fixture
def sample_workflow_definition() -> WorkflowDefinition:
    """Create a sample workflow definition for testing"""
    return WorkflowDefinition(
        id="test-workflow",
        name="Test Workflow",
        description="A test workflow for unit testing",
        version="1.0.0",
        steps=[
            WorkflowStep(
                id="step-1",
                name="Test Step 1",
                service="codegen",
                action="create_agent_run",
                parameters={"prompt": "Test prompt"},
                timeout=60,
                retry_count=1
            ),
            WorkflowStep(
                id="step-2", 
                name="Test Step 2",
                service="grainchain",
                action="create_sandbox",
                parameters={"image": "python:3.11"},
                depends_on=["step-1"],
                timeout=120,
                retry_count=2
            )
        ],
        timeout=300,
        metadata={"test": True},
        tags=["test", "sample"]
    )


@pytest.fixture
def sample_workflow_execution(sample_workflow_definition: WorkflowDefinition) -> WorkflowExecution:
    """Create a sample workflow execution for testing"""
    return WorkflowExecution(
        id="test-execution-123",
        workflow=sample_workflow_definition,
        organization_id=1,
        user_id="test-user",
        parameters={"test_param": "test_value"}
    )


@pytest.fixture
def temp_directory():
    """Create a temporary directory for tests"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def mock_file_system(temp_directory):
    """Create a mock file system structure for testing"""
    # Create test files and directories
    test_files = {
        "test.py": "print('Hello, World!')",
        "requirements.txt": "fastapi==0.104.1\nuvicorn==0.24.0",
        "config.json": '{"test": true}',
        "data/sample.csv": "name,age\nJohn,30\nJane,25",
        "scripts/deploy.sh": "#!/bin/bash\necho 'Deploying...'"
    }
    
    for file_path, content in test_files.items():
        full_path = os.path.join(temp_directory, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)
    
    return temp_directory


# Test data fixtures
@pytest.fixture
def sample_execution_result():
    """Sample execution result for testing"""
    return {
        "stdout": "Command executed successfully",
        "stderr": "",
        "return_code": 0,
        "success": True,
        "execution_time": 1.5,
        "timestamp": 1640995200.0
    }


@pytest.fixture
def sample_sandbox_info():
    """Sample sandbox information for testing"""
    return {
        "sandbox_id": "test-sandbox-123",
        "provider": "local",
        "status": "running",
        "created_at": "2024-01-01T00:00:00Z",
        "working_directory": "/tmp",
        "environment_vars": {"TEST": "true"}
    }


@pytest.fixture
def sample_file_list():
    """Sample file list for testing"""
    return [
        {
            "path": "/tmp/test.py",
            "name": "test.py",
            "size": 1024,
            "is_directory": False,
            "modified_time": 1640995200.0,
            "permissions": "rw-r--r--"
        },
        {
            "path": "/tmp/data",
            "name": "data",
            "size": 4096,
            "is_directory": True,
            "modified_time": 1640995200.0,
            "permissions": "rwxr-xr-x"
        }
    ]


# Async test helpers
@pytest.fixture
def async_mock():
    """Helper to create async mocks"""
    def _async_mock(*args, **kwargs):
        mock = AsyncMock(*args, **kwargs)
        return mock
    return _async_mock


# Error simulation fixtures
@pytest.fixture
def simulate_timeout_error():
    """Simulate timeout error for testing"""
    def _error():
        raise asyncio.TimeoutError("Operation timed out")
    return _error


@pytest.fixture
def simulate_connection_error():
    """Simulate connection error for testing"""
    def _error():
        raise ConnectionError("Connection failed")
    return _error


# Performance testing fixtures
@pytest.fixture
def performance_timer():
    """Timer for performance testing"""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
    
    return Timer()


# Cleanup helpers
@pytest.fixture(autouse=True)
async def cleanup_after_test():
    """Automatic cleanup after each test"""
    yield
    # Cleanup code here if needed
    pass
