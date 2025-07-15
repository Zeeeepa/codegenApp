"""
CodegenApp API v1
Main API router and endpoint definitions
"""

from fastapi import APIRouter
from .routes import validation, integration, webhook, analysis, workflow

# Create main API router
api_router = APIRouter()

# Include route modules
api_router.include_router(
    validation.router,
    prefix="/validation",
    tags=["validation"]
)

api_router.include_router(
    integration.router,
    prefix="/integration",
    tags=["integration"]
)

api_router.include_router(
    webhook.router,
    prefix="/webhook",
    tags=["webhook"]
)

api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["analysis"]
)

api_router.include_router(
    workflow.router,
    prefix="/workflow",
    tags=["workflow"]
)

