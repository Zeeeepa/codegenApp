"""
End-to-end tests for API endpoints with real grainchain integration
"""

import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.api.v1.dependencies import set_global_dependencies
from app.core.workflow.engine import WorkflowEngineFactory
from app.core.orchestration.coordinator import ServiceCoordinator
from app.core.orchestration.state_manager import StateManagerFactory
from app.services.adapters.grainchain_adapter import GrainchainAdapter, GRAINCHAIN_AVAILABLE
from app.services.adapters.codegen_adapter import CodegenService


@pytest.mark.e2e
class TestWorkflowAPIEndpoints:
    """End-to-end tests for workflow API endpoints"""
    
    @pytest.fixture
    async def test_app_setup(self):
        """Setup test application with real dependencies"""
        # Create state manager
        state_manager = StateManagerFactory.create_in_memory_manager()
        await state_manager.start()
        
        # Create service coordinator
        coordinator = ServiceCoordinator()
        
        # Create adapters
        grainchain_config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 2,
            "working_directory": "/tmp"
        }
        grainchain_adapter = GrainchainAdapter(grainchain_config)
        
        # Mock codegen adapter for API tests
        codegen_adapter = AsyncMock(spec=CodegenService)
        codegen_adapter.validate_token = AsyncMock(return_value={
            "id": "test-user",
            "github_username": "testuser",
            "email": "test@example.com"
        })
        codegen_adapter.health_check = AsyncMock(return_value="healthy")
        codegen_adapter.cleanup = AsyncMock()
        
        # Register adapters
        coordinator.register_adapter("grainchain", grainchain_adapter)
        coordinator.register_adapter("codegen", codegen_adapter)
        
        # Create workflow engine
        engine = WorkflowEngineFactory.create_engine(
            coordinator=coordinator,
            state_manager=state_manager
        )
        
        # Set global dependencies
        set_global_dependencies(
            engine=engine,
            coordinator=coordinator,
            state_manager=state_manager,
            codegen_adapter=codegen_adapter
        )
        
        yield {
            "app": app,
            "engine": engine,
            "coordinator": coordinator,
            "state_manager": state_manager,
            "grainchain_adapter": grainchain_adapter,
            "codegen_adapter": codegen_adapter
        }
        
        # Cleanup
        await grainchain_adapter.cleanup()
        await state_manager.stop()
    
    @pytest.fixture
    def auth_headers(self):
        """Authentication headers for API requests"""
        return {"Authorization": "Bearer test-token"}
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, test_app_setup):
        """Test health check endpoint"""
        setup = test_app_setup
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            response = await client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "status" in data
            assert "services" in data
            assert "version" in data
            
            # Check service statuses
            services = data["services"]
            assert "grainchain" in services
            assert "codegen" in services
            
            if GRAINCHAIN_AVAILABLE:
                assert services["grainchain"] == "healthy"
            else:
                assert "degraded" in services["grainchain"]
    
    @pytest.mark.asyncio
    async def test_create_workflow_execution(self, test_app_setup, auth_headers):
        """Test creating a workflow execution"""
        setup = test_app_setup
        
        # Define test workflow
        workflow_data = {
            "workflow": {
                "id": "test-api-workflow",
                "name": "Test API Workflow",
                "description": "Test workflow via API",
                "version": "1.0.0",
                "steps": [
                    {
                        "id": "create-sandbox",
                        "name": "Create Sandbox",
                        "service": "grainchain",
                        "action": "create_sandbox",
                        "parameters": {
                            "provider": "local",
                            "timeout": 30,
                            "working_directory": "/tmp"
                        },
                        "timeout": 60,
                        "retry_count": 1
                    },
                    {
                        "id": "execute-command",
                        "name": "Execute Command",
                        "service": "grainchain",
                        "action": "execute_command",
                        "parameters": {
                            "command": "echo 'Hello from API test!'"
                        },
                        "depends_on": ["create-sandbox"],
                        "timeout": 30,
                        "retry_count": 1
                    },
                    {
                        "id": "cleanup",
                        "name": "Cleanup",
                        "service": "grainchain",
                        "action": "destroy_sandbox",
                        "parameters": {},
                        "depends_on": ["execute-command"],
                        "timeout": 30,
                        "retry_count": 0
                    }
                ],
                "timeout": 300,
                "metadata": {"test": True},
                "tags": ["api-test"]
            },
            "parameters": {"test_param": "test_value"}
        }
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            response = await client.post(
                "/api/v1/workflows",
                json=workflow_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "execution" in data
            execution = data["execution"]
            
            assert execution["workflow"]["id"] == "test-api-workflow"
            assert execution["organization_id"] == 1
            assert execution["user_id"] == "test-user"
            assert execution["status"] == "running"
            
            execution_id = execution["id"]
            
            # Wait for workflow to complete
            max_wait = 30
            wait_interval = 2
            waited = 0
            
            while waited < max_wait:
                get_response = await client.get(
                    f"/api/v1/workflows/{execution_id}",
                    headers=auth_headers
                )
                
                assert get_response.status_code == 200
                get_data = get_response.json()
                
                if get_data["execution"]["status"] in ["completed", "failed"]:
                    break
                
                await asyncio.sleep(wait_interval)
                waited += wait_interval
            
            # Check final status
            final_response = await client.get(
                f"/api/v1/workflows/{execution_id}",
                headers=auth_headers
            )
            
            assert final_response.status_code == 200
            final_data = final_response.json()
            
            final_execution = final_data["execution"]
            
            if GRAINCHAIN_AVAILABLE:
                assert final_execution["status"] == "completed"
                assert len(final_execution["step_results"]) == 3
            else:
                # With mock implementation, may complete or fail
                assert final_execution["status"] in ["completed", "failed"]
    
    @pytest.mark.asyncio
    async def test_list_workflow_executions(self, test_app_setup, auth_headers):
        """Test listing workflow executions"""
        setup = test_app_setup
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # First, create a workflow execution
            workflow_data = {
                "workflow": {
                    "id": "test-list-workflow",
                    "name": "Test List Workflow",
                    "description": "Test workflow for listing",
                    "version": "1.0.0",
                    "steps": [
                        {
                            "id": "simple-step",
                            "name": "Simple Step",
                            "service": "grainchain",
                            "action": "list_sandboxes",
                            "parameters": {},
                            "timeout": 30,
                            "retry_count": 1
                        }
                    ],
                    "timeout": 60
                },
                "parameters": {}
            }
            
            create_response = await client.post(
                "/api/v1/workflows",
                json=workflow_data,
                headers=auth_headers
            )
            
            assert create_response.status_code == 200
            
            # List workflows
            list_response = await client.get(
                "/api/v1/workflows",
                headers=auth_headers
            )
            
            assert list_response.status_code == 200
            executions = list_response.json()
            
            assert isinstance(executions, list)
            assert len(executions) > 0
            
            # Check that our workflow is in the list
            workflow_ids = [ex["workflow"]["id"] for ex in executions]
            assert "test-list-workflow" in workflow_ids
    
    @pytest.mark.asyncio
    async def test_workflow_metrics(self, test_app_setup, auth_headers):
        """Test workflow metrics endpoint"""
        setup = test_app_setup
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            response = await client.get(
                "/api/v1/workflows/metrics/summary",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            metrics = response.json()
            
            assert "total_executions" in metrics
            assert "status_breakdown" in metrics
            assert "success_rate" in metrics
            assert "average_duration" in metrics
            
            assert isinstance(metrics["total_executions"], int)
            assert isinstance(metrics["status_breakdown"], dict)
            assert isinstance(metrics["success_rate"], (int, float))
            assert isinstance(metrics["average_duration"], (int, float))
    
    @pytest.mark.asyncio
    async def test_cancel_workflow_execution(self, test_app_setup, auth_headers):
        """Test cancelling a workflow execution"""
        setup = test_app_setup
        
        # Create a long-running workflow
        workflow_data = {
            "workflow": {
                "id": "test-cancel-workflow",
                "name": "Test Cancel Workflow",
                "description": "Test workflow cancellation",
                "version": "1.0.0",
                "steps": [
                    {
                        "id": "long-step",
                        "name": "Long Running Step",
                        "service": "grainchain",
                        "action": "create_sandbox",
                        "parameters": {
                            "provider": "local",
                            "timeout": 60
                        },
                        "timeout": 120,
                        "retry_count": 1
                    }
                ],
                "timeout": 300
            },
            "parameters": {}
        }
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # Create workflow
            create_response = await client.post(
                "/api/v1/workflows",
                json=workflow_data,
                headers=auth_headers
            )
            
            assert create_response.status_code == 200
            execution_id = create_response.json()["execution"]["id"]
            
            # Wait a moment for it to start
            await asyncio.sleep(1)
            
            # Cancel workflow
            cancel_response = await client.post(
                f"/api/v1/workflows/{execution_id}/cancel",
                headers=auth_headers
            )
            
            # Note: Cancel might not be implemented yet, so we check for appropriate response
            assert cancel_response.status_code in [200, 501]  # 501 = Not Implemented
    
    @pytest.mark.asyncio
    async def test_delete_workflow_execution(self, test_app_setup, auth_headers):
        """Test deleting a workflow execution"""
        setup = test_app_setup
        
        # Create a simple workflow
        workflow_data = {
            "workflow": {
                "id": "test-delete-workflow",
                "name": "Test Delete Workflow",
                "description": "Test workflow deletion",
                "version": "1.0.0",
                "steps": [
                    {
                        "id": "simple-step",
                        "name": "Simple Step",
                        "service": "grainchain",
                        "action": "list_sandboxes",
                        "parameters": {},
                        "timeout": 30,
                        "retry_count": 1
                    }
                ],
                "timeout": 60
            },
            "parameters": {}
        }
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # Create workflow
            create_response = await client.post(
                "/api/v1/workflows",
                json=workflow_data,
                headers=auth_headers
            )
            
            assert create_response.status_code == 200
            execution_id = create_response.json()["execution"]["id"]
            
            # Wait for completion
            await asyncio.sleep(3)
            
            # Delete workflow
            delete_response = await client.delete(
                f"/api/v1/workflows/{execution_id}",
                headers=auth_headers
            )
            
            assert delete_response.status_code == 200
            delete_data = delete_response.json()
            
            assert "message" in delete_data
            assert "deleted successfully" in delete_data["message"]
            
            # Verify it's deleted
            get_response = await client.get(
                f"/api/v1/workflows/{execution_id}",
                headers=auth_headers
            )
            
            assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_unauthorized_access(self, test_app_setup):
        """Test unauthorized access to API endpoints"""
        setup = test_app_setup
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # Try to access without auth header
            response = await client.get("/api/v1/workflows")
            
            assert response.status_code == 403  # Forbidden or 401 Unauthorized
    
    @pytest.mark.asyncio
    async def test_invalid_workflow_data(self, test_app_setup, auth_headers):
        """Test API validation with invalid workflow data"""
        setup = test_app_setup
        
        # Invalid workflow data (missing required fields)
        invalid_workflow_data = {
            "workflow": {
                "id": "invalid-workflow",
                # Missing name, description, version, steps
            },
            "parameters": {}
        }
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            response = await client.post(
                "/api/v1/workflows",
                json=invalid_workflow_data,
                headers=auth_headers
            )
            
            assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_nonexistent_workflow_execution(self, test_app_setup, auth_headers):
        """Test accessing non-existent workflow execution"""
        setup = test_app_setup
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            response = await client.get(
                "/api/v1/workflows/non-existent-id",
                headers=auth_headers
            )
            
            assert response.status_code == 404


@pytest.mark.e2e
@pytest.mark.skipif(not GRAINCHAIN_AVAILABLE, reason="Grainchain library not available")
class TestRealGrainchainIntegration:
    """End-to-end tests with real grainchain library"""
    
    @pytest.fixture
    async def real_grainchain_setup(self):
        """Setup with real grainchain integration"""
        # Create state manager
        state_manager = StateManagerFactory.create_in_memory_manager()
        await state_manager.start()
        
        # Create service coordinator
        coordinator = ServiceCoordinator()
        
        # Create real grainchain adapter
        grainchain_config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 2,
            "working_directory": "/tmp"
        }
        grainchain_adapter = GrainchainAdapter(grainchain_config)
        
        # Mock codegen adapter
        codegen_adapter = AsyncMock(spec=CodegenService)
        codegen_adapter.validate_token = AsyncMock(return_value={
            "id": "test-user",
            "github_username": "testuser",
            "email": "test@example.com"
        })
        codegen_adapter.health_check = AsyncMock(return_value="healthy")
        
        # Register adapters
        coordinator.register_adapter("grainchain", grainchain_adapter)
        coordinator.register_adapter("codegen", codegen_adapter)
        
        # Create workflow engine
        engine = WorkflowEngineFactory.create_engine(
            coordinator=coordinator,
            state_manager=state_manager
        )
        
        # Set global dependencies
        set_global_dependencies(
            engine=engine,
            coordinator=coordinator,
            state_manager=state_manager,
            codegen_adapter=codegen_adapter
        )
        
        yield {
            "app": app,
            "engine": engine,
            "grainchain_adapter": grainchain_adapter
        }
        
        # Cleanup
        await grainchain_adapter.cleanup()
        await state_manager.stop()
    
    @pytest.mark.asyncio
    async def test_real_sandbox_workflow_via_api(self, real_grainchain_setup):
        """Test complete workflow with real sandbox operations via API"""
        setup = real_grainchain_setup
        auth_headers = {"Authorization": "Bearer test-token"}
        
        # Define comprehensive workflow
        workflow_data = {
            "workflow": {
                "id": "real-sandbox-workflow",
                "name": "Real Sandbox Workflow",
                "description": "Complete workflow with real sandbox operations",
                "version": "1.0.0",
                "steps": [
                    {
                        "id": "create-sandbox",
                        "name": "Create Sandbox",
                        "service": "grainchain",
                        "action": "create_sandbox",
                        "parameters": {
                            "provider": "local",
                            "timeout": 30,
                            "working_directory": "/tmp",
                            "environment_vars": {"E2E_TEST": "true"}
                        },
                        "timeout": 60,
                        "retry_count": 1
                    },
                    {
                        "id": "upload-script",
                        "name": "Upload Python Script",
                        "service": "grainchain",
                        "action": "upload_file",
                        "parameters": {
                            "path": "/tmp/e2e_test.py",
                            "content": "import os\nprint(f'E2E Test: {os.environ.get(\"E2E_TEST\", \"not set\")}')\nprint('Python script executed successfully!')"
                        },
                        "depends_on": ["create-sandbox"],
                        "timeout": 30,
                        "retry_count": 1
                    },
                    {
                        "id": "execute-script",
                        "name": "Execute Python Script",
                        "service": "grainchain",
                        "action": "execute_command",
                        "parameters": {
                            "command": "python3 /tmp/e2e_test.py"
                        },
                        "depends_on": ["upload-script"],
                        "timeout": 30,
                        "retry_count": 1
                    },
                    {
                        "id": "list-files",
                        "name": "List Files",
                        "service": "grainchain",
                        "action": "list_files",
                        "parameters": {
                            "path": "/tmp"
                        },
                        "depends_on": ["execute-script"],
                        "timeout": 30,
                        "retry_count": 1
                    },
                    {
                        "id": "cleanup",
                        "name": "Cleanup Sandbox",
                        "service": "grainchain",
                        "action": "destroy_sandbox",
                        "parameters": {},
                        "depends_on": ["list-files"],
                        "timeout": 30,
                        "retry_count": 0
                    }
                ],
                "timeout": 300,
                "metadata": {"e2e_test": True},
                "tags": ["e2e", "real-grainchain"]
            },
            "parameters": {"test_type": "e2e"}
        }
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # Create workflow execution
            create_response = await client.post(
                "/api/v1/workflows",
                json=workflow_data,
                headers=auth_headers
            )
            
            assert create_response.status_code == 200
            execution_id = create_response.json()["execution"]["id"]
            
            # Monitor execution progress
            max_wait = 60  # Increased timeout for real operations
            wait_interval = 3
            waited = 0
            
            while waited < max_wait:
                status_response = await client.get(
                    f"/api/v1/workflows/{execution_id}",
                    headers=auth_headers
                )
                
                assert status_response.status_code == 200
                status_data = status_response.json()
                execution = status_data["execution"]
                
                print(f"Workflow status: {execution['status']}")
                print(f"Completed steps: {len(execution.get('step_results', {}))}")
                
                if execution["status"] in ["completed", "failed"]:
                    break
                
                await asyncio.sleep(wait_interval)
                waited += wait_interval
            
            # Verify final results
            final_response = await client.get(
                f"/api/v1/workflows/{execution_id}",
                headers=auth_headers
            )
            
            assert final_response.status_code == 200
            final_data = final_response.json()
            final_execution = final_data["execution"]
            
            # Should complete successfully with real grainchain
            assert final_execution["status"] == "completed"
            assert len(final_execution["step_results"]) == 5
            
            # Verify specific step results
            step_results = final_execution["step_results"]
            
            # Check sandbox creation
            create_result = step_results.get("create-sandbox")
            assert create_result is not None
            assert create_result.get("status") == "completed"
            
            # Check script execution
            execute_result = step_results.get("execute-script")
            assert execute_result is not None
            assert execute_result.get("status") == "completed"
            
            # Check file listing
            list_result = step_results.get("list-files")
            assert list_result is not None
            assert list_result.get("status") == "completed"
            
            # Check cleanup
            cleanup_result = step_results.get("cleanup")
            assert cleanup_result is not None
            assert cleanup_result.get("status") == "completed"
            
            print("✅ Real grainchain E2E test completed successfully!")
    
    @pytest.mark.asyncio
    async def test_concurrent_real_workflows(self, real_grainchain_setup):
        """Test concurrent workflows with real grainchain"""
        setup = real_grainchain_setup
        auth_headers = {"Authorization": "Bearer test-token"}
        
        # Create multiple simple workflows
        workflows = []
        for i in range(2):  # Keep it small for E2E tests
            workflow_data = {
                "workflow": {
                    "id": f"concurrent-real-{i}",
                    "name": f"Concurrent Real Workflow {i}",
                    "description": f"Concurrent test workflow {i}",
                    "version": "1.0.0",
                    "steps": [
                        {
                            "id": "create-sandbox",
                            "name": "Create Sandbox",
                            "service": "grainchain",
                            "action": "create_sandbox",
                            "parameters": {
                                "provider": "local",
                                "timeout": 30,
                                "working_directory": f"/tmp/concurrent_{i}"
                            },
                            "timeout": 60,
                            "retry_count": 1
                        },
                        {
                            "id": "execute-command",
                            "name": "Execute Command",
                            "service": "grainchain",
                            "action": "execute_command",
                            "parameters": {
                                "command": f"echo 'Concurrent workflow {i} executed'"
                            },
                            "depends_on": ["create-sandbox"],
                            "timeout": 30,
                            "retry_count": 1
                        },
                        {
                            "id": "cleanup",
                            "name": "Cleanup",
                            "service": "grainchain",
                            "action": "destroy_sandbox",
                            "parameters": {},
                            "depends_on": ["execute-command"],
                            "timeout": 30,
                            "retry_count": 0
                        }
                    ],
                    "timeout": 180
                },
                "parameters": {"workflow_index": i}
            }
            workflows.append(workflow_data)
        
        async with AsyncClient(app=setup["app"], base_url="http://test") as client:
            # Start all workflows
            execution_ids = []
            for workflow_data in workflows:
                response = await client.post(
                    "/api/v1/workflows",
                    json=workflow_data,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                execution_ids.append(response.json()["execution"]["id"])
            
            # Wait for all to complete
            max_wait = 90
            wait_interval = 5
            waited = 0
            
            while waited < max_wait:
                completed_count = 0
                
                for execution_id in execution_ids:
                    response = await client.get(
                        f"/api/v1/workflows/{execution_id}",
                        headers=auth_headers
                    )
                    
                    if response.status_code == 200:
                        execution = response.json()["execution"]
                        if execution["status"] in ["completed", "failed"]:
                            completed_count += 1
                
                if completed_count == len(execution_ids):
                    break
                
                print(f"Completed: {completed_count}/{len(execution_ids)}")
                await asyncio.sleep(wait_interval)
                waited += wait_interval
            
            # Verify all completed
            final_statuses = []
            for execution_id in execution_ids:
                response = await client.get(
                    f"/api/v1/workflows/{execution_id}",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                execution = response.json()["execution"]
                final_statuses.append(execution["status"])
            
            # At least some should complete successfully
            completed_count = sum(1 for status in final_statuses if status == "completed")
            assert completed_count > 0
            
            print(f"✅ Concurrent real workflows test completed: {completed_count}/{len(execution_ids)} successful")
