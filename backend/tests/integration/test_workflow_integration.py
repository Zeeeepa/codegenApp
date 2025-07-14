"""
Integration tests for workflow orchestration with real grainchain integration
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock

from app.core.workflow.engine import WorkflowEngine
from app.core.orchestration.coordinator import ServiceCoordinator
from app.core.orchestration.state_manager import StateManagerFactory
from app.services.adapters.grainchain_adapter import GrainchainAdapter, GRAINCHAIN_AVAILABLE
from app.models.domain.workflow import WorkflowDefinition, WorkflowStep, WorkflowStatus
from app.utils.exceptions import WorkflowExecutionError


@pytest.mark.integration
class TestWorkflowGrainchainIntegration:
    """Integration tests for workflow engine with grainchain adapter"""
    
    @pytest.fixture
    async def integration_setup(self):
        """Setup integration test environment"""
        # Create state manager
        state_manager = StateManagerFactory.create_in_memory_manager()
        await state_manager.start()
        
        # Create service coordinator
        coordinator = ServiceCoordinator()
        
        # Create grainchain adapter
        grainchain_config = {
            "default_provider": "local",
            "default_timeout": 60,
            "max_concurrent_sandboxes": 3,
            "working_directory": "/tmp"
        }
        grainchain_adapter = GrainchainAdapter(grainchain_config)
        
        # Register adapter
        coordinator.register_adapter("grainchain", grainchain_adapter)
        
        # Create workflow engine
        from app.core.workflow.engine import WorkflowEngineFactory
        engine = WorkflowEngineFactory.create_engine(
            coordinator=coordinator,
            state_manager=state_manager
        )
        
        yield {
            "engine": engine,
            "coordinator": coordinator,
            "state_manager": state_manager,
            "grainchain_adapter": grainchain_adapter
        }
        
        # Cleanup
        await grainchain_adapter.cleanup()
        await state_manager.stop()
    
    @pytest.mark.asyncio
    async def test_simple_grainchain_workflow(self, integration_setup):
        """Test a simple workflow with grainchain operations"""
        setup = integration_setup
        engine = setup["engine"]
        
        # Define workflow
        workflow = WorkflowDefinition(
            id="test-grainchain-workflow",
            name="Test Grainchain Workflow",
            description="Test workflow with grainchain operations",
            version="1.0.0",
            steps=[
                WorkflowStep(
                    id="create-sandbox",
                    name="Create Sandbox",
                    service="grainchain",
                    action="create_sandbox",
                    parameters={
                        "provider": "local",
                        "timeout": 30,
                        "working_directory": "/tmp"
                    },
                    timeout=60,
                    retry_count=1
                ),
                WorkflowStep(
                    id="execute-command",
                    name="Execute Command",
                    service="grainchain",
                    action="execute_command",
                    parameters={
                        "command": "echo 'Hello from integration test!'"
                    },
                    depends_on=["create-sandbox"],
                    timeout=30,
                    retry_count=1
                ),
                WorkflowStep(
                    id="cleanup-sandbox",
                    name="Cleanup Sandbox",
                    service="grainchain",
                    action="destroy_sandbox",
                    parameters={},
                    depends_on=["execute-command"],
                    timeout=30,
                    retry_count=0
                )
            ],
            timeout=300
        )
        
        # Execute workflow
        execution = await engine.start_workflow(
            workflow=workflow,
            parameters={},
            organization_id=1,
            user_id="test-user"
        )
        
        # Wait for completion
        max_wait = 30  # seconds
        wait_interval = 1
        waited = 0
        
        while waited < max_wait:
            current_execution = await engine.get_execution(execution.id)
            if current_execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
                break
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        
        # Verify results
        final_execution = await engine.get_execution(execution.id)
        
        if GRAINCHAIN_AVAILABLE:
            # With real grainchain, workflow should complete successfully
            assert final_execution.status == WorkflowStatus.COMPLETED
            assert len(final_execution.step_results) == 3
            
            # Check step results
            create_result = final_execution.step_results.get("create-sandbox")
            assert create_result is not None
            assert create_result.get("status") == "completed"
            
            execute_result = final_execution.step_results.get("execute-command")
            assert execute_result is not None
            assert execute_result.get("status") == "completed"
            
            cleanup_result = final_execution.step_results.get("cleanup-sandbox")
            assert cleanup_result is not None
            assert cleanup_result.get("status") == "completed"
        else:
            # With mock implementation, workflow should still complete
            assert final_execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]
    
    @pytest.mark.asyncio
    async def test_file_operations_workflow(self, integration_setup):
        """Test workflow with file operations"""
        setup = integration_setup
        engine = setup["engine"]
        
        # Define workflow with file operations
        workflow = WorkflowDefinition(
            id="test-file-workflow",
            name="Test File Operations Workflow",
            description="Test workflow with file upload/download",
            version="1.0.0",
            steps=[
                WorkflowStep(
                    id="create-sandbox",
                    name="Create Sandbox",
                    service="grainchain",
                    action="create_sandbox",
                    parameters={
                        "provider": "local",
                        "timeout": 30
                    },
                    timeout=60,
                    retry_count=1
                ),
                WorkflowStep(
                    id="upload-file",
                    name="Upload Test File",
                    service="grainchain",
                    action="upload_file",
                    parameters={
                        "path": "/tmp/integration_test.txt",
                        "content": "Hello from integration test file!"
                    },
                    depends_on=["create-sandbox"],
                    timeout=30,
                    retry_count=1
                ),
                WorkflowStep(
                    id="list-files",
                    name="List Files",
                    service="grainchain",
                    action="list_files",
                    parameters={
                        "path": "/tmp"
                    },
                    depends_on=["upload-file"],
                    timeout=30,
                    retry_count=1
                ),
                WorkflowStep(
                    id="download-file",
                    name="Download Test File",
                    service="grainchain",
                    action="download_file",
                    parameters={
                        "path": "/tmp/integration_test.txt"
                    },
                    depends_on=["list-files"],
                    timeout=30,
                    retry_count=1
                ),
                WorkflowStep(
                    id="cleanup",
                    name="Cleanup",
                    service="grainchain",
                    action="destroy_sandbox",
                    parameters={},
                    depends_on=["download-file"],
                    timeout=30,
                    retry_count=0
                )
            ],
            timeout=300
        )
        
        # Execute workflow
        execution = await engine.start_workflow(
            workflow=workflow,
            parameters={},
            organization_id=1,
            user_id="test-user"
        )
        
        # Wait for completion
        max_wait = 30
        wait_interval = 1
        waited = 0
        
        while waited < max_wait:
            current_execution = await engine.get_execution(execution.id)
            if current_execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
                break
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        
        # Verify results
        final_execution = await engine.get_execution(execution.id)
        
        if GRAINCHAIN_AVAILABLE:
            assert final_execution.status == WorkflowStatus.COMPLETED
            
            # Check file operations results
            download_result = final_execution.step_results.get("download-file")
            if download_result and download_result.get("status") == "completed":
                # Verify file content was preserved
                result_data = download_result.get("result", {})
                assert "content" in result_data
                assert "Hello from integration test file!" in result_data["content"]
    
    @pytest.mark.asyncio
    async def test_workflow_error_handling(self, integration_setup):
        """Test workflow error handling with grainchain"""
        setup = integration_setup
        engine = setup["engine"]
        
        # Define workflow with intentional error
        workflow = WorkflowDefinition(
            id="test-error-workflow",
            name="Test Error Handling Workflow",
            description="Test workflow error handling",
            version="1.0.0",
            steps=[
                WorkflowStep(
                    id="invalid-action",
                    name="Invalid Action",
                    service="grainchain",
                    action="non_existent_action",
                    parameters={},
                    timeout=30,
                    retry_count=1
                )
            ],
            timeout=300
        )
        
        # Execute workflow
        execution = await engine.start_workflow(
            workflow=workflow,
            parameters={},
            organization_id=1,
            user_id="test-user"
        )
        
        # Wait for completion
        max_wait = 15
        wait_interval = 1
        waited = 0
        
        while waited < max_wait:
            current_execution = await engine.get_execution(execution.id)
            if current_execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
                break
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        
        # Verify error handling
        final_execution = await engine.get_execution(execution.id)
        assert final_execution.status == WorkflowStatus.FAILED
        
        # Check error details
        error_result = final_execution.step_results.get("invalid-action")
        assert error_result is not None
        assert error_result.get("status") == "failed"
        assert "error" in error_result
    
    @pytest.mark.asyncio
    async def test_concurrent_workflows(self, integration_setup):
        """Test concurrent workflow execution"""
        setup = integration_setup
        engine = setup["engine"]
        
        # Define simple workflow
        def create_workflow(workflow_id: str) -> WorkflowDefinition:
            return WorkflowDefinition(
                id=workflow_id,
                name=f"Concurrent Test Workflow {workflow_id}",
                description="Test concurrent execution",
                version="1.0.0",
                steps=[
                    WorkflowStep(
                        id="create-sandbox",
                        name="Create Sandbox",
                        service="grainchain",
                        action="create_sandbox",
                        parameters={
                            "provider": "local",
                            "timeout": 30,
                            "working_directory": f"/tmp/{workflow_id}"
                        },
                        timeout=60,
                        retry_count=1
                    ),
                    WorkflowStep(
                        id="execute-command",
                        name="Execute Command",
                        service="grainchain",
                        action="execute_command",
                        parameters={
                            "command": f"echo 'Workflow {workflow_id} executed'"
                        },
                        depends_on=["create-sandbox"],
                        timeout=30,
                        retry_count=1
                    ),
                    WorkflowStep(
                        id="cleanup",
                        name="Cleanup",
                        service="grainchain",
                        action="destroy_sandbox",
                        parameters={},
                        depends_on=["execute-command"],
                        timeout=30,
                        retry_count=0
                    )
                ],
                timeout=300
            )
        
        # Start multiple workflows concurrently
        num_workflows = 2  # Keep it small for integration tests
        workflows = [create_workflow(f"concurrent-{i}") for i in range(num_workflows)]
        
        # Execute workflows
        executions = []
        for workflow in workflows:
            execution = await engine.start_workflow(
                workflow=workflow,
                parameters={},
                organization_id=1,
                user_id="test-user"
            )
            executions.append(execution)
        
        # Wait for all to complete
        max_wait = 45
        wait_interval = 2
        waited = 0
        
        while waited < max_wait:
            completed_count = 0
            for execution in executions:
                current_execution = await engine.get_execution(execution.id)
                if current_execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
                    completed_count += 1
            
            if completed_count == len(executions):
                break
            
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        
        # Verify all workflows completed
        final_executions = []
        for execution in executions:
            final_execution = await engine.get_execution(execution.id)
            final_executions.append(final_execution)
        
        # Check results
        if GRAINCHAIN_AVAILABLE:
            completed_count = sum(1 for ex in final_executions if ex.status == WorkflowStatus.COMPLETED)
            # At least some should complete successfully (depending on sandbox limits)
            assert completed_count > 0
        
        # Verify no executions are still running
        running_count = sum(1 for ex in final_executions if ex.status == WorkflowStatus.RUNNING)
        assert running_count == 0


@pytest.mark.integration
class TestGrainchainAdapterIntegration:
    """Integration tests specifically for grainchain adapter"""
    
    @pytest.fixture
    def grainchain_adapter(self):
        """Create grainchain adapter for integration testing"""
        config = {
            "default_provider": "local",
            "default_timeout": 30,
            "max_concurrent_sandboxes": 3,
            "working_directory": "/tmp"
        }
        return GrainchainAdapter(config)
    
    @pytest.mark.asyncio
    async def test_full_sandbox_lifecycle(self, grainchain_adapter):
        """Test complete sandbox lifecycle"""
        if not GRAINCHAIN_AVAILABLE:
            pytest.skip("Grainchain library not available")
        
        sandbox_id = None
        
        try:
            # 1. Create sandbox
            create_context = {
                "parameters": {
                    "provider": "local",
                    "timeout": 30,
                    "working_directory": "/tmp",
                    "environment_vars": {"INTEGRATION_TEST": "true"}
                }
            }
            
            create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
            sandbox_id = create_result["sandbox_id"]
            
            assert create_result["status"] == "running"
            assert create_result["provider"] == "local"
            
            # 2. Execute commands
            commands = [
                "echo 'Starting integration test'",
                "pwd",
                "ls -la",
                "echo $INTEGRATION_TEST",
                "python3 -c 'print(\"Python is working\")'",
            ]
            
            for command in commands:
                exec_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id,
                        "command": command
                    }
                }
                
                exec_result = await grainchain_adapter.execute_action("execute_command", exec_context)
                assert exec_result["success"] is True
                assert exec_result["return_code"] == 0
            
            # 3. File operations
            test_files = [
                ("/tmp/test1.txt", "Content of test file 1"),
                ("/tmp/test2.py", "print('Hello from Python file')"),
                ("/tmp/data.json", '{"test": true, "integration": "success"}')
            ]
            
            for file_path, content in test_files:
                # Upload file
                upload_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id,
                        "path": file_path,
                        "content": content
                    }
                }
                
                upload_result = await grainchain_adapter.execute_action("upload_file", upload_context)
                assert upload_result["uploaded"] is True
                
                # Download and verify
                download_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id,
                        "path": file_path
                    }
                }
                
                download_result = await grainchain_adapter.execute_action("download_file", download_context)
                assert download_result["content"] == content
            
            # 4. List files
            list_context = {
                "parameters": {
                    "sandbox_id": sandbox_id,
                    "path": "/tmp"
                }
            }
            
            list_result = await grainchain_adapter.execute_action("list_files", list_context)
            file_names = [f["name"] for f in list_result["files"]]
            
            for file_path, _ in test_files:
                file_name = file_path.split("/")[-1]
                assert file_name in file_names
            
            # 5. Get sandbox status
            status_context = {
                "parameters": {
                    "sandbox_id": sandbox_id
                }
            }
            
            status_result = await grainchain_adapter.execute_action("get_sandbox_status", status_context)
            assert status_result["sandbox_id"] == sandbox_id
            
        finally:
            # 6. Cleanup
            if sandbox_id:
                destroy_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id
                    }
                }
                
                destroy_result = await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
                assert destroy_result["destroyed"] is True
    
    @pytest.mark.asyncio
    async def test_adapter_stress_test(self, grainchain_adapter):
        """Stress test the adapter with multiple operations"""
        if not GRAINCHAIN_AVAILABLE:
            pytest.skip("Grainchain library not available")
        
        sandbox_ids = []
        
        try:
            # Create multiple sandboxes
            num_sandboxes = min(2, grainchain_adapter.max_concurrent_sandboxes)
            
            for i in range(num_sandboxes):
                create_context = {
                    "parameters": {
                        "provider": "local",
                        "timeout": 30,
                        "working_directory": f"/tmp/stress_test_{i}"
                    }
                }
                
                create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
                sandbox_ids.append(create_result["sandbox_id"])
            
            # Perform operations on each sandbox
            for i, sandbox_id in enumerate(sandbox_ids):
                # Execute multiple commands
                commands = [
                    f"echo 'Sandbox {i} command 1'",
                    f"echo 'Sandbox {i} command 2'",
                    f"mkdir -p /tmp/stress_test_{i}/data",
                    f"echo 'test data {i}' > /tmp/stress_test_{i}/data/file.txt"
                ]
                
                for command in commands:
                    exec_context = {
                        "parameters": {
                            "sandbox_id": sandbox_id,
                            "command": command
                        }
                    }
                    
                    exec_result = await grainchain_adapter.execute_action("execute_command", exec_context)
                    assert exec_result["success"] is True
                
                # Upload and download files
                upload_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id,
                        "path": f"/tmp/stress_test_{i}/uploaded.txt",
                        "content": f"Uploaded content for sandbox {i}"
                    }
                }
                
                upload_result = await grainchain_adapter.execute_action("upload_file", upload_context)
                assert upload_result["uploaded"] is True
                
                download_context = {
                    "parameters": {
                        "sandbox_id": sandbox_id,
                        "path": f"/tmp/stress_test_{i}/uploaded.txt"
                    }
                }
                
                download_result = await grainchain_adapter.execute_action("download_file", download_context)
                assert f"Uploaded content for sandbox {i}" in download_result["content"]
            
            # List all sandboxes
            list_context = {"parameters": {}}
            list_result = await grainchain_adapter.execute_action("list_sandboxes", list_context)
            
            assert list_result["total"] >= len(sandbox_ids)
            listed_ids = [s["sandbox_id"] for s in list_result["sandboxes"]]
            
            for sandbox_id in sandbox_ids:
                assert sandbox_id in listed_ids
        
        finally:
            # Cleanup all sandboxes
            for sandbox_id in sandbox_ids:
                try:
                    destroy_context = {
                        "parameters": {
                            "sandbox_id": sandbox_id
                        }
                    }
                    await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
                except Exception as e:
                    print(f"Error cleaning up sandbox {sandbox_id}: {e}")
    
    @pytest.mark.asyncio
    async def test_adapter_health_monitoring(self, grainchain_adapter):
        """Test adapter health monitoring during operations"""
        # Initial health check
        initial_health = await grainchain_adapter.health_check()
        
        if GRAINCHAIN_AVAILABLE:
            assert initial_health == "healthy"
        else:
            assert "degraded" in initial_health
        
        if not GRAINCHAIN_AVAILABLE:
            return
        
        sandbox_ids = []
        
        try:
            # Create sandboxes up to the limit
            for i in range(grainchain_adapter.max_concurrent_sandboxes):
                create_context = {
                    "parameters": {
                        "provider": "local",
                        "timeout": 30,
                        "working_directory": f"/tmp/health_test_{i}"
                    }
                }
                
                create_result = await grainchain_adapter.execute_action("create_sandbox", create_context)
                sandbox_ids.append(create_result["sandbox_id"])
                
                # Check health after each creation
                health = await grainchain_adapter.health_check()
                assert health in ["healthy", "degraded: max sandboxes reached"]
            
            # Try to create one more (should fail or be rejected)
            try:
                create_context = {
                    "parameters": {
                        "provider": "local",
                        "timeout": 30
                    }
                }
                
                await grainchain_adapter.execute_action("create_sandbox", create_context)
                # If it succeeds, health should be degraded
                health = await grainchain_adapter.health_check()
                assert "degraded" in health
                
            except Exception:
                # Expected to fail due to limits
                pass
        
        finally:
            # Cleanup
            for sandbox_id in sandbox_ids:
                try:
                    destroy_context = {
                        "parameters": {
                            "sandbox_id": sandbox_id
                        }
                    }
                    await grainchain_adapter.execute_action("destroy_sandbox", destroy_context)
                except Exception:
                    pass
            
            # Final health check should be healthy again
            final_health = await grainchain_adapter.health_check()
            assert final_health == "healthy"
