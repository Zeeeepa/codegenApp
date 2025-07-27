"""
Test suite for Codegen Agent API integration.
Tests the comprehensive client and API routes for single-user operation.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from fastapi.testclient import TestClient

from backend.app.services.codegen_client import (
    CodegenAgentClient, CodegenAgentRequest, AgentResponse, StreamingUpdate,
    TaskType, AgentStatus, create_code_generation_task
)
from backend.app.main import app

client = TestClient(app)


class TestCodegenAgentClient:
    """Test Codegen Agent API client functionality"""
    
    @pytest.fixture
    def mock_httpx_client(self):
        """Mock httpx client for testing"""
        with patch('backend.app.services.codegen_client.httpx.AsyncClient') as mock:
            yield mock
    
    @pytest.fixture
    def codegen_client(self, mock_httpx_client):
        """Create a Codegen client with mocked HTTP client"""
        with patch.dict('os.environ', {'CODEGEN_API_KEY': 'test-api-key'}):
            return CodegenAgentClient()
    
    def test_client_initialization(self):
        """Test client initialization with API key"""
        with patch.dict('os.environ', {'CODEGEN_API_KEY': 'test-key'}):
            client = CodegenAgentClient()
            assert client.api_key == 'test-key'
            assert client.base_url == 'https://api.codegen.com'
    
    def test_client_initialization_no_api_key(self):
        """Test client initialization fails without API key"""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError, match="CODEGEN_API_KEY environment variable is required"):
                CodegenAgentClient()
    
    @pytest.mark.asyncio
    async def test_create_agent_run(self, codegen_client):
        """Test creating an agent run"""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "agent_id": "agent-123",
            "status": "pending",
            "task_type": "code_generation",
            "description": "Test task",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "progress": 0.0
        }
        mock_response.raise_for_status = Mock()
        
        codegen_client.client.post = AsyncMock(return_value=mock_response)
        
        # Create request
        request = CodegenAgentRequest(
            task_type=TaskType.CODE_GENERATION,
            description="Test task",
            repository_url="https://github.com/test/repo",
            branch="main"
        )
        
        # Execute
        response = await codegen_client.create_agent_run(request)
        
        # Verify
        assert response.agent_id == "agent-123"
        assert response.status == AgentStatus.PENDING
        assert response.task_type == TaskType.CODE_GENERATION
        assert response.description == "Test task"
        
        # Verify API call
        codegen_client.client.post.assert_called_once_with(
            "/v1/agents/runs",
            json={
                "task_type": "code_generation",
                "description": "Test task",
                "repository_url": "https://github.com/test/repo",
                "branch": "main",
                "priority": 5,
                "timeout_minutes": 30,
                "streaming": True,
                "metadata": {}
            }
        )
    
    @pytest.mark.asyncio
    async def test_get_agent_run(self, codegen_client):
        """Test getting an agent run"""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "agent_id": "agent-123",
            "status": "completed",
            "task_type": "code_generation",
            "description": "Test task",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:01:00Z",
            "progress": 1.0,
            "result": {"files_created": ["test.py"]}
        }
        mock_response.raise_for_status = Mock()
        
        codegen_client.client.get = AsyncMock(return_value=mock_response)
        
        # Execute
        response = await codegen_client.get_agent_run("agent-123")
        
        # Verify
        assert response.agent_id == "agent-123"
        assert response.status == AgentStatus.COMPLETED
        assert response.progress == 1.0
        assert response.result == {"files_created": ["test.py"]}
        
        # Verify API call
        codegen_client.client.get.assert_called_once_with("/v1/agents/runs/agent-123")
    
    @pytest.mark.asyncio
    async def test_list_agent_runs(self, codegen_client):
        """Test listing agent runs with filtering"""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "runs": [
                {
                    "agent_id": "agent-123",
                    "status": "completed",
                    "task_type": "code_generation",
                    "description": "Test task 1",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:01:00Z",
                    "progress": 1.0
                },
                {
                    "agent_id": "agent-456",
                    "status": "running",
                    "task_type": "code_review",
                    "description": "Test task 2",
                    "created_at": "2024-01-01T00:02:00Z",
                    "updated_at": "2024-01-01T00:03:00Z",
                    "progress": 0.5
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        
        codegen_client.client.get = AsyncMock(return_value=mock_response)
        
        # Execute
        runs = await codegen_client.list_agent_runs(
            status=AgentStatus.RUNNING,
            task_type=TaskType.CODE_REVIEW,
            limit=10
        )
        
        # Verify
        assert len(runs) == 2
        assert runs[0].agent_id == "agent-123"
        assert runs[1].agent_id == "agent-456"
        
        # Verify API call
        codegen_client.client.get.assert_called_once_with(
            "/v1/agents/runs",
            params={
                "limit": 10,
                "offset": 0,
                "status": "running",
                "task_type": "code_review"
            }
        )
    
    @pytest.mark.asyncio
    async def test_cancel_agent_run(self, codegen_client):
        """Test cancelling an agent run"""
        # Mock response
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        
        codegen_client.client.post = AsyncMock(return_value=mock_response)
        
        # Execute
        success = await codegen_client.cancel_agent_run("agent-123")
        
        # Verify
        assert success is True
        
        # Verify API call
        codegen_client.client.post.assert_called_once_with("/v1/agents/runs/agent-123/cancel")
    
    @pytest.mark.asyncio
    async def test_stream_agent_updates(self, codegen_client):
        """Test streaming agent updates"""
        # Mock streaming response
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        
        # Mock streaming lines
        async def mock_aiter_lines():
            yield "data: {\"timestamp\": \"2024-01-01T00:00:00Z\", \"event_type\": \"progress\", \"data\": {\"progress\": 0.5}}"
            yield "data: {\"timestamp\": \"2024-01-01T00:01:00Z\", \"event_type\": \"completion\", \"data\": {\"result\": \"success\"}}"
        
        mock_response.aiter_lines = mock_aiter_lines
        
        # Mock context manager
        mock_stream = AsyncMock()
        mock_stream.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream.__aexit__ = AsyncMock(return_value=None)
        
        codegen_client.client.stream = Mock(return_value=mock_stream)
        
        # Execute
        updates = []
        async for update in codegen_client.stream_agent_updates("agent-123"):
            updates.append(update)
        
        # Verify
        assert len(updates) == 2
        assert updates[0].event_type == "progress"
        assert updates[0].data == {"progress": 0.5}
        assert updates[1].event_type == "completion"
        assert updates[1].data == {"result": "success"}
    
    @pytest.mark.asyncio
    async def test_health_check(self, codegen_client):
        """Test health check"""
        # Mock response
        mock_response = Mock()
        mock_response.status_code = 200
        
        codegen_client.client.get = AsyncMock(return_value=mock_response)
        
        # Execute
        healthy = await codegen_client.health_check()
        
        # Verify
        assert healthy is True
        
        # Verify API call
        codegen_client.client.get.assert_called_once_with("/health")
    
    @pytest.mark.asyncio
    async def test_get_api_info(self, codegen_client):
        """Test getting API info"""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "version": "1.0.0",
            "capabilities": ["streaming", "webhooks"],
            "limits": {"max_timeout": 120}
        }
        mock_response.raise_for_status = Mock()
        
        codegen_client.client.get = AsyncMock(return_value=mock_response)
        
        # Execute
        info = await codegen_client.get_api_info()
        
        # Verify
        assert info["version"] == "1.0.0"
        assert "streaming" in info["capabilities"]
        
        # Verify API call
        codegen_client.client.get.assert_called_once_with("/v1/info")


class TestConvenienceFunctions:
    """Test convenience functions for common operations"""
    
    @pytest.mark.asyncio
    async def test_create_code_generation_task(self):
        """Test code generation convenience function"""
        with patch('backend.app.services.codegen_client.CodegenAgentClient') as mock_client_class:
            # Mock client instance
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock response
            mock_response = AgentResponse(
                agent_id="agent-123",
                status=AgentStatus.PENDING,
                task_type=TaskType.CODE_GENERATION,
                description="Generate code",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                progress=0.0
            )
            mock_client.create_agent_run.return_value = mock_response
            
            # Execute
            response = await create_code_generation_task(
                description="Generate code",
                repository_url="https://github.com/test/repo",
                branch="main",
                files=["test.py"]
            )
            
            # Verify
            assert response.agent_id == "agent-123"
            assert response.task_type == TaskType.CODE_GENERATION
            
            # Verify client was called correctly
            mock_client.create_agent_run.assert_called_once()
            call_args = mock_client.create_agent_run.call_args[0][0]
            assert call_args.task_type == TaskType.CODE_GENERATION
            assert call_args.description == "Generate code"
            assert call_args.repository_url == "https://github.com/test/repo"
            assert call_args.branch == "main"
            assert call_args.files == ["test.py"]


class TestAgentAPIRoutes:
    """Test Agent API routes without authentication"""
    
    def test_create_agent_run_endpoint(self):
        """Test creating agent run via API endpoint"""
        with patch('backend.app.api.v1.routes.agents.get_global_client') as mock_get_client:
            # Mock client and response
            mock_client = AsyncMock()
            mock_get_client.return_value = mock_client
            
            mock_codegen_response = AgentResponse(
                agent_id="agent-123",
                status=AgentStatus.PENDING,
                task_type=TaskType.CODE_GENERATION,
                description="Test task",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                progress=0.0
            )
            mock_client.create_agent_run.return_value = mock_codegen_response
            
            # Mock database operations
            with patch('backend.app.api.v1.routes.agents.agent_run_repo') as mock_repo:
                mock_saved_run = Mock()
                mock_saved_run.id = "local-123"
                mock_repo.create.return_value = mock_saved_run
                
                # Mock notification service
                with patch('backend.app.api.v1.routes.agents.notification_service') as mock_notif:
                    mock_notif.send_notification = AsyncMock()
                    
                    # Make request
                    response = client.post("/api/v1/agents/runs", json={
                        "task_type": "code_generation",
                        "description": "Test task",
                        "repository_url": "https://github.com/test/repo",
                        "branch": "main",
                        "priority": 5,
                        "timeout_minutes": 30,
                        "streaming": True
                    })
                    
                    # Verify response
                    assert response.status_code == 200
                    data = response.json()
                    assert data["agent_id"] == "agent-123"
                    assert data["task_type"] == "code_generation"
                    assert data["description"] == "Test task"
    
    def test_list_agent_runs_endpoint(self):
        """Test listing agent runs via API endpoint"""
        with patch('backend.app.api.v1.routes.agents.agent_run_repo') as mock_repo:
            # Mock database response
            mock_run = Mock()
            mock_run.id = "local-123"
            mock_run.agent_id = "agent-123"
            mock_run.task_type = "code_generation"
            mock_run.description = "Test task"
            mock_run.status.value = "pending"
            mock_run.progress = 0.0
            mock_run.created_at = datetime.utcnow()
            mock_run.updated_at = datetime.utcnow()
            mock_run.repository_url = "https://github.com/test/repo"
            mock_run.branch = "main"
            mock_run.files = None
            mock_run.result = None
            mock_run.error = None
            mock_run.logs = None
            mock_run.artifacts = None
            mock_run.metrics = None
            
            mock_repo.list_runs.return_value = [mock_run]
            
            # Make request
            response = client.get("/api/v1/agents/runs")
            
            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["agent_id"] == "agent-123"
            assert data[0]["task_type"] == "code_generation"
    
    def test_get_agent_run_endpoint(self):
        """Test getting specific agent run via API endpoint"""
        with patch('backend.app.api.v1.routes.agents.agent_run_repo') as mock_repo:
            with patch('backend.app.api.v1.routes.agents.get_global_client') as mock_get_client:
                # Mock database response
                mock_run = Mock()
                mock_run.id = "local-123"
                mock_run.agent_id = "agent-123"
                mock_run.task_type = "code_generation"
                mock_run.description = "Test task"
                mock_run.status.value = "completed"
                mock_run.progress = 1.0
                mock_run.created_at = datetime.utcnow()
                mock_run.updated_at = datetime.utcnow()
                mock_run.repository_url = "https://github.com/test/repo"
                mock_run.branch = "main"
                mock_run.files = None
                mock_run.result = {"success": True}
                mock_run.error = None
                mock_run.logs = ["Log entry 1"]
                mock_run.artifacts = None
                mock_run.metrics = None
                
                mock_repo.get_by_agent_id.return_value = mock_run
                
                # Mock Codegen API response
                mock_client = AsyncMock()
                mock_get_client.return_value = mock_client
                
                mock_codegen_response = AgentResponse(
                    agent_id="agent-123",
                    status=AgentStatus.COMPLETED,
                    task_type=TaskType.CODE_GENERATION,
                    description="Test task",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    progress=1.0,
                    result={"success": True},
                    logs=["Log entry 1", "Log entry 2"]
                )
                mock_client.get_agent_run.return_value = mock_codegen_response
                
                # Make request
                response = client.get("/api/v1/agents/runs/agent-123")
                
                # Verify response
                assert response.status_code == 200
                data = response.json()
                assert data["agent_id"] == "agent-123"
                assert data["status"] == "completed"
                assert data["progress"] == 1.0
                assert data["result"] == {"success": True}
    
    def test_cancel_agent_run_endpoint(self):
        """Test cancelling agent run via API endpoint"""
        with patch('backend.app.api.v1.routes.agents.get_global_client') as mock_get_client:
            with patch('backend.app.api.v1.routes.agents.agent_run_repo') as mock_repo:
                with patch('backend.app.api.v1.routes.agents.notification_service') as mock_notif:
                    # Mock client
                    mock_client = AsyncMock()
                    mock_get_client.return_value = mock_client
                    mock_client.cancel_agent_run.return_value = True
                    
                    # Mock database
                    mock_run = Mock()
                    mock_repo.get_by_agent_id.return_value = mock_run
                    mock_repo.update.return_value = mock_run
                    
                    # Mock notification
                    mock_notif.send_notification = AsyncMock()
                    
                    # Make request
                    response = client.post("/api/v1/agents/runs/agent-123/cancel")
                    
                    # Verify response
                    assert response.status_code == 200
                    data = response.json()
                    assert data["message"] == "Agent run cancelled successfully"
    
    def test_get_agent_status_endpoint(self):
        """Test getting agent system status"""
        with patch('backend.app.api.v1.routes.agents.get_global_client') as mock_get_client:
            with patch('backend.app.api.v1.routes.agents.agent_run_repo') as mock_repo:
                # Mock client
                mock_client = AsyncMock()
                mock_get_client.return_value = mock_client
                mock_client.health_check.return_value = True
                
                # Mock database
                mock_runs = [
                    Mock(status=Mock(value="completed")),
                    Mock(status=Mock(value="running")),
                    Mock(status=Mock(value="failed"))
                ]
                mock_repo.list_runs.return_value = mock_runs
                
                # Make request
                response = client.get("/api/v1/agents/status")
                
                # Verify response
                assert response.status_code == 200
                data = response.json()
                assert data["codegen_api_healthy"] is True
                assert data["total_runs"] == 3
                assert data["running_runs"] == 1
                assert data["completed_runs"] == 1
                assert data["failed_runs"] == 1
                assert data["success_rate"] == 33.333333333333336  # 1/3 * 100


class TestHealthCheckRoutes:
    """Test simple health check routes without authentication"""
    
    def test_basic_health_check(self):
        """Test basic health check endpoint"""
        with patch('backend.app.api.v1.routes.simple_health.DatabaseManager') as mock_db:
            with patch('backend.app.api.v1.routes.simple_health.get_global_client') as mock_get_client:
                # Mock database
                mock_db_instance = Mock()
                mock_db_instance.health_check.return_value = True
                mock_db.return_value = mock_db_instance
                
                # Mock Codegen client
                mock_client = AsyncMock()
                mock_get_client.return_value = mock_client
                mock_client.health_check.return_value = True
                
                # Make request
                response = client.get("/api/v1/health/")
                
                # Verify response
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
                assert data["components"]["database"] == "healthy"
                assert data["components"]["codegen_api"] == "healthy"
    
    def test_detailed_health_check(self):
        """Test detailed health check endpoint"""
        with patch('backend.app.api.v1.routes.simple_health.DatabaseManager') as mock_db:
            with patch('backend.app.api.v1.routes.simple_health.get_global_client') as mock_get_client:
                # Mock database
                mock_db_instance = Mock()
                mock_db_instance.health_check.return_value = True
                mock_db.return_value = mock_db_instance
                
                # Mock Codegen client
                mock_client = AsyncMock()
                mock_get_client.return_value = mock_client
                mock_client.health_check.return_value = True
                mock_client.get_api_info.return_value = {"version": "1.0.0"}
                
                # Make request
                response = client.get("/api/v1/health/detailed")
                
                # Verify response
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
                assert data["system_info"]["single_user_mode"] is True
                assert data["system_info"]["authentication"] == "disabled"
                assert data["system_info"]["codegen_integration"] == "enabled"
    
    def test_codegen_status_endpoint(self):
        """Test Codegen-specific status endpoint"""
        with patch('backend.app.api.v1.routes.simple_health.get_global_client') as mock_get_client:
            # Mock client
            mock_client = AsyncMock()
            mock_get_client.return_value = mock_client
            mock_client.health_check.return_value = True
            mock_client.get_api_info.return_value = {
                "version": "1.0.0",
                "capabilities": ["streaming", "webhooks"]
            }
            
            # Make request
            response = client.get("/api/v1/health/codegen")
            
            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["api_info"]["version"] == "1.0.0"
            assert data["capabilities"]["streaming"] is True
            assert "code_generation" in data["capabilities"]["task_types"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
