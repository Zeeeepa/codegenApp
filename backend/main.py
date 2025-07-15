"""
CodegenApp CI/CD Flow Management System
Main FastAPI application entry point
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

from app.config.settings import get_settings
from app.api.v1 import api_router
from app.core.logging import setup_logging
from app.core.monitoring import setup_monitoring
from app.utils.exceptions import CodegenAppException

# Initialize settings
settings = get_settings()

# Setup logging
setup_logging(settings.logging)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting CodegenApp CI/CD Flow Management System")
    
    # Initialize monitoring if enabled
    if settings.monitoring.enabled:
        setup_monitoring(app)
    
    # Initialize database connections, Redis, etc.
    # await initialize_database()
    # await initialize_redis()
    
    logger.info("✅ Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down CodegenApp")
    
    # Cleanup resources
    # await cleanup_database()
    # await cleanup_redis()
    
    logger.info("✅ Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="CodegenApp CI/CD Flow Management System",
    description="AI-Powered CI/CD Flow Management with Validation Pipeline and Auto-Merge",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.backend.frontend_url,
        "http://localhost:3000",
        "http://localhost:8000",
        "https://localhost:3000",
        "https://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        settings.backend.host,
    ]
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint with system information"""
    return {
        "name": "CodegenApp CI/CD Flow Management System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-01-15T10:25:14Z",
        "version": "1.0.0",
        "services": {
            "codegen_api": "connected",
            "github_api": "connected",
            "gemini_api": "connected",
            "validation_pipeline": "ready",
            "web_eval_agent": "ready",
            "graph_sitter": "ready"
        }
    }


@app.exception_handler(CodegenAppException)
async def codegenapp_exception_handler(request, exc: CodegenAppException):
    """Handle custom CodegenApp exceptions"""
    logger.error(f"CodegenApp exception: {exc.message}", extra={"error_code": exc.error_code})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP exception: {exc.detail}", extra={"status_code": exc.status_code})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "http_error",
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions"""
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An internal server error occurred",
            "details": str(exc) if settings.backend.debug else None
        }
    )


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.backend.host,
        port=settings.backend.port,
        reload=settings.backend.reload,
        log_level=settings.logging.level.lower(),
        access_log=True
    )

