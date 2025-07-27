"""
JWT Authentication Handler for the Agent Run Manager.
Provides secure token-based authentication with role-based access control.
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from pydantic import BaseModel

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))


class UserRole:
    """User role constants"""
    ADMIN = "admin"
    MANAGER = "manager"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class TokenData(BaseModel):
    """Token payload data structure"""
    user_id: str
    email: str
    role: str
    organization_id: str
    permissions: List[str]
    exp: datetime


class JWTHandler:
    """JWT token handler for authentication and authorization"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def create_access_token(
        user_id: str,
        email: str,
        role: str,
        organization_id: str,
        permissions: List[str] = None
    ) -> str:
        """Create a JWT access token"""
        if permissions is None:
            permissions = JWTHandler.get_role_permissions(role)
        
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "organization_id": organization_id,
            "permissions": permissions,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """Create a JWT refresh token"""
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(days=30),
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decode and validate a JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    @staticmethod
    def get_role_permissions(role: str) -> List[str]:
        """Get permissions for a given role"""
        role_permissions = {
            UserRole.ADMIN: [
                "projects:create", "projects:read", "projects:update", "projects:delete",
                "agent_runs:create", "agent_runs:read", "agent_runs:update", "agent_runs:delete",
                "users:create", "users:read", "users:update", "users:delete",
                "organizations:read", "organizations:update",
                "webhooks:create", "webhooks:read", "webhooks:update", "webhooks:delete",
                "validations:create", "validations:read", "validations:update", "validations:delete"
            ],
            UserRole.MANAGER: [
                "projects:create", "projects:read", "projects:update",
                "agent_runs:create", "agent_runs:read", "agent_runs:update",
                "users:read", "users:update",
                "organizations:read",
                "webhooks:create", "webhooks:read", "webhooks:update",
                "validations:create", "validations:read", "validations:update"
            ],
            UserRole.DEVELOPER: [
                "projects:read", "projects:update",
                "agent_runs:create", "agent_runs:read", "agent_runs:update",
                "users:read",
                "organizations:read",
                "webhooks:read",
                "validations:read", "validations:update"
            ],
            UserRole.VIEWER: [
                "projects:read",
                "agent_runs:read",
                "users:read",
                "organizations:read",
                "webhooks:read",
                "validations:read"
            ]
        }
        
        return role_permissions.get(role, [])
    
    @staticmethod
    def check_permission(user_permissions: List[str], required_permission: str) -> bool:
        """Check if user has required permission"""
        return required_permission in user_permissions
    
    @staticmethod
    def extract_token_from_header(authorization_header: str) -> str:
        """Extract token from Authorization header"""
        if not authorization_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing"
            )
        
        try:
            scheme, token = authorization_header.split()
            if scheme.lower() != "bearer":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication scheme"
                )
            return token
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )


class AuthenticationService:
    """Service for handling user authentication"""
    
    def __init__(self):
        self.jwt_handler = JWTHandler()
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user with email and password"""
        # In a real implementation, this would query the database
        # For demo purposes, we'll use a mock user
        mock_users = {
            "admin@example.com": {
                "user_id": "user-001",
                "email": "admin@example.com",
                "password_hash": self.jwt_handler.hash_password("admin123"),
                "role": UserRole.ADMIN,
                "organization_id": "org-001",
                "is_active": True
            },
            "manager@example.com": {
                "user_id": "user-002",
                "email": "manager@example.com",
                "password_hash": self.jwt_handler.hash_password("manager123"),
                "role": UserRole.MANAGER,
                "organization_id": "org-001",
                "is_active": True
            },
            "dev@example.com": {
                "user_id": "user-003",
                "email": "dev@example.com",
                "password_hash": self.jwt_handler.hash_password("dev123"),
                "role": UserRole.DEVELOPER,
                "organization_id": "org-001",
                "is_active": True
            }
        }
        
        user = mock_users.get(email)
        if not user or not user["is_active"]:
            return None
        
        if not self.jwt_handler.verify_password(password, user["password_hash"]):
            return None
        
        return {
            "user_id": user["user_id"],
            "email": user["email"],
            "role": user["role"],
            "organization_id": user["organization_id"]
        }
    
    async def create_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """Create access and refresh tokens for a user"""
        access_token = self.jwt_handler.create_access_token(
            user_id=user_data["user_id"],
            email=user_data["email"],
            role=user_data["role"],
            organization_id=user_data["organization_id"]
        )
        
        refresh_token = self.jwt_handler.create_refresh_token(
            user_id=user_data["user_id"]
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def refresh_access_token(self, refresh_token: str) -> str:
        """Create a new access token using a refresh token"""
        payload = self.jwt_handler.decode_token(refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # In a real implementation, fetch user data from database
        # For demo, we'll use mock data
        mock_user = {
            "user_id": user_id,
            "email": "admin@example.com",
            "role": UserRole.ADMIN,
            "organization_id": "org-001"
        }
        
        return self.jwt_handler.create_access_token(
            user_id=mock_user["user_id"],
            email=mock_user["email"],
            role=mock_user["role"],
            organization_id=mock_user["organization_id"]
        )
