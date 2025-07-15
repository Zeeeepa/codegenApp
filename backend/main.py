"""
CodegenApp Backend - FastAPI Application

Main entry point for the CodegenApp backend API server.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import integration framework
from app.core.integration.integration_manager import (
    initialize_integration_manager,
    start_integration_framework
)

# Import API routes
from app.api.v1.routes.integration import router as integration_router
from app.api.v1.routes.webhook import router as webhook_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting CodegenApp Backend...")
    
    try:
        # Initialize integration framework
        config_file = Path("config.yaml") if Path("config.yaml").exists() else None
        plugin_directories = [Path("plugins")] if Path("plugins").exists() else []
        
        integration_manager = await start_integration_framework(
            config_file=config_file,
            plugin_directories=plugin_directories
        )
        
        # Store in app state
        app.state.integration_manager = integration_manager
        
        logger.info("✅ Integration framework started successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to start integration framework: {e}")
        # Continue without integration framework for basic functionality
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down CodegenApp Backend...")
    
    if hasattr(app.state, 'integration_manager'):
        try:
            await app.state.integration_manager.stop()
            logger.info("✅ Integration framework stopped")
        except Exception as e:
            logger.error(f"❌ Error stopping integration framework: {e}")


# Create FastAPI application
app = FastAPI(
    title="CodegenApp API",
    description="AI-Powered Development Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "codegenapp-backend",
        "version": "1.0.0",
        "timestamp": "2024-07-15T06:46:14Z"
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "CodegenApp Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include API routers
app.include_router(integration_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if os.getenv("DEBUG") else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8080"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )

