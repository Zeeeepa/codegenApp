"""
Test suite for authentication and authorization functionality.
Tests JWT handling, role-based access control, and security features.
"""

import pytest
import jwt
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from backend.app.auth.jwt_handler import JWTHandler, AuthenticationService, UserRole
from backend.app.main import app

client = TestClient(app)


class TestJWTHandler:
    """Test JWT token handling functionality"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        
        # Hash password
        hashed = JWTHandler.hash_password(password)
        assert hashed != password
        assert len(hashed) > 0
        
        # Verify correct password
        assert JWTHandler.verify_password(password, hashed) is True
        
        # Verify incorrect password
        assert JWTHandler.verify_password("wrong_password", hashed) is False
    
    def test_create_access_token(self):
        """Test access token creation"""
        user_id = "user-123"
        email = "test@example.com"
        role = UserRole.DEVELOPER
        org_id = "org-456"
        
        token = JWTHandler.create_access_token(user_id, email, role, org_id)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify token
        payload = JWTHandler.decode_token(token)
        assert payload["user_id"] == user_id
        assert payload["email"] == email
        assert payload["role"] == role
        assert payload["organization_id"] == org_id
        assert payload["type"] == "access"
        assert "permissions" in payload
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        user_id = "user-123"
        
        token = JWTHandler.create_refresh_token(user_id)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify token
        payload = JWTHandler.decode_token(token)
        assert payload["user_id"] == user_id
        assert payload["type"] == "refresh"
    
    def test_token_expiration(self):
        """Test token expiration handling"""
        # Create expired token
        expired_payload = {
            "user_id": "user-123",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access"
        }
        
        expired_token = jwt.encode(expired_payload, "test-secret", algorithm="HS256")
        
        # Should raise HTTPException for expired token
        with pytest.raises(Exception):
            JWTHandler.decode_token(expired_token)
    
    def test_role_permissions(self):
        """Test role-based permission system"""
        # Test admin permissions
        admin_perms = JWTHandler.get_role_permissions(UserRole.ADMIN)
        assert "projects:create" in admin_perms
        assert "projects:delete" in admin_perms
        assert "users:create" in admin_perms
        
        # Test developer permissions
        dev_perms = JWTHandler.get_role_permissions(UserRole.DEVELOPER)
        assert "projects:read" in dev_perms
        assert "projects:update" in dev_perms
        assert "projects:delete" not in dev_perms
        assert "users:create" not in dev_perms
        
        # Test viewer permissions
        viewer_perms = JWTHandler.get_role_permissions(UserRole.VIEWER)
        assert "projects:read" in viewer_perms
        assert "projects:create" not in viewer_perms
        assert "projects:update" not in viewer_perms
    
    def test_permission_checking(self):
        """Test permission validation"""
        permissions = ["projects:read", "projects:update"]
        
        # Valid permission
        assert JWTHandler.check_permission(permissions, "projects:read") is True
        assert JWTHandler.check_permission(permissions, "projects:update") is True
        
        # Invalid permission
        assert JWTHandler.check_permission(permissions, "projects:delete") is False
        assert JWTHandler.check_permission(permissions, "users:create") is False


class TestAuthenticationService:
    """Test authentication service functionality"""
    
    @pytest.fixture
    def auth_service(self):
        return AuthenticationService()
    
    @pytest.mark.asyncio
    async def test_authenticate_valid_user(self, auth_service):
        """Test authentication with valid credentials"""
        email = "admin@example.com"
        password = "admin123"
        
        user_data = await auth_service.authenticate_user(email, password)
        
        assert user_data is not None
        assert user_data["email"] == email
        assert user_data["role"] == UserRole.ADMIN
        assert user_data["organization_id"] == "org-001"
    
    @pytest.mark.asyncio
    async def test_authenticate_invalid_user(self, auth_service):
        """Test authentication with invalid credentials"""
        # Invalid email
        user_data = await auth_service.authenticate_user("invalid@example.com", "password")
        assert user_data is None
        
        # Invalid password
        user_data = await auth_service.authenticate_user("admin@example.com", "wrong_password")
        assert user_data is None
    
    @pytest.mark.asyncio
    async def test_create_tokens(self, auth_service):
        """Test token creation for authenticated user"""
        user_data = {
            "user_id": "user-123",
            "email": "test@example.com",
            "role": UserRole.DEVELOPER,
            "organization_id": "org-456"
        }
        
        tokens = await auth_service.create_tokens(user_data)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert tokens["token_type"] == "bearer"
        
        # Verify tokens are valid
        access_payload = JWTHandler.decode_token(tokens["access_token"])
        refresh_payload = JWTHandler.decode_token(tokens["refresh_token"])
        
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"


class TestAuthenticationAPI:
    """Test authentication API endpoints"""
    
    def test_login_success(self):
        """Test successful login"""
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@example.com"
        assert data["user"]["role"] == UserRole.ADMIN
    
    def test_login_failure(self):
        """Test failed login with invalid credentials"""
        response = client.post("/api/v1/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrong_password"
        })
        
        assert response.status_code == 401
    
    def test_refresh_token(self):
        """Test token refresh functionality"""
        # First, login to get tokens
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Use refresh token to get new access token
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
    
    def test_get_current_user(self):
        """Test getting current user information"""
        # Login first
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        tokens = login_response.json()
        access_token = tokens["access_token"]
        
        # Get current user info
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["role"] == UserRole.ADMIN
        assert "permissions" in data
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 403
    
    def test_invalid_token_access(self):
        """Test accessing protected endpoint with invalid token"""
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        assert response.status_code == 401
    
    def test_permission_based_access(self):
        """Test permission-based endpoint access"""
        # Login as developer (limited permissions)
        login_response = client.post("/api/v1/auth/login", json={
            "email": "dev@example.com",
            "password": "dev123"
        })
        
        tokens = login_response.json()
        access_token = tokens["access_token"]
        
        # Try to access admin-only endpoint
        response = client.get("/api/v1/auth/roles", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        # Should be forbidden for developer role
        assert response.status_code == 403
    
    def test_admin_role_access(self):
        """Test admin role access to restricted endpoints"""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        tokens = login_response.json()
        access_token = tokens["access_token"]
        
        # Access admin-only endpoint
        response = client.get("/api/v1/auth/roles", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        assert UserRole.ADMIN in data["roles"]
        assert UserRole.MANAGER in data["roles"]
    
    def test_logout(self):
        """Test user logout"""
        # Login first
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        tokens = login_response.json()
        access_token = tokens["access_token"]
        
        # Logout
        response = client.post("/api/v1/auth/logout", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestSecurityFeatures:
    """Test security features and edge cases"""
    
    def test_malformed_authorization_header(self):
        """Test handling of malformed authorization headers"""
        # Missing Bearer prefix
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": "invalid_format_token"
        })
        assert response.status_code == 401
        
        # Empty authorization header
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": ""
        })
        assert response.status_code == 401
    
    def test_token_type_validation(self):
        """Test validation of token types"""
        # Create refresh token
        refresh_token = JWTHandler.create_refresh_token("user-123")
        
        # Try to use refresh token for access
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {refresh_token}"
        })
        
        # Should fail because refresh token used for access
        assert response.status_code == 401
    
    def test_password_strength_validation(self):
        """Test password strength requirements"""
        # Login first to get access token
        login_response = client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        tokens = login_response.json()
        access_token = tokens["access_token"]
        
        # Try to change to weak password
        response = client.post("/api/v1/auth/change-password", 
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "current_password": "admin123",
                "new_password": "weak"
            }
        )
        
        assert response.status_code == 400  # Should reject weak password


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
