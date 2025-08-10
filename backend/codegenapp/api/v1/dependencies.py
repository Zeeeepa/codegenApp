"""
FastAPI Dependencies - Dependency injection for API routes
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
import logging

from codegenapp.core.workflow.engine import WorkflowEngine
from codegenapp.core.orchestration.coordinator import ServiceCoordinator
from codegenapp.core.orchestration.state_manager import WorkflowStateManager
from codegenapp.services.adapters.codegen_adapter import CodegenAdapter
from codegenapp.config.settings import get_settings

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Global instances (will be initialized in main.py)
_workflow_engine: WorkflowEngine = None
_service_coordinator: ServiceCoordinator = None
_state_manager: WorkflowStateManager = None
_codegen_adapter: CodegenAdapter = None


def set_global_dependencies(
    engine: WorkflowEngine,
    coordinator: ServiceCoordinator,
    state_manager: WorkflowStateManager,
    codegen_adapter: CodegenAdapter
):
    """Set global dependency instances (called from main.py)"""
    global _workflow_engine, _service_coordinator, _state_manager, _codegen_adapter
    _workflow_engine = engine
    _service_coordinator = coordinator
    _state_manager = state_manager
    _codegen_adapter = codegen_adapter


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Get current user from token (simplified for now)"""
    try:
        # For now, we'll use the Codegen adapter to validate the token
        # and get user information
        if not _codegen_adapter:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not initialized"
            )
        
        # Validate token with Codegen API
        user = await _codegen_adapter.validate_token(credentials.credentials)
        
        # For now, we'll mock organization_id and user_id
        # In a real implementation, these would come from the token or user service
        return {
            "user_id": user.id,
            "organization_id": 1,  # Mock organization ID
            "github_username": user.github_username,
            "email": user.email,
            "token": credentials.credentials
        }
        
    except Exception as e:
        logger.error(f"❌ Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_workflow_engine() -> WorkflowEngine:
    """Get workflow engine instance"""
    if not _workflow_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow engine not initialized"
        )
    return _workflow_engine


async def get_service_coordinator() -> ServiceCoordinator:
    """Get service coordinator instance"""
    if not _service_coordinator:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service coordinator not initialized"
        )
    return _service_coordinator


async def get_state_manager() -> WorkflowStateManager:
    """Get state manager instance"""
    if not _state_manager:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="State manager not initialized"
        )
    return _state_manager


async def get_codegen_adapter() -> CodegenAdapter:
    """Get Codegen adapter instance"""
    if not _codegen_adapter:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Codegen adapter not initialized"
        )
    return _codegen_adapter


# Optional dependencies for specific use cases
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any] | None:
    """Get current user, return None if authentication fails"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_organization_access(organization_id: int):
    """Dependency factory to require access to specific organization"""
    async def _check_access(current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user["organization_id"] != organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this organization"
            )
        return current_user
    
    return _check_access


def require_admin_access():
    """Dependency to require admin access"""
    async def _check_admin(current_user: Dict[str, Any] = Depends(get_current_user)):
        # For now, we'll check if user has admin role
        # This would be implemented based on your user/role system
        if not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user
    
    return _check_admin
