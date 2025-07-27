"""
Comprehensive test suite for all implemented features.
Tests database integration, services, WebSocket notifications, and error handling.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import the modules we're testing
from backend.app.database.connection import DatabaseManager
from backend.app.database.models import Project, AgentRun, ValidationPipeline, AuditLog, ProjectStatus, AgentRunStatus
from backend.app.repositories.project_repository import ProjectRepository
from backend.app.repositories.agent_run_repository import AgentRunRepository
from backend.app.services.adapters.github_adapter import GitHubAdapter, GitHubWebhookEvent
from backend.app.services.webhook_handler import WebhookHandler
from backend.app.websocket.notification_service import NotificationService, NotificationType
from backend.app.middleware.error_handler import APIError, ErrorType, raise_validation_error


class TestDatabaseIntegration:
    """Test database models and repositories"""
    
    @pytest.fixture
    def db_manager(self):
        """Create test database manager"""
        # Use in-memory SQLite for testing
        db_manager = DatabaseManager()
        db_manager.initialize("sqlite:///:memory:")
        return db_manager
    
    @pytest.fixture
    def project_repo(self, db_manager):
        """Create project repository"""
        return ProjectRepository(db_manager)
    
    @pytest.fixture
    def agent_run_repo(self, db_manager):
        """Create agent run repository"""
        return AgentRunRepository(db_manager)
    
    def test_project_creation(self, project_repo):
        """Test project creation and retrieval"""
        project_data = {
            'id': 'test-project-1',
            'name': 'Test Project',
            'description': 'A test project',
            'webhook_url': 'https://example.com/webhook',
            'github_repo': 'owner/repo',
            'status': 'active',
            'deployment_settings': {'auto_deploy': True},
            'validation_settings': {'auto_validate': True}
        }
        
        # Create project
        project = project_repo.create(project_data)
        assert project is not None
        assert project.id == 'test-project-1'
        assert project.name == 'Test Project'
        assert project.status == ProjectStatus.ACTIVE
        
        # Retrieve project
        retrieved = project_repo.get_by_id('test-project-1')
        assert retrieved is not None
        assert retrieved.name == 'Test Project'
        
        # Test search
        results = project_repo.search('Test')
        assert len(results) == 1
        assert results[0].id == 'test-project-1'
    
    def test_agent_run_creation(self, project_repo, agent_run_repo):
        """Test agent run creation and management"""
        # First create a project
        project_data = {
            'id': 'test-project-2',
            'name': 'Test Project 2',
            'webhook_url': 'https://example.com/webhook',
            'github_repo': 'owner/repo2'
        }
        project_repo.create(project_data)
        
        # Create agent run
        run_data = {
            'id': 'test-run-1',
            'project_id': 'test-project-2',
            'target_text': 'Test agent run',
            'status': 'pending',
            'session_id': 'session-123'
        }
        
        run = agent_run_repo.create(run_data)
        assert run is not None
        assert run.id == 'test-run-1'
        assert run.status == AgentRunStatus.PENDING
        
        # Update run status
        updated = agent_run_repo.update('test-run-1', {
            'status': 'running',
            'progress_percentage': 50.0,
            'current_step': 'Processing'
        })
        assert updated is not None
        assert updated.status == AgentRunStatus.RUNNING
        assert updated.progress_percentage == 50.0
    
    def test_project_repository_pagination(self, project_repo):
        """Test project repository pagination"""
        # Create multiple projects
        for i in range(15):
            project_data = {
                'id': f'test-project-{i}',
                'name': f'Test Project {i}',
                'webhook_url': 'https://example.com/webhook',
                'github_repo': f'owner/repo{i}'
            }
            project_repo.create(project_data)
        
        # Test pagination
        page1 = project_repo.get_all(limit=10, offset=0)
        assert len(page1) == 10
        
        page2 = project_repo.get_all(limit=10, offset=10)
        assert len(page2) == 5
        
        # Test count
        total = project_repo.count()
        assert total == 15


class TestGitHubIntegration:
    """Test GitHub adapter and webhook handling"""
    
    @pytest.fixture
    def github_adapter(self):
        """Create GitHub adapter"""
        return GitHubAdapter(token="test-token", webhook_secret="test-secret")
    
    @pytest.fixture
    def webhook_handler(self, github_adapter):
        """Create webhook handler with mocked dependencies"""
        project_repo = Mock()
        agent_run_repo = Mock()
        return WebhookHandler(github_adapter, project_repo, agent_run_repo)
    
    def test_webhook_signature_verification(self, github_adapter):
        """Test webhook signature verification"""
        payload = b'{"test": "data"}'
        
        # Test with correct signature
        import hmac
        import hashlib
        signature = hmac.new(
            b"test-secret",
            payload,
            hashlib.sha256
        ).hexdigest()
        
        assert github_adapter.verify_webhook_signature(payload, f"sha256={signature}")
        
        # Test with incorrect signature
        assert not github_adapter.verify_webhook_signature(payload, "sha256=invalid")
    
    def test_webhook_event_parsing(self, github_adapter):
        """Test webhook event parsing"""
        headers = {
            'X-GitHub-Event': 'push',
            'X-GitHub-Delivery': 'test-delivery-id'
        }
        payload = {
            'repository': {'full_name': 'owner/repo'},
            'action': 'opened'
        }
        
        event = github_adapter.parse_webhook_event(headers, payload)
        assert event is not None
        assert event.event_type == 'push'
        assert event.repository == 'owner/repo'
        assert event.action == 'opened'
        assert event.delivery_id == 'test-delivery-id'
    
    def test_push_event_handling(self, github_adapter):
        """Test push event handling"""
        event = GitHubWebhookEvent(
            event_type='push',
            repository='owner/repo',
            action='',
            payload={
                'ref': 'refs/heads/main',
                'commits': [{'id': 'abc123'}],
                'pusher': {'name': 'user'},
                'head_commit': {'id': 'abc123', 'message': 'Test commit'}
            },
            delivery_id='test-id'
        )
        
        result = github_adapter.handle_push_event(event)
        assert result['event_type'] == 'push'
        assert result['branch'] == 'main'
        assert len(result['commits']) == 1
    
    @pytest.mark.asyncio
    async def test_webhook_processing(self, webhook_handler):
        """Test webhook processing workflow"""
        # Mock project repository
        mock_project = Mock()
        mock_project.id = 'test-project'
        mock_project.validation_settings = {'auto_validate_on_push': True}
        
        webhook_handler.project_repo.get_by_github_repo.return_value = mock_project
        
        headers = {
            'X-GitHub-Event': 'push',
            'X-GitHub-Delivery': 'test-delivery',
            'X-Hub-Signature-256': 'sha256=test-signature'
        }
        payload = json.dumps({
            'repository': {'full_name': 'owner/repo'},
            'ref': 'refs/heads/main',
            'commits': []
        }).encode()
        
        # Mock signature verification
        with patch.object(webhook_handler.github_adapter, 'verify_webhook_signature', return_value=True):
            result = await webhook_handler.process_webhook(headers, payload)
            
            assert result['status'] == 'processed'
            assert result['project_id'] == 'test-project'


class TestNotificationSystem:
    """Test WebSocket notification system"""
    
    @pytest.fixture
    def connection_manager(self):
        """Create mock connection manager"""
        return Mock()
    
    @pytest.fixture
    def notification_service(self, connection_manager):
        """Create notification service"""
        return NotificationService(connection_manager)
    
    @pytest.mark.asyncio
    async def test_agent_run_notifications(self, notification_service, connection_manager):
        """Test agent run notification flow"""
        # Test start notification
        await notification_service.notify_agent_run_started(
            project_id='test-project',
            run_id='test-run',
            target_text='Test task',
            user_id='test-user'
        )
        
        # Verify calls to connection manager
        connection_manager.broadcast_to_project.assert_called()
        connection_manager.send_to_user.assert_called()
        
        # Check message structure
        call_args = connection_manager.broadcast_to_project.call_args
        project_id, message = call_args[0]
        
        assert project_id == 'test-project'
        assert message.type == NotificationType.AGENT_RUN_STARTED.value
        assert message.data['run_id'] == 'test-run'
        assert message.data['status'] == 'started'
    
    @pytest.mark.asyncio
    async def test_validation_notifications(self, notification_service, connection_manager):
        """Test validation notification flow"""
        # Test validation completed
        await notification_service.notify_validation_completed(
            project_id='test-project',
            validation_id='test-validation',
            results={'passed': True, 'score': 95},
            success=True
        )
        
        connection_manager.broadcast_to_project.assert_called()
        
        call_args = connection_manager.broadcast_to_project.call_args
        project_id, message = call_args[0]
        
        assert message.type == NotificationType.VALIDATION_COMPLETED.value
        assert message.data['success'] is True
        assert message.data['results']['score'] == 95
    
    @pytest.mark.asyncio
    async def test_system_alerts(self, notification_service, connection_manager):
        """Test system alert broadcasting"""
        await notification_service.notify_system_alert(
            alert_type='maintenance',
            message='System maintenance scheduled',
            severity='warning'
        )
        
        connection_manager.broadcast_to_all.assert_called()
        
        call_args = connection_manager.broadcast_to_all.call_args
        message = call_args[0][0]
        
        assert message.type == NotificationType.SYSTEM_ALERT.value
        assert message.data['severity'] == 'warning'
        assert message.data['alert_type'] == 'maintenance'


class TestErrorHandling:
    """Test error handling middleware and custom errors"""
    
    def test_api_error_creation(self):
        """Test custom API error creation"""
        error = APIError(
            message="Test error",
            error_type=ErrorType.VALIDATION_ERROR,
            status_code=400,
            details={"field": "invalid"},
            error_code="test_error"
        )
        
        assert error.message == "Test error"
        assert error.error_type == ErrorType.VALIDATION_ERROR
        assert error.status_code == 400
        assert error.details["field"] == "invalid"
        assert error.error_code == "test_error"
        assert error.error_id is not None
        assert error.timestamp is not None
    
    def test_validation_error_helper(self):
        """Test validation error helper function"""
        with pytest.raises(APIError) as exc_info:
            raise_validation_error("Invalid input", {"field": "name"})
        
        error = exc_info.value
        assert error.error_type == ErrorType.VALIDATION_ERROR
        assert error.status_code == 400
        assert error.message == "Invalid input"
        assert error.details["field"] == "name"
    
    def test_error_type_mapping(self):
        """Test error type mapping from status codes"""
        from backend.app.middleware.error_handler import ErrorHandlerMiddleware
        
        middleware = ErrorHandlerMiddleware(None)
        
        assert middleware._get_error_type_from_status(400) == ErrorType.VALIDATION_ERROR
        assert middleware._get_error_type_from_status(401) == ErrorType.AUTHENTICATION_ERROR
        assert middleware._get_error_type_from_status(404) == ErrorType.NOT_FOUND_ERROR
        assert middleware._get_error_type_from_status(500) == ErrorType.INTERNAL_ERROR


class TestIntegrationWorkflow:
    """Test complete workflow integration"""
    
    @pytest.fixture
    def setup_integration_test(self):
        """Setup for integration testing"""
        # Create test database
        db_manager = DatabaseManager()
        db_manager.initialize("sqlite:///:memory:")
        
        # Create repositories
        project_repo = ProjectRepository(db_manager)
        agent_run_repo = AgentRunRepository(db_manager)
        
        # Create services
        github_adapter = GitHubAdapter(webhook_secret="test-secret")
        webhook_handler = WebhookHandler(github_adapter, project_repo, agent_run_repo)
        
        # Create notification service
        connection_manager = Mock()
        notification_service = NotificationService(connection_manager)
        
        return {
            'db_manager': db_manager,
            'project_repo': project_repo,
            'agent_run_repo': agent_run_repo,
            'webhook_handler': webhook_handler,
            'notification_service': notification_service,
            'connection_manager': connection_manager
        }
    
    @pytest.mark.asyncio
    async def test_complete_workflow(self, setup_integration_test):
        """Test complete workflow from webhook to notification"""
        components = setup_integration_test
        
        # 1. Create a project
        project_data = {
            'id': 'integration-test-project',
            'name': 'Integration Test Project',
            'webhook_url': 'https://example.com/webhook',
            'github_repo': 'owner/integration-repo',
            'validation_settings': {'auto_validate_on_push': True}
        }
        
        project = components['project_repo'].create(project_data)
        assert project is not None
        
        # 2. Create an agent run
        run_data = {
            'id': 'integration-test-run',
            'project_id': 'integration-test-project',
            'target_text': 'Integration test task',
            'status': 'pending'
        }
        
        agent_run = components['agent_run_repo'].create(run_data)
        assert agent_run is not None
        
        # 3. Simulate webhook processing
        headers = {
            'X-GitHub-Event': 'push',
            'X-GitHub-Delivery': 'integration-test-delivery',
            'X-Hub-Signature-256': 'sha256=test-signature'
        }
        payload = json.dumps({
            'repository': {'full_name': 'owner/integration-repo'},
            'ref': 'refs/heads/main',
            'commits': [{'id': 'abc123', 'message': 'Test commit'}]
        }).encode()
        
        # Mock signature verification
        with patch.object(components['webhook_handler'].github_adapter, 'verify_webhook_signature', return_value=True):
            result = await components['webhook_handler'].process_webhook(headers, payload)
            
            assert result['status'] == 'processed'
            assert result['project_id'] == 'integration-test-project'
        
        # 4. Test notifications
        await components['notification_service'].notify_agent_run_started(
            project_id='integration-test-project',
            run_id='integration-test-run',
            target_text='Integration test task'
        )
        
        # Verify notification was sent
        components['connection_manager'].broadcast_to_project.assert_called()
        
        # 5. Update agent run status
        updated_run = components['agent_run_repo'].update('integration-test-run', {
            'status': 'completed',
            'progress_percentage': 100.0
        })
        
        assert updated_run.status == AgentRunStatus.COMPLETED
        assert updated_run.progress_percentage == 100.0
        
        # 6. Send completion notification
        await components['notification_service'].notify_agent_run_completed(
            project_id='integration-test-project',
            run_id='integration-test-run',
            result={'success': True}
        )
        
        # Verify completion notification
        assert components['connection_manager'].broadcast_to_project.call_count == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
