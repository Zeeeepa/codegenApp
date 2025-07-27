"""
Authentication API Routes for the Agent Run Manager.
Handles user login, logout, token refresh, and user management.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import logging

from app.auth.jwt_handler import AuthenticationService, JWTHandler, UserRole
from app.middleware.error_handler import raise_authentication_error, raise_validation_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
auth_service = AuthenticationService()
jwt_handler = JWTHandler()


# Request/Response Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: Dict[str, Any]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    role: str
    organization_id: str
    permissions: list


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# Dependency for getting current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt_handler.decode_token(token)
        
        if payload.get("type") != "access":
            raise_authentication_error("Invalid token type")
        
        return {
            "user_id": payload.get("user_id"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "organization_id": payload.get("organization_id"),
            "permissions": payload.get("permissions", [])
        }
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise_authentication_error("Invalid or expired token")


# Dependency for checking permissions
def require_permission(permission: str):
    """Decorator to require specific permission"""
    def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not jwt_handler.check_permission(current_user.get("permissions", []), permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission}"
            )
        return current_user
    return permission_checker


# Dependency for checking roles
def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role")
        
        # Define role hierarchy
        role_hierarchy = {
            UserRole.VIEWER: 1,
            UserRole.DEVELOPER: 2,
            UserRole.MANAGER: 3,
            UserRole.ADMIN: 4
        }
        
        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 5)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {required_role}, Current: {user_role}"
            )
        return current_user
    return role_checker


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT tokens"""
    try:
        # Authenticate user
        user_data = await auth_service.authenticate_user(request.email, request.password)
        
        if not user_data:
            raise_authentication_error("Invalid email or password")
        
        # Create tokens
        tokens = await auth_service.create_tokens(user_data)
        
        logger.info(f"User {request.email} logged in successfully")
        
        return LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            user={
                "user_id": user_data["user_id"],
                "email": user_data["email"],
                "role": user_data["role"],
                "organization_id": user_data["organization_id"],
                "permissions": jwt_handler.get_role_permissions(user_data["role"])
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed for {request.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        new_access_token = await auth_service.refresh_access_token(request.refresh_token)
        
        return RefreshTokenResponse(
            access_token=new_access_token,
            token_type="bearer"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout user (in a real implementation, this would blacklist the token)"""
    try:
        # In a production system, you would:
        # 1. Add the token to a blacklist/revocation list
        # 2. Store blacklisted tokens in Redis or database
        # 3. Check blacklist in token validation
        
        logger.info(f"User {current_user['email']} logged out")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        role=current_user["role"],
        organization_id=current_user["organization_id"],
        permissions=current_user["permissions"]
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change user password"""
    try:
        # In a real implementation, this would:
        # 1. Verify current password against database
        # 2. Hash new password
        # 3. Update password in database
        # 4. Optionally invalidate all existing tokens
        
        if len(request.new_password) < 8:
            raise_validation_error("Password must be at least 8 characters long")
        
        # Mock password change
        logger.info(f"Password changed for user {current_user['email']}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.get("/users")
async def list_users(
    current_user: Dict[str, Any] = Depends(require_permission("users:read"))
):
    """List all users (requires users:read permission)"""
    try:
        # Mock user list
        users = [
            {
                "user_id": "user-001",
                "email": "admin@example.com",
                "role": UserRole.ADMIN,
                "organization_id": "org-001",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "user_id": "user-002",
                "email": "manager@example.com",
                "role": UserRole.MANAGER,
                "organization_id": "org-001",
                "is_active": True,
                "created_at": "2024-01-02T00:00:00Z"
            },
            {
                "user_id": "user-003",
                "email": "dev@example.com",
                "role": UserRole.DEVELOPER,
                "organization_id": "org-001",
                "is_active": True,
                "created_at": "2024-01-03T00:00:00Z"
            }
        ]
        
        # Filter by organization
        org_users = [
            user for user in users 
            if user["organization_id"] == current_user["organization_id"]
        ]
        
        return {"users": org_users}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.get("/permissions")
async def get_user_permissions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user's permissions"""
    return {
        "permissions": current_user["permissions"],
        "role": current_user["role"]
    }


@router.get("/roles")
async def list_roles(
    current_user: Dict[str, Any] = Depends(require_role(UserRole.ADMIN))
):
    """List all available roles and their permissions (admin only)"""
    roles = {
        UserRole.ADMIN: jwt_handler.get_role_permissions(UserRole.ADMIN),
        UserRole.MANAGER: jwt_handler.get_role_permissions(UserRole.MANAGER),
        UserRole.DEVELOPER: jwt_handler.get_role_permissions(UserRole.DEVELOPER),
        UserRole.VIEWER: jwt_handler.get_role_permissions(UserRole.VIEWER)
    }
    
    return {"roles": roles}
