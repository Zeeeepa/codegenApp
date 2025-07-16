"""
Webhook endpoints for receiving GitHub events and triggering validation flows
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from app.core.integration.event_bus import get_event_bus, Event
from app.core.integration.integration_manager import get_integration_manager
from app.core.workflow.engine import WorkflowEngine
from app.services.adapters.codegen_adapter import CodegenAdapter
from app.api.v1.dependencies import get_current_user
from app.utils.exceptions import ValidationError
from app.config.settings import get_settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


async def trigger_grainchain_validation_flow(
    repository: str,
    pr_data: Dict[str, Any],
    validation_config: Dict[str, Any]
) -> str:
    """Trigger the Grainchain validation workflow"""
    
    # Create validation workflow
    workflow_engine = WorkflowEngine()
    
    # Create workflow context
    workflow_context = {
        "repository": repository,
        "pull_request": pr_data,
        "validation_config": validation_config,
        "workflow_type": "pr_validation",
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Generate validation ID
    validation_id = str(uuid.uuid4())
    
    # Create validation workflow steps
    workflow_steps = [
        {
            "name": "setup_sandbox",
            "service": "grainchain",
            "action": "create_sandbox",
            "parameters": {
                "repository": repository,
                "pr_number": pr_data["number"],
                "head_sha": pr_data["head_sha"]
            }
        },
        {
            "name": "code_analysis",
            "service": "graph_sitter",
            "action": "analyze_pr",
            "parameters": {
                "repository": repository,
                "pr_number": pr_data["number"],
                "base_branch": pr_data["base_branch"],
                "head_branch": pr_data["head_branch"]
            }
        },
        {
            "name": "build_validation",
            "service": "grainchain",
            "action": "validate_build",
            "parameters": {
                "repository": repository,
                "pr_number": pr_data["number"]
            }
        },
        {
            "name": "web_evaluation",
            "service": "web_eval_agent",
            "action": "test_pr",
            "parameters": {
                "git_repo": repository,
                "pull_request": pr_data["number"],
                "task": f"Evaluate PR #{pr_data['number']}: {pr_data['title']}"
            }
        }
    ]
    
    # Execute workflow
    try:
        await workflow_engine.execute_workflow(
            workflow_id=validation_id,
            steps=workflow_steps,
            context=workflow_context
        )
        
        # Publish validation started event
        event_bus = get_event_bus()
        if event_bus:
            validation_event = Event(
                event_type="pr_validation.started",
                source_component="webhook_handler",
                data={
                    "validation_id": validation_id,
                    "repository": repository,
                    "pr_number": pr_data["number"],
                    "pr_title": pr_data["title"]
                }
            )
            await event_bus.publish(validation_event)
        
        return validation_id
        
    except Exception as e:
        # Publish validation failed event
        event_bus = get_event_bus()
        if event_bus:
            failure_event = Event(
                event_type="pr_validation.failed",
                source_component="webhook_handler",
                data={
                    "validation_id": validation_id,
                    "repository": repository,
                    "pr_number": pr_data["number"],
                    "error": str(e)
                }
            )
            await event_bus.publish(failure_event)
        
        raise ValidationError(f"Failed to start validation workflow: {str(e)}")


async def update_project_pr_status(
    repository: str,
    pr_data: Dict[str, Any],
    action: str
) -> None:
    """Update project PR status in dashboard"""
    
    event_bus = get_event_bus()
    if not event_bus:
        return
    
    # Create PR update event
    pr_update_event = Event(
        event_type="project.pr_updated",
        source_component="webhook_handler",
        data={
            "repository": repository,
            "action": action,
            "pull_request": {
                "number": pr_data["number"],
                "title": pr_data["title"],
                "state": pr_data.get("state", "open"),
                "html_url": pr_data["html_url"],
                "user": pr_data["user"],
                "created_at": pr_data["created_at"],
                "updated_at": pr_data["updated_at"],
                "merged": pr_data.get("merged", False),
                "draft": pr_data.get("draft", False)
            }
        }
    )
    
    await event_bus.publish(pr_update_event)


@router.post("/pr-validation")
async def handle_pr_validation_request(
    request_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    x_webhook_source: Optional[str] = Header(None, alias="X-Webhook-Source"),
    x_event_type: Optional[str] = Header(None, alias="X-Event-Type")
):
    """Handle PR validation requests from Cloudflare Worker"""
    
    try:
        # Validate request data
        required_fields = ["repository", "pull_request", "validation_config"]
        for field in required_fields:
            if field not in request_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        repository = request_data["repository"]
        pr_data = request_data["pull_request"]
        validation_config = request_data["validation_config"]
        
        # Trigger validation workflow in background
        validation_id = await trigger_grainchain_validation_flow(
            repository, pr_data, validation_config
        )
        
        # Update project PR status
        background_tasks.add_task(
            update_project_pr_status,
            repository,
            pr_data,
            "validation_started"
        )
        
        return JSONResponse(
            content={
                "status": "success",
                "validation_id": validation_id,
                "message": "PR validation workflow started",
                "repository": repository,
                "pr_number": pr_data["number"],
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=200
        )
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/pr-update")
async def handle_pr_update(
    request_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    x_webhook_source: Optional[str] = Header(None, alias="X-Webhook-Source"),
    x_event_type: Optional[str] = Header(None, alias="X-Event-Type")
):
    """Handle PR update notifications from Cloudflare Worker"""
    
    try:
        # Validate request data
        required_fields = ["repository", "pull_request", "action"]
        for field in required_fields:
            if field not in request_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        repository = request_data["repository"]
        pr_data = request_data["pull_request"]
        action = request_data["action"]
        
        # Update project PR status
        background_tasks.add_task(
            update_project_pr_status,
            repository,
            pr_data,
            action
        )
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "PR update processed",
                "repository": repository,
                "pr_number": pr_data["number"],
                "action": action,
                "timestamp": datetime.utcnow().isoformat()
            },
            status_code=200
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/status")
async def get_webhook_status():
    """Get webhook system status"""
    
    integration_manager = get_integration_manager()
    event_bus = get_event_bus()
    
    return {
        "status": "healthy",
        "service": "webhook-handler",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "integration_manager": {
                "available": integration_manager is not None,
                "status": "healthy" if integration_manager else "unavailable"
            },
            "event_bus": {
                "available": event_bus is not None,
                "running": event_bus.running if event_bus else False,
                "metrics": event_bus.get_metrics() if event_bus else {}
            }
        },
        "supported_events": [
            "pr_validation_request",
            "pr_update"
        ]
    }


@router.post("/test")
async def test_webhook_system():
    """Test webhook system functionality"""
    
    # Test event bus
    event_bus = get_event_bus()
    if not event_bus:
        raise HTTPException(
            status_code=500,
            detail="Event bus not available"
        )
    
    # Create test event
    test_event = Event(
        event_type="webhook.test",
        source_component="webhook_handler",
        data={
            "test_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    try:
        await event_bus.publish(test_event)
        
        return {
            "status": "success",
            "message": "Webhook system test passed",
            "test_event_id": test_event.correlation_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Webhook system test failed: {str(e)}"
        )


@router.get("/events/recent")
async def get_recent_webhook_events(limit: int = 10):
    """Get recent webhook events"""
    
    event_bus = get_event_bus()
    if not event_bus:
        raise HTTPException(
            status_code=500,
            detail="Event bus not available"
        )
    
    # Get recent webhook-related events
    webhook_events = event_bus.get_event_history(
        component="webhook_handler",
        limit=limit
    )
    
    return {
        "events": [event.to_dict() for event in webhook_events],
        "total": len(webhook_events),
        "timestamp": datetime.utcnow().isoformat()
    }
