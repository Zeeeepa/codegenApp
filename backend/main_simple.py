"""
Simple FastAPI backend for CodegenApp with webhook support
"""

import os
import json
import hmac
import hashlib
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="CodegenApp Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WebhookPayload(BaseModel):
    event_type: str
    payload: Dict[str, Any]
    signature: Optional[str] = None

class ServiceStatus(BaseModel):
    status: str
    version: str
    integrations: Dict[str, bool]

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

async def trigger_grainchain_validation(event_data: Dict[str, Any]):
    """Trigger grainchain validation for PR events"""
    grainchain_url = os.getenv('GRAINCHAIN_API_URL', 'http://localhost:8080')
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{grainchain_url}/validate",
                json=event_data,
                timeout=30.0
            )
            return response.json()
    except Exception as e:
        print(f"Error triggering grainchain validation: {e}")
        return {"error": str(e)}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "CodegenApp Backend API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return ServiceStatus(
        status="healthy",
        version="1.0.0",
        integrations={
            "codegen_api": bool(os.getenv('CODEGEN_API_TOKEN')),
            "github": bool(os.getenv('GITHUB_TOKEN')),
            "cloudflare": bool(os.getenv('CLOUDFLARE_API_KEY')),
            "grainchain": bool(os.getenv('GRAINCHAIN_API_URL')),
            "gemini": bool(os.getenv('GEMINI_API_KEY'))
        }
    )

@app.get("/config")
async def get_config():
    """Get configuration status"""
    return {
        "integrations": {
            "codegen_api": bool(os.getenv('CODEGEN_API_TOKEN')),
            "github": bool(os.getenv('GITHUB_TOKEN')),
            "cloudflare": bool(os.getenv('CLOUDFLARE_API_KEY')),
            "grainchain": bool(os.getenv('GRAINCHAIN_API_URL')),
            "gemini": bool(os.getenv('GEMINI_API_KEY'))
        },
        "urls": {
            "grainchain": os.getenv('GRAINCHAIN_API_URL', 'http://localhost:8080'),
            "cloudflare_worker": os.getenv('CLOUDFLARE_WORKER_URL', 'https://webhook-gateway.your-subdomain.workers.dev')
        }
    }

@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment variables (non-sensitive)"""
    return {
        "env_vars": {
            "CODEGEN_ORG_ID": bool(os.getenv('CODEGEN_ORG_ID')),
            "CODEGEN_API_TOKEN": bool(os.getenv('CODEGEN_API_TOKEN')),
            "GITHUB_TOKEN": bool(os.getenv('GITHUB_TOKEN')),
            "CLOUDFLARE_API_KEY": bool(os.getenv('CLOUDFLARE_API_KEY')),
            "CLOUDFLARE_ACCOUNT_ID": bool(os.getenv('CLOUDFLARE_ACCOUNT_ID')),
            "CLOUDFLARE_WORKER_NAME": os.getenv('CLOUDFLARE_WORKER_NAME', 'webhook-gateway'),
            "CLOUDFLARE_WORKER_URL": os.getenv('CLOUDFLARE_WORKER_URL', 'https://webhook-gateway.your-subdomain.workers.dev'),
            "GEMINI_API_KEY": bool(os.getenv('GEMINI_API_KEY')),
            "GRAINCHAIN_API_URL": os.getenv('GRAINCHAIN_API_URL', 'http://localhost:8080')
        }
    }

@app.post("/webhook/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle GitHub webhook events"""
    # Get the raw body for signature verification
    body = await request.body()
    
    # Get headers
    signature = request.headers.get('X-Hub-Signature-256')
    event_type = request.headers.get('X-GitHub-Event')
    
    if not signature or not event_type:
        raise HTTPException(status_code=400, detail="Missing required headers")
    
    # Verify signature
    webhook_secret = os.getenv('GITHUB_WEBHOOK_SECRET')
    if webhook_secret and not verify_github_signature(body, signature, webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse JSON payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Process webhook in background
    background_tasks.add_task(process_webhook_event, event_type, payload)
    
    return {"status": "received", "event_type": event_type}

async def process_webhook_event(event_type: str, payload: Dict[str, Any]):
    """Process webhook event in background"""
    print(f"Processing {event_type} event")
    
    # Handle PR events
    if event_type == 'pull_request':
        action = payload.get('action')
        if action in ['opened', 'synchronize', 'reopened']:
            # Trigger grainchain validation
            validation_result = await trigger_grainchain_validation({
                'event_type': event_type,
                'action': action,
                'pull_request': payload.get('pull_request', {}),
                'repository': payload.get('repository', {})
            })
            print(f"Grainchain validation result: {validation_result}")
    
    # Handle other events as needed
    elif event_type in ['push', 'issues', 'release']:
        print(f"Handling {event_type} event")
        # Add specific handling for other events

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

