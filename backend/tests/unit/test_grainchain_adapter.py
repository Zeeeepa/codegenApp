"""
Unit tests for GrainchainAdapter - Real grainchain library integration
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.adapters.grainchain_adapter import GrainchainAdapter, GRAINCHAIN_AVAILABLE
from app.utils.exceptions import ActionNotFoundError


class TestGrainchainAdapter:
    """Test suite for GrainchainAdapter"""
    
    @pytest.fixture
    def adapter_config(self):
        """Configuration for grainchain adapter"""
        return {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 5,
            "working_directory": "/tmp",
            "environment_vars": {"TEST": "true"}
        }
    
    @pytest.fixture
    def grainchain_adapter(self, adapter_config):
        """Create GrainchainAdapter instance"""
        return GrainchainAdapter(adapter_config)
    
    def test_adapter_initialization(self, grainchain_adapter, adapter_config):
        """Test adapter initialization"""
        assert grainchain_adapter.default_provider == adapter_config["default_provider"]
        assert grainchain_adapter.default_timeout == adapter_config["default_timeout"]
        assert grainchain_adapter.max_concurrent_sandboxes == adapter_config["max_concurrent_sandboxes"]
        assert grainchain_adapter.working_directory == adapter_config["working_directory"]
        assert grainchain_adapter.active_sessions == {}
    
    @pytest.mark.asyncio
    async def test_health_check_healthy(self, grainchain_adapter):
        """Test health check when service is healthy"""
        result = await grainchain_adapter.health_check()
        
        if GRAINCHAIN_AVAILABLE:
            assert result == "healthy"
        else:
            assert result == "degraded: grainchain library not available"
    
    @pytest.mark.asyncio
    async def test_health_check_degraded_max_sandboxes(self, grainchain_adapter):
        """Test health check when max sandboxes reached"""
        # Fill up to max capacity
        for i in range(grainchain_adapter.max_concurrent_sandboxes + 1):
            grainchain_adapter.active_sessions[f"test-{i}"] = {"status": "running"}
        
        result = await grainchain_adapter.health_check()
        
        if GRAINCHAIN_AVAILABLE:
            assert result == "degraded: max sandboxes reached"
        else:
            assert result == "degraded: grainchain library not available"
    
    @pytest.mark.asyncio
    async def test_unknown_action(self, grainchain_adapter):
        """Test handling of unknown action"""
        context = {"parameters": {}}
        
        with pytest.raises(ActionNotFoundError):
            await grainchain_adapter.execute_action("unknown_action", context)
    
    @pytest.mark.asyncio
    async def test_cleanup(self, grainchain_adapter):
        """Test cleanup of active sessions"""
        # Add mock sessions
        mock_session = AsyncMock()
        grainchain_adapter.active_sessions["test-1"] = {"session": mock_session}
        grainchain_adapter.active_sessions["test-2"] = {"session": mock_session}
        
        await grainchain_adapter.cleanup()
        
        # Verify sessions were closed and removed
        assert len(grainchain_adapter.active_sessions) == 0
        assert mock_session.close.call_count == 2


class TestGrainchainAdapterActions:
    """Test suite for GrainchainAdapter actions"""
    
    @pytest.fixture
    def grainchain_adapter(self):
        """Create GrainchainAdapter instance"""
        config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 5,
            "working_directory": "/tmp"
        }
        return GrainchainAdapter(config)
    
    @pytest.mark.asyncio
    async def test_create_sandbox_missing_grainchain(self, grainchain_adapter):
        """Test create_sandbox when grainchain is not available"""
        context = {
            "parameters": {
                "provider": "local",
                "image": "python:3.11",
                "environment_vars": {"TEST": "true"}
            }
        }
        
        if not GRAINCHAIN_AVAILABLE:
            result = await grainchain_adapter.execute_action("create_sandbox", context)
            
            assert "sandbox_id" in result
            assert result["provider"] == "mock"
            assert result["status"] == "running"
            assert "created_at" in result
    
    @pytest.mark.asyncio
    async def test_execute_command_missing_grainchain(self, grainchain_adapter):
        """Test execute_command when grainchain is not available"""
        context = {
            "parameters": {
                "sandbox_id": "test-sandbox",
                "command": "echo 'Hello, World!'"
            }
        }
        
        if not GRAINCHAIN_AVAILABLE:
            result = await grainchain_adapter.execute_action("execute_command", context)
            
            assert result["sandbox_id"] == "test-sandbox"
            assert result["command"] == "echo 'Hello, World!'"
            assert result["stdout"] == "Mock command output"
            assert result["return_code"] == 0
            assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_max_sandboxes_limit(self, grainchain_adapter):
        """Test sandbox creation limit enforcement"""
        # Fill up to max capacity
        for i in range(grainchain_adapter.max_concurrent_sandboxes):
            grainchain_adapter.active_sessions[f"test-{i}"] = {"status": "running"}
        
        context = {
            "parameters": {
                "provider": "local",
                "image": "python:3.11"
            }
        }
        
        # This should fail due to max capacity
        with pytest.raises(Exception) as exc_info:
            await grainchain_adapter.execute_action("create_sandbox", context)
        
        assert "Maximum concurrent sandboxes" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_sandbox_not_found(self, grainchain_adapter):
        """Test get_sandbox with non-existent sandbox"""
        context = {
            "parameters": {
                "sandbox_id": "non-existent"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await grainchain_adapter.execute_action("get_sandbox", context)
        
        assert "not found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_destroy_sandbox_not_found(self, grainchain_adapter):
        """Test destroy_sandbox with non-existent sandbox"""
        context = {
            "parameters": {
                "sandbox_id": "non-existent"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await grainchain_adapter.execute_action("destroy_sandbox", context)
        
        assert "not found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_execute_command_missing_parameters(self, grainchain_adapter):
        """Test execute_command with missing required parameters"""
        # Missing command parameter
        context = {
            "parameters": {
                "sandbox_id": "test-sandbox"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await grainchain_adapter.execute_action("execute_command", context)
        
        assert "required" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_upload_file_missing_parameters(self, grainchain_adapter):
        """Test upload_file with missing required parameters"""
        # Missing content parameter
        context = {
            "parameters": {
                "sandbox_id": "test-sandbox",
                "path": "/tmp/test.txt"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await grainchain_adapter.execute_action("upload_file", context)
        
        assert "required" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_list_sandboxes_empty(self, grainchain_adapter):
        """Test list_sandboxes when no sandboxes exist"""
        context = {"parameters": {}}
        
        result = await grainchain_adapter.execute_action("list_sandboxes", context)
        
        assert result["sandboxes"] == []
        assert result["total"] == 0


@pytest.mark.skipif(not GRAINCHAIN_AVAILABLE, reason="Grainchain library not available")
class TestGrainchainAdapterWithRealLibrary:
    """Test suite for GrainchainAdapter with real grainchain library"""
    
    @pytest.fixture
    def grainchain_adapter(self):
        """Create GrainchainAdapter instance"""
        config = {
            "default_provider": "local",
            "default_timeout": 30,
            "max_concurrent_sandboxes": 2,
            "working_directory": "/tmp"
        }
        return GrainchainAdapter(config)
    
    @pytest.mark.asyncio
    async def test_create_and_destroy_sandbox_real(self, grainchain_adapter):
        """Test creating and destroying a real sandbox"""
        # Create sandbox
        create_context = {
            "parameters": {
                "provider": "local",
                "timeout": 30,
                "working_directory": "/tmp"
            }
        }
        
        create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
        
        assert "sandbox_id" in create_result
        assert create_result["provider"] == "local"
        assert create_result["status"] == "running"
        
        sandbox_id = create_result["sandbox_id"]
        
        # Verify sandbox exists
        get_context = {
            "parameters": {
                "sandbox_id": sandbox_id
            }
        }
        
        get_result = await grainchain_adapter.execute_action("get_sandbox", get_context)
        assert get_result["sandbox_id"] == sandbox_id
        
        # Destroy sandbox
        destroy_context = {
            "parameters": {
                "sandbox_id": sandbox_id
            }
        }
        
        destroy_result = await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
        assert destroy_result["destroyed"] is True
        assert destroy_result["sandbox_id"] == sandbox_id
    
    @pytest.mark.asyncio
    async def test_execute_command_real(self, grainchain_adapter):
        """Test executing a real command in sandbox"""
        # Create sandbox first
        create_context = {
            "parameters": {
                "provider": "local",
                "timeout": 30
            }
        }
        
        create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
        sandbox_id = create_result["sandbox_id"]
        
        try:
            # Execute command
            exec_context = {
                "parameters": {
                    "sandbox_id": sandbox_id,
                    "command": "echo 'Hello from grainchain!'"
                }
            }
            
            exec_result = await grainchain_adapter.execute_action("execute_command", exec_context)
            
            assert exec_result["sandbox_id"] == sandbox_id
            assert exec_result["command"] == "echo 'Hello from grainchain!'"
            assert "Hello from grainchain!" in exec_result["stdout"]
            assert exec_result["return_code"] == 0
            assert exec_result["success"] is True
            
        finally:
            # Cleanup
            destroy_context = {
                "parameters": {
                    "sandbox_id": sandbox_id
                }
            }
            await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
    
    @pytest.mark.asyncio
    async def test_file_operations_real(self, grainchain_adapter):
        """Test file upload/download operations"""
        # Create sandbox first
        create_context = {
            "parameters": {
                "provider": "local",
                "timeout": 30
            }
        }
        
        create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
        sandbox_id = create_result["sandbox_id"]
        
        try:
            # Upload file
            upload_context = {
                "parameters": {
                    "sandbox_id": sandbox_id,
                    "path": "/tmp/test_file.txt",
                    "content": "Hello, grainchain file operations!"
                }
            }
            
            upload_result = await grainchain_adapter.execute_action("upload_file", upload_context)
            assert upload_result["uploaded"] is True
            assert upload_result["path"] == "/tmp/test_file.txt"
            
            # Download file
            download_context = {
                "parameters": {
                    "sandbox_id": sandbox_id,
                    "path": "/tmp/test_file.txt"
                }
            }
            
            download_result = await grainchain_adapter.execute_action("download_file", download_context)
            assert download_result["content"] == "Hello, grainchain file operations!"
            
            # List files
            list_context = {
                "parameters": {
                    "sandbox_id": sandbox_id,
                    "path": "/tmp"
                }
            }
            
            list_result = await grainchain_adapter.execute_action("list_files", list_context)
            assert "files" in list_result
            assert list_result["total"] > 0
            
            # Check if our file is in the list
            file_names = [f["name"] for f in list_result["files"]]
            assert "test_file.txt" in file_names
            
        finally:
            # Cleanup
            destroy_context = {
                "parameters": {
                    "sandbox_id": sandbox_id
                }
            }
            await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)


class TestGrainchainAdapterErrorHandling:
    """Test suite for error handling in GrainchainAdapter"""
    
    @pytest.fixture
    def grainchain_adapter(self):
        """Create GrainchainAdapter instance"""
        config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 5,
            "working_directory": "/tmp"
        }
        return GrainchainAdapter(config)
    
    @pytest.mark.asyncio
    async def test_action_parameter_validation(self, grainchain_adapter):
        """Test parameter validation for various actions"""
        test_cases = [
            ("get_sandbox", {}, "sandbox_id parameter required"),
            ("destroy_sandbox", {}, "sandbox_id parameter required"),
            ("execute_command", {"sandbox_id": "test"}, "command parameters required"),
            ("upload_file", {"sandbox_id": "test"}, "content parameters required"),
            ("download_file", {"sandbox_id": "test"}, "path parameters required"),
            ("create_snapshot", {}, "sandbox_id parameter required"),
            ("restore_snapshot", {"sandbox_id": "test"}, "snapshot_id parameters required"),
            ("get_sandbox_status", {}, "sandbox_id parameter required"),
        ]
        
        for action, params, expected_error in test_cases:
            context = {"parameters": params}
            
            with pytest.raises(Exception) as exc_info:
                await grainchain_adapter.execute_action(action, context)
            
            assert "required" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_session_not_found_errors(self, grainchain_adapter):
        """Test error handling when sandbox session is not found"""
        actions_requiring_session = [
            "get_sandbox",
            "destroy_sandbox", 
            "execute_command",
            "upload_file",
            "download_file",
            "create_snapshot",
            "restore_snapshot",
            "get_sandbox_status"
        ]
        
        for action in actions_requiring_session:
            context = {
                "parameters": {
                    "sandbox_id": "non-existent-sandbox",
                    "command": "test",  # For execute_command
                    "path": "/test",    # For file operations
                    "content": "test",  # For upload_file
                    "snapshot_id": "test"  # For restore_snapshot
                }
            }
            
            with pytest.raises(Exception) as exc_info:
                await grainchain_adapter.execute_action(action, context)
            
            assert "not found" in str(exc_info.value)


class TestGrainchainAdapterPerformance:
    """Performance tests for GrainchainAdapter"""
    
    @pytest.fixture
    def grainchain_adapter(self):
        """Create GrainchainAdapter instance"""
        config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 10,
            "working_directory": "/tmp"
        }
        return GrainchainAdapter(config)
    
    @pytest.mark.asyncio
    async def test_concurrent_sandbox_creation(self, grainchain_adapter, performance_timer):
        """Test concurrent sandbox creation performance"""
        if not GRAINCHAIN_AVAILABLE:
            pytest.skip("Grainchain library not available")
        
        num_sandboxes = 3
        
        async def create_sandbox(i):
            context = {
                "parameters": {
                    "provider": "local",
                    "timeout": 30,
                    "working_directory": f"/tmp/test_{i}"
                }
            }
            return await grainchain_adapter.execute_action("create_sandbox", context)
        
        performance_timer.start()
        
        # Create sandboxes concurrently
        tasks = [create_sandbox(i) for i in range(num_sandboxes)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        performance_timer.stop()
        
        # Verify results
        successful_creates = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_creates) <= grainchain_adapter.max_concurrent_sandboxes
        
        # Cleanup
        for result in successful_creates:
            if isinstance(result, dict) and "sandbox_id" in result:
                try:
                    destroy_context = {
                        "parameters": {
                            "sandbox_id": result["sandbox_id"]
                        }
                    }
                    await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
                except:
                    pass  # Ignore cleanup errors
        
        # Performance assertion
        assert performance_timer.elapsed < 10.0  # Should complete within 10 seconds
    
    @pytest.mark.asyncio
    async def test_health_check_performance(self, grainchain_adapter, performance_timer):
        """Test health check performance"""
        performance_timer.start()
        
        # Run health check multiple times
        for _ in range(10):
            await grainchain_adapter.health_check()
        
        performance_timer.stop()
        
        # Health checks should be very fast
        assert performance_timer.elapsed < 1.0  # Should complete within 1 second
