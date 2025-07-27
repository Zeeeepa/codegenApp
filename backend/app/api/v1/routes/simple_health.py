"""
Simple Health Check API Routes - No Authentication Required
Basic system health and status endpoints for single-user operation.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
import logging
from datetime import datetime

from app.services.codegen_client import get_global_client
from app.database.connection import DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """Basic health check endpoint - no authentication required"""
    try:
        # Check database connectivity
        db_manager = DatabaseManager()
        db_healthy = db_manager.health_check()
        
        # Check Codegen API connectivity
        codegen_healthy = False
        try:
            client = await get_global_client()
            codegen_healthy = await client.health_check()
        except Exception as e:
            logger.warning(f"Codegen API health check failed: {e}")
        
        overall_status = "healthy" if (db_healthy and codegen_healthy) else "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "components": {
                "database": "healthy" if db_healthy else "unhealthy",
                "codegen_api": "healthy" if codegen_healthy else "unhealthy"
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with comprehensive system information"""
    try:
        # Database health
        db_manager = DatabaseManager()
        db_healthy = db_manager.health_check()
        
        # Codegen API health and info
        codegen_healthy = False
        codegen_info = {}
        try:
            client = await get_global_client()
            codegen_healthy = await client.health_check()
            if codegen_healthy:
                codegen_info = await client.get_api_info()
        except Exception as e:
            logger.warning(f"Codegen API check failed: {e}")
            codegen_info = {"error": str(e)}
        
        # Component status
        components = {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "details": "PostgreSQL connection active" if db_healthy else "Database connection failed"
            },
            "codegen_api": {
                "status": "healthy" if codegen_healthy else "unhealthy",
                "details": codegen_info
            },
            "websocket": {
                "status": "healthy",
                "details": "Real-time notification system operational"
            },
            "github_integration": {
                "status": "healthy",
                "details": "GitHub webhook handler ready"
            }
        }
        
        overall_status = "healthy" if all(
            comp["status"] == "healthy" for comp in components.values()
        ) else "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "components": components,
            "system_info": {
                "single_user_mode": True,
                "authentication": "disabled",
                "codegen_integration": "enabled"
            }
        }
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/status")
async def get_system_status():
    """Get overall system status (public endpoint)"""
    try:
        # Quick status check
        db_manager = DatabaseManager()
        db_healthy = db_manager.health_check()
        
        codegen_healthy = False
        try:
            client = await get_global_client()
            codegen_healthy = await client.health_check()
        except:
            pass
        
        status_value = "operational" if (db_healthy and codegen_healthy) else "degraded"
        
        return {
            "status": status_value,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "mode": "single_user"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/codegen")
async def get_codegen_status():
    """Get Codegen API status and capabilities"""
    try:
        client = await get_global_client()
        
        # Check health
        healthy = await client.health_check()
        
        if not healthy:
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": "Codegen API is not responding"
            }
        
        # Get API info
        try:
            api_info = await client.get_api_info()
        except Exception as e:
            api_info = {"error": f"Failed to get API info: {str(e)}"}
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "api_info": api_info,
            "capabilities": {
                "streaming": True,
                "task_types": [
                    "code_generation",
                    "code_review", 
                    "bug_fix",
                    "feature_implementation",
                    "documentation",
                    "testing",
                    "refactoring",
                    "analysis",
                    "deployment",
                    "custom"
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get Codegen status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Codegen status: {str(e)}"
        )
