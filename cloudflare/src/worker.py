"""
Cloudflare Workers webhook handler for CodegenApp
Handles GitHub PR events and triggers grainchain validation flows
"""

import json
import hmac
import hashlib
import asyncio
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import httpx


# Pydantic models for webhook payloads
class GitHubPREvent(BaseModel):
    action: str
    number: int
    pull_request: Dict[str, Any]
    repository: Dict[str, Any]
    sender: Dict[str, Any]


class GrainchainValidationRequest(BaseModel):
    project_id: str = Field(..., description="GitHub repository full name")
    pr_number: int = Field(..., description="Pull request number")
    pr_url: str = Field(..., description="Pull request URL")
    head_sha: str = Field(..., description="Head commit SHA")
    base_sha: str = Field(..., description="Base commit SHA")
    webhook_url: str = Field(..., description="Webhook URL for status updates")


class WebhookResponse(BaseModel):
    success: bool
    message: str
    validation_id: Optional[str] = None


# FastAPI app instance
app = FastAPI(
    title="CodegenApp Webhook Gateway",
    description="Cloudflare Workers webhook handler for PR events and grainchain validation",
    version="1.0.0"
)


async def on_fetch(request, env):
    """Cloudflare Workers entry point"""
    import asgi
    return await asgi.fetch(app, request, env)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature.startswith('sha256='):
        return False
    
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    received_signature = signature[7:]  # Remove 'sha256=' prefix
    return hmac.compare_digest(expected_signature, received_signature)


async def trigger_grainchain_validation(validation_request: GrainchainValidationRequest) -> Dict[str, Any]:
    """Trigger grainchain validation for a PR"""
    grainchain_url = "http://localhost:8080"  # This will be set from environment
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{grainchain_url}/api/v1/validation/trigger",
                json=validation_request.dict(),
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to connect to grainchain: {str(e)}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Grainchain error: {e.response.text}")


async def process_pr_event_background(pr_event: GitHubPREvent, webhook_url: str):
    """Background task to process PR events"""
    try:
        # Extract PR information
        pr = pr_event.pull_request
        repo = pr_event.repository
        
        validation_request = GrainchainValidationRequest(
            project_id=repo["full_name"],
            pr_number=pr_event.number,
            pr_url=pr["html_url"],
            head_sha=pr["head"]["sha"],
            base_sha=pr["base"]["sha"],
            webhook_url=webhook_url
        )
        
        # Trigger grainchain validation
        result = await trigger_grainchain_validation(validation_request)
        
        print(f"Grainchain validation triggered for PR #{pr_event.number}: {result}")
        
    except Exception as e:
        print(f"Error processing PR event: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "CodegenApp Webhook Gateway",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "webhook-gateway",
        "timestamp": "2024-07-15T05:54:25Z",
        "checks": {
            "api": "ok",
            "grainchain_connection": "pending"  # Could add actual health check
        }
    }


@app.post("/webhook/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle GitHub webhook events"""
    
    # Get request body and headers
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")
    
    # Verify webhook signature (in production, get secret from environment)
    webhook_secret = "your_webhook_secret_here"  # This will be set from environment
    if not verify_github_signature(body, signature, webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    # Parse JSON payload
    try:
        payload = json.loads(body.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Handle pull request events
    if event_type == "pull_request":
        try:
            pr_event = GitHubPREvent(**payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid PR event payload: {str(e)}")
        
        # Only process specific PR actions that should trigger validation
        trigger_actions = ["opened", "synchronize", "reopened"]
        if pr_event.action in trigger_actions:
            # Get webhook URL from request
            webhook_url = str(request.url).replace("/webhook/github", "")
            
            # Process in background to avoid blocking the webhook response
            background_tasks.add_task(process_pr_event_background, pr_event, webhook_url)
            
            return WebhookResponse(
                success=True,
                message=f"PR #{pr_event.number} validation queued for processing",
                validation_id=f"val_{pr_event.repository['full_name'].replace('/', '_')}_{pr_event.number}"
            )
        else:
            return WebhookResponse(
                success=True,
                message=f"PR action '{pr_event.action}' does not trigger validation"
            )
    
    # Handle other event types if needed
    return WebhookResponse(
        success=True,
        message=f"Event type '{event_type}' received but not processed"
    )


@app.post("/webhook/status")
async def webhook_status_update(request: Request):
    """Receive status updates from grainchain validation"""
    try:
        payload = await request.json()
        
        # Log the status update (in production, you might want to forward this to the main app)
        print(f"Validation status update: {payload}")
        
        return {"success": True, "message": "Status update received"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid status update: {str(e)}")


@app.get("/webhook/projects/{project_id}/status")
async def get_project_webhook_status(project_id: str):
    """Get webhook status for a specific project"""
    # This would typically query a database or cache
    # For now, return a mock response
    return {
        "project_id": project_id,
        "webhook_configured": True,
        "last_event": "2024-07-15T05:54:25Z",
        "status": "active"
    }


if __name__ == "__main__":
    # This won't be used in Cloudflare Workers, but useful for local testing
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

