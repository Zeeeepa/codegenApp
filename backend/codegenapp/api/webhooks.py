"""
Webhook API endpoints

This module handles incoming webhook notifications from GitHub and other services.
"""

import logging
import json
from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from codegenapp.services.webhook_processor import WebhookProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Initialize webhook processor
webhook_processor = WebhookProcessor()


@router.post("/github")
async def handle_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Handle GitHub webhook notifications
    
    This endpoint receives webhook notifications from GitHub when events occur
    on repositories (PR creation, updates, merges, etc.)
    """
    try:
        # Get the event type from headers
        event_type = request.headers.get("X-GitHub-Event")
        delivery_id = request.headers.get("X-GitHub-Delivery")
        
        if not event_type:
            raise HTTPException(status_code=400, detail="Missing X-GitHub-Event header")
        
        # Parse the webhook payload
        payload = await request.json()
        
        logger.info(f"Received GitHub webhook: {event_type} (delivery: {delivery_id})")
        
        # Process the webhook in the background
        background_tasks.add_task(
            webhook_processor.process_github_webhook,
            event_type=event_type,
            payload=payload,
            delivery_id=delivery_id
        )
        
        return JSONResponse(
            status_code=200,
            content={"status": "received", "event_type": event_type}
        )
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON payload in GitHub webhook")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    except Exception as e:
        logger.error(f"Error processing GitHub webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/cloudflare")
async def handle_cloudflare_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Handle Cloudflare Worker webhook notifications
    
    This endpoint receives webhook notifications forwarded by Cloudflare Workers
    """
    try:
        # Parse the webhook payload
        payload = await request.json()
        
        # Extract the original event information
        event_type = payload.get("event_type")
        original_payload = payload.get("payload", {})
        source = payload.get("source", "cloudflare")
        
        logger.info(f"Received Cloudflare webhook: {event_type} from {source}")
        
        # Process based on the original source
        if source == "github":
            background_tasks.add_task(
                webhook_processor.process_github_webhook,
                event_type=event_type,
                payload=original_payload,
                delivery_id=payload.get("delivery_id")
            )
        else:
            logger.warning(f"Unknown webhook source: {source}")
        
        return JSONResponse(
            status_code=200,
            content={"status": "received", "source": source, "event_type": event_type}
        )
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON payload in Cloudflare webhook")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    except Exception as e:
        logger.error(f"Error processing Cloudflare webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def webhook_health():
    """Health check endpoint for webhook service"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "webhook-handler",
            "endpoints": [
                "/webhooks/github",
                "/webhooks/cloudflare"
            ]
        }
    )


@router.post("/test")
async def test_webhook(payload: Dict[str, Any]):
    """
    Test endpoint for webhook functionality
    
    This endpoint can be used to test webhook processing without
    actual GitHub or Cloudflare events
    """
    try:
        logger.info(f"Test webhook received: {payload}")
        
        # Process as a test event
        await webhook_processor.process_test_webhook(payload)
        
        return JSONResponse(
            status_code=200,
            content={"status": "processed", "payload": payload}
        )
        
    except Exception as e:
        logger.error(f"Error processing test webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
