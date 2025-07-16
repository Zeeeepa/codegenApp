"""
Cloudflare Worker for GitHub PR Webhook Processing
Handles GitHub webhook events and triggers Grainchain validation flow
"""

from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import JSONResponse
import json
import hmac
import hashlib
import os
from typing import Optional, Dict, Any
import httpx
import asyncio
from datetime import datetime


async def on_fetch(request, env):
    import asgi
    return await asgi.fetch(app, request, env)


app = FastAPI(
    title="CodegenApp Webhook Handler",
    description="GitHub PR webhook processor for CodegenApp",
    version="1.0.0"
)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature.startswith('sha256='):
        return False
    
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f'sha256={expected_signature}', signature)


async def trigger_grainchain_validation(
    repo_full_name: str,
    pr_number: int,
    pr_data: Dict[str, Any],
    webhook_target_url: str
) -> Dict[str, Any]:
    """Trigger Grainchain validation flow for PR"""
    
    validation_payload = {
        "event_type": "pr_validation_request",
        "repository": repo_full_name,
        "pull_request": {
            "number": pr_number,
            "title": pr_data.get("title", ""),
            "head_sha": pr_data.get("head", {}).get("sha", ""),
            "base_branch": pr_data.get("base", {}).get("ref", "main"),
            "head_branch": pr_data.get("head", {}).get("ref", ""),
            "html_url": pr_data.get("html_url", ""),
            "user": pr_data.get("user", {}).get("login", ""),
            "created_at": pr_data.get("created_at", ""),
            "updated_at": pr_data.get("updated_at", "")
        },
        "validation_config": {
            "run_tests": True,
            "check_build": True,
            "web_evaluation": True,
            "code_analysis": True
        },
        "webhook_target": webhook_target_url,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Send to CodegenApp backend for processing
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{webhook_target_url}/api/v1/webhooks/pr-validation",
                json=validation_payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Source": "cloudflare-worker",
                    "X-Event-Type": "pr_validation_request"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                return {
                    "status": "success",
                    "validation_id": response.json().get("validation_id"),
                    "message": "Grainchain validation triggered successfully"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to trigger validation: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to trigger validation: {str(e)}"
            }


async def notify_dashboard_update(
    repo_full_name: str,
    pr_data: Dict[str, Any],
    webhook_target_url: str,
    event_action: str
) -> None:
    """Notify dashboard of PR updates"""
    
    notification_payload = {
        "event_type": "pr_update",
        "action": event_action,
        "repository": repo_full_name,
        "pull_request": {
            "number": pr_data.get("number"),
            "title": pr_data.get("title", ""),
            "state": pr_data.get("state", ""),
            "html_url": pr_data.get("html_url", ""),
            "user": pr_data.get("user", {}).get("login", ""),
            "created_at": pr_data.get("created_at", ""),
            "updated_at": pr_data.get("updated_at", ""),
            "merged": pr_data.get("merged", False),
            "mergeable": pr_data.get("mergeable"),
            "draft": pr_data.get("draft", False)
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Send to CodegenApp backend for dashboard updates
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"{webhook_target_url}/api/v1/webhooks/pr-update",
                json=notification_payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Source": "cloudflare-worker",
                    "X-Event-Type": "pr_update"
                },
                timeout=10.0
            )
        except Exception as e:
            print(f"Failed to notify dashboard: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "CodegenApp Webhook Handler",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "webhook-handler",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": {
            "has_github_secret": bool(os.getenv("GITHUB_WEBHOOK_SECRET")),
            "has_codegenapp_url": bool(os.getenv("CODEGENAPP_BASE_URL"))
        }
    }


@app.post("/webhook/github")
async def handle_github_webhook(
    request: Request,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    x_github_delivery: str = Header(..., alias="X-GitHub-Delivery")
):
    """Handle GitHub webhook events"""
    
    # Get webhook secret from environment
    webhook_secret = os.getenv("GITHUB_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    # Get request body
    body = await request.body()
    
    # Verify signature
    if x_hub_signature_256:
        if not verify_github_signature(body, x_hub_signature_256, webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse payload
    try:
        payload = json.loads(body.decode('utf-8'))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Get repository info
    repository = payload.get("repository", {})
    repo_full_name = repository.get("full_name", "")
    
    # Get webhook target URL from repository configuration or environment
    webhook_target_url = (
        repository.get("custom_properties", {}).get("codegenapp_webhook_url") or
        os.getenv("CODEGENAPP_BASE_URL")
    )
    
    if not webhook_target_url:
        raise HTTPException(
            status_code=400, 
            detail="No webhook target URL configured for this repository"
        )
    
    response_data = {
        "event": x_github_event,
        "delivery_id": x_github_delivery,
        "repository": repo_full_name,
        "processed_at": datetime.utcnow().isoformat(),
        "status": "processed"
    }
    
    # Handle different event types
    if x_github_event == "pull_request":
        pr_data = payload.get("pull_request", {})
        action = payload.get("action", "")
        pr_number = pr_data.get("number")
        
        response_data.update({
            "action": action,
            "pull_request_number": pr_number,
            "pull_request_title": pr_data.get("title", "")
        })
        
        # Trigger validation for opened/synchronize events
        if action in ["opened", "synchronize", "reopened"]:
            validation_result = await trigger_grainchain_validation(
                repo_full_name, pr_number, pr_data, webhook_target_url
            )
            response_data["validation"] = validation_result
        
        # Notify dashboard of PR updates
        await notify_dashboard_update(
            repo_full_name, pr_data, webhook_target_url, action
        )
        
    elif x_github_event == "push":
        # Handle push events (optional)
        ref = payload.get("ref", "")
        commits = payload.get("commits", [])
        
        response_data.update({
            "ref": ref,
            "commits_count": len(commits)
        })
        
        # Could trigger validation for pushes to main branch
        if ref == "refs/heads/main" or ref == "refs/heads/master":
            # Optional: trigger validation for main branch pushes
            pass
    
    elif x_github_event == "ping":
        # Handle ping events (webhook setup verification)
        response_data.update({
            "message": "Webhook configured successfully",
            "zen": payload.get("zen", "")
        })
    
    else:
        # Handle other events
        response_data.update({
            "message": f"Event {x_github_event} received but not processed"
        })
    
    return JSONResponse(content=response_data, status_code=200)


@app.post("/webhook/test")
async def test_webhook():
    """Test endpoint for webhook functionality"""
    return {
        "message": "Webhook test successful",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": {
            "github_secret_configured": bool(os.getenv("GITHUB_WEBHOOK_SECRET")),
            "codegenapp_url_configured": bool(os.getenv("CODEGENAPP_BASE_URL"))
        }
    }


@app.get("/webhook/status/{repo_owner}/{repo_name}")
async def get_webhook_status(repo_owner: str, repo_name: str):
    """Get webhook status for a specific repository"""
    repo_full_name = f"{repo_owner}/{repo_name}"
    
    return {
        "repository": repo_full_name,
        "webhook_status": "active",
        "last_delivery": None,  # Could be tracked in database
        "configuration": {
            "events": ["pull_request", "push", "ping"],
            "active": True
        },
        "timestamp": datetime.utcnow().isoformat()
    }
