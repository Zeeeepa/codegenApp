"""
FastAPI Backend for Strands-Agents Workflow Orchestration System
Integrates: Codegen SDK, grainchain, graph-sitter, web-eval-agent
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import Dict, Any
import asyncio

# Import our properly structured components
from app.config.settings import get_settings
from app.core.workflow.engine import WorkflowEngine, WorkflowEngineFactory
from app.core.orchestration.coordinator import ServiceCoordinator
from app.core.orchestration.state_manager import StateManagerFactory
from app.services.adapters.codegen_adapter import CodegenService
from app.services.adapters.grainchain_adapter import GrainchainAdapter
from app.api.v1.dependencies import set_global_dependencies
from app.api.v1.routes.workflow import router as workflow_router
from app.models.api.api_models import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global services
services = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Starting Strands-Agents Backend...")
    
    # Initialize services
    settings = get_settings()
    
    try:
        # Initialize all services
        services['codegen'] = CodegenService(settings.codegen_api_token)
        services['grainchain'] = GrainchainService(settings.grainchain_config)
        services['graph_sitter'] = GraphSitterService()
        services['web_eval'] = WebEvalService(settings.web_eval_config)
        services['orchestrator'] = WorkflowOrchestrator(services)
        
        logger.info("✅ All services initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    finally:
        # Cleanup
        logger.info("🛑 Shutting down services...")
        for service_name, service in services.items():
            if hasattr(service, 'cleanup'):
                await service.cleanup()

# Create FastAPI app
app = FastAPI(
    title="Strands-Agents Workflow Orchestration API",
    description="Backend API for orchestrating Codegen SDK, grainchain, graph-sitter, and web-eval-agent",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate API token and get current user"""
    token = credentials.credentials
    
    # Validate token with Codegen API
    codegen_service = services.get('codegen')
    if not codegen_service:
        raise HTTPException(status_code=500, detail="Codegen service not available")
    
    try:
        user = await codegen_service.validate_token(token)
        return user
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    service_status = {}
    
    for service_name, service in services.items():
        try:
            if hasattr(service, 'health_check'):
                status = await service.health_check()
                service_status[service_name] = status
            else:
                service_status[service_name] = "available"
        except Exception as e:
            service_status[service_name] = f"error: {str(e)}"
    
    return HealthResponse(
        status="healthy" if all(status == "available" or status.startswith("healthy") 
                              for status in service_status.values()) else "degraded",
        services=service_status,
        version="1.0.0"
    )

# Include API routes
app.include_router(api_router, prefix="/api/v1", dependencies=[Depends(get_current_user)])

# Include WebSocket routes
app.include_router(websocket_router, prefix="/ws")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Strands-Agents Workflow Orchestration API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )
