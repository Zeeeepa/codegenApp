"""
Integration API Routes

Provides endpoints for managing the integration framework components.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
import logging

from app.core.integration.integration_manager import get_integration_manager
from app.core.integration.config_manager import get_config_manager
from app.core.integration.event_bus import get_event_bus, Event
from app.core.integration.plugin_system import get_plugin_manager
from app.api.v1.dependencies import get_current_user
from app.workflows.templates.code_analysis_workflow import CodeAnalysisWorkflow
from app.workflows.templates.testing_pipeline_workflow import TestingPipelineWorkflow
from app.workflows.templates.deployment_validation_workflow import DeploymentValidationWorkflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration", tags=["integration"])


# System Status Endpoints
@router.get("/status")
async def get_system_status(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get comprehensive system status"""
    try:
        integration_manager = get_integration_manager()
        if not integration_manager:
            raise HTTPException(
                status_code=503,
                detail="Integration manager not available"
            )
        
        status = integration_manager.get_system_status()
        return status
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system status: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Comprehensive health check for integration components"""
    try:
        integration_manager = get_integration_manager()
        if not integration_manager:
            return {
                "status": "unhealthy",
                "error": "Integration manager not available"
            }
        
        health = await integration_manager.health_check()
        return health
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


# Configuration Management Endpoints
@router.get("/config")
async def get_configuration(
    component: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get configuration for a component or global config"""
    try:
        config_manager = get_config_manager()
        if not config_manager:
            raise HTTPException(
                status_code=503,
                detail="Configuration manager not available"
            )
        
        if component:
            config = config_manager.get_component_config(component)
            return {"component": component, "config": config}
        else:
            global_config = config_manager.get_global_config()
            return {"global_config": global_config.to_dict()}
        
    except Exception as e:
        logger.error(f"Failed to get configuration: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get configuration: {str(e)}"
        )


@router.post("/config/reload")
async def reload_configuration(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Reload configuration from file"""
    try:
        integration_manager = get_integration_manager()
        if not integration_manager:
            raise HTTPException(
                status_code=503,
                detail="Integration manager not available"
            )
        
        await integration_manager.reload_configuration()
        return {"message": "Configuration reloaded successfully"}
        
    except Exception as e:
        logger.error(f"Failed to reload configuration: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reload configuration: {str(e)}"
        )


# Event Bus Endpoints
@router.get("/events/metrics")
async def get_event_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get event bus metrics"""
    try:
        event_bus = get_event_bus()
        if not event_bus:
            raise HTTPException(
                status_code=503,
                detail="Event bus not available"
            )
        
        metrics = event_bus.get_metrics()
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get event metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get event metrics: {str(e)}"
        )


@router.get("/events/history")
async def get_event_history(
    event_type: Optional[str] = None,
    component: Optional[str] = None,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get event history with optional filtering"""
    try:
        event_bus = get_event_bus()
        if not event_bus:
            raise HTTPException(
                status_code=503,
                detail="Event bus not available"
            )
        
        events = event_bus.get_event_history(
            event_type=event_type,
            component=component,
            limit=limit
        )
        
        # Convert events to dictionaries for JSON serialization
        event_dicts = [event.to_dict() for event in events]
        
        return {
            "events": event_dicts,
            "total": len(event_dicts),
            "filters": {
                "event_type": event_type,
                "component": component,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get event history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get event history: {str(e)}"
        )


@router.post("/events/publish")
async def publish_event(
    event_type: str,
    payload: Dict[str, Any],
    target_component: Optional[str] = None,
    priority: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Publish an event to the event bus"""
    try:
        event_bus = get_event_bus()
        if not event_bus:
            raise HTTPException(
                status_code=503,
                detail="Event bus not available"
            )
        
        event = Event(
            event_type=event_type,
            source_component="api",
            payload=payload,
            target_component=target_component,
            priority=priority
        )
        
        await event_bus.publish(event)
        
        return {
            "message": "Event published successfully",
            "event_id": event.correlation_id,
            "event_type": event_type
        }
        
    except Exception as e:
        logger.error(f"Failed to publish event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to publish event: {str(e)}"
        )


# Plugin Management Endpoints
@router.get("/plugins")
async def list_plugins(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List all plugins and their status"""
    try:
        plugin_manager = get_plugin_manager()
        if not plugin_manager:
            raise HTTPException(
                status_code=503,
                detail="Plugin manager not available"
            )
        
        status = plugin_manager.get_plugin_status()
        return {"plugins": status}
        
    except Exception as e:
        logger.error(f"Failed to list plugins: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list plugins: {str(e)}"
        )


@router.post("/plugins/{plugin_name}/enable")
async def enable_plugin(
    plugin_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Enable a plugin"""
    try:
        integration_manager = get_integration_manager()
        if not integration_manager:
            raise HTTPException(
                status_code=503,
                detail="Integration manager not available"
            )
        
        result = await integration_manager.enable_plugin(plugin_name)
        
        if result:
            return {"message": f"Plugin '{plugin_name}' enabled successfully"}
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Plugin '{plugin_name}' not found"
            )
        
    except Exception as e:
        logger.error(f"Failed to enable plugin {plugin_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to enable plugin: {str(e)}"
        )


@router.post("/plugins/{plugin_name}/disable")
async def disable_plugin(
    plugin_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Disable a plugin"""
    try:
        integration_manager = get_integration_manager()
        if not integration_manager:
            raise HTTPException(
                status_code=503,
                detail="Integration manager not available"
            )
        
        result = await integration_manager.disable_plugin(plugin_name)
        
        if result:
            return {"message": f"Plugin '{plugin_name}' disabled successfully"}
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Plugin '{plugin_name}' not found"
            )
        
    except Exception as e:
        logger.error(f"Failed to disable plugin {plugin_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to disable plugin: {str(e)}"
        )


# Workflow Templates Endpoints
@router.get("/workflow-templates")
async def list_workflow_templates(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List available workflow templates"""
    try:
        templates = [
            CodeAnalysisWorkflow.get_workflow_template(),
            TestingPipelineWorkflow.get_workflow_template(),
            DeploymentValidationWorkflow.get_workflow_template()
        ]
        
        return {"templates": templates}
        
    except Exception as e:
        logger.error(f"Failed to list workflow templates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workflow templates: {str(e)}"
        )


@router.get("/workflow-templates/{template_name}")
async def get_workflow_template(
    template_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get details for a specific workflow template"""
    try:
        template_map = {
            "code_analysis": CodeAnalysisWorkflow.get_workflow_template(),
            "testing_pipeline": TestingPipelineWorkflow.get_workflow_template(),
            "deployment_validation": DeploymentValidationWorkflow.get_workflow_template()
        }
        
        if template_name not in template_map:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow template '{template_name}' not found"
            )
        
        return template_map[template_name]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow template {template_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow template: {str(e)}"
        )


@router.post("/workflow-templates/{template_name}/create")
async def create_workflow_from_template(
    template_name: str,
    parameters: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a workflow from a template"""
    try:
        if template_name == "code_analysis":
            from app.workflows.templates.code_analysis_workflow import CodeAnalysisWorkflowConfig
            config = CodeAnalysisWorkflowConfig(**parameters)
            workflow = CodeAnalysisWorkflow.create_workflow(config)
        elif template_name == "testing_pipeline":
            from app.workflows.templates.testing_pipeline_workflow import TestingPipelineConfig
            config = TestingPipelineConfig(**parameters)
            workflow = TestingPipelineWorkflow.create_workflow(config)
        elif template_name == "deployment_validation":
            from app.workflows.templates.deployment_validation_workflow import DeploymentValidationConfig
            config = DeploymentValidationConfig(**parameters)
            workflow = DeploymentValidationWorkflow.create_workflow(config)
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow template '{template_name}' not found"
            )
        
        return {
            "message": f"Workflow created from template '{template_name}'",
            "workflow_id": workflow.id,
            "workflow": {
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description,
                "steps": len(workflow.steps),
                "estimated_duration": workflow.timeout,
                "tags": workflow.tags
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create workflow from template {template_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workflow from template: {str(e)}"
        )

