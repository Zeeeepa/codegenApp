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
from codegenapp.config.settings import get_settings
from codegenapp.core.workflow.engine import WorkflowEngine, WorkflowEngineFactory
from codegenapp.core.orchestration.coordinator import ServiceCoordinator
from codegenapp.core.orchestration.state_manager import StateManagerFactory
from codegenapp.services.adapters.codegen_adapter import CodegenAdapter
from codegenapp.services.adapters.grainchain_adapter import GrainchainAdapter
from codegenapp.api.v1.dependencies import set_global_dependencies
from codegenapp.api.v1.routes.workflow import router as workflow_router
from codegenapp.models.api.api_models import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global instances
workflow_engine: WorkflowEngine = None
service_coordinator: ServiceCoordinator = None
state_manager = None
codegen_adapter = None
grainchain_adapter = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting Strands-Agents Backend")
    
    settings = get_settings()
    
    # Initialize global instances
    global workflow_engine, service_coordinator, state_manager, codegen_adapter, grainchain_adapter
    
    try:
        # Initialize state manager
        state_manager = StateManagerFactory.create_in_memory_manager()
        await state_manager.start()
        
        # Initialize service coordinator
        service_coordinator = ServiceCoordinator()
        
        # Initialize service adapters
        codegen_adapter = CodegenAdapter(
            api_token=settings.codegen_api_token,
            base_url=settings.codegen_api_base_url
        )
        
        grainchain_adapter = GrainchainAdapter(settings.grainchain_config)
        
        # Import and initialize Web-Eval-Agent adapter
        from codegenapp.services.adapters.web_eval_adapter import WebEvalAdapter
        web_eval_adapter = WebEvalAdapter()
        
        # Register adapters with coordinator
        service_coordinator.register_adapter("codegen", codegen_adapter)
        service_coordinator.register_adapter("grainchain", grainchain_adapter)
        service_coordinator.register_adapter("web-eval-agent", web_eval_adapter)
        
        # Initialize workflow engine
        workflow_engine = WorkflowEngineFactory.create_engine(
            coordinator=service_coordinator,
            state_manager=state_manager
        )
        
        # Set global dependencies for API routes
        set_global_dependencies(
            engine=workflow_engine,
            coordinator=service_coordinator,
            state_manager=state_manager,
            codegen_adapter=codegen_adapter
        )
        
        logger.info("✅ All services initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Strands-Agents Backend")
    
    # Cleanup services
    if state_manager:
        await state_manager.stop()
    if codegen_adapter:
        await codegen_adapter.cleanup()
    if grainchain_adapter:
        await grainchain_adapter.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Strands-Agents Workflow Orchestration",
    description="Backend API for orchestrating Codegen SDK, grainchain, graph-sitter, and web-eval-agent",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
settings = get_settings()

# Define a list of allowed origins
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
]

# Add any origins from settings
if settings.cors_origins:
    if isinstance(settings.cors_origins, str):
        allowed_origins.extend([origin.strip() for origin in settings.cors_origins.split(',')])
    elif isinstance(settings.cors_origins, list):
        allowed_origins.extend(settings.cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(workflow_router, prefix="/api/v1")

# Include webhook routes
from codegenapp.api.webhooks import router as webhook_router
app.include_router(webhook_router, prefix="/api")

# Include WebSocket routes
from codegenapp.api.websocket import router as websocket_router
app.include_router(websocket_router)

# Include Projects routes
from codegenapp.api.projects import router as projects_router
app.include_router(projects_router)


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check all services
        service_statuses = {}
        
        if service_coordinator:
            service_statuses = await service_coordinator.health_check_all()
        
        # Determine overall status
        overall_status = "healthy"
        if any(status.startswith("unhealthy") for status in service_statuses.values()):
            overall_status = "unhealthy"
        elif any(status.startswith("degraded") for status in service_statuses.values()):
            overall_status = "degraded"
        
        return HealthResponse(
            status=overall_status,
            services=service_statuses,
            version="1.0.0"
        )
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Strands-Agents Workflow Orchestration API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1"
    }


import click

@click.group()
def cli():
    """CodegenApp CLI"""
    pass

@click.command()
def start_mcp_server():
    """Starts the MCP server."""
    settings = get_settings()
    uvicorn.run(
        "codegenapp.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )

cli.add_command(start_mcp_server)
