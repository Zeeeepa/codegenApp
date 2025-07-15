#!/bin/bash

# Load environment variables from .env file
# Copy .env.example to .env and fill in your actual values

# Check if .env file exists
if [ -f "../.env" ]; then
    source ../.env
    echo "Loaded environment variables from .env file"
else
    echo "Warning: .env file not found. Please copy .env.example to .env and configure your API keys."
    echo "Using placeholder values - the application may not work correctly."
    
    # Placeholder environment variables
    export CODEGEN_ORG_ID=your_org_id_here
    export CODEGEN_API_TOKEN=your_codegen_api_token_here
    export GITHUB_TOKEN=your_github_token_here
    export CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
    export CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
    export CLOUDFLARE_WORKER_NAME=webhook-gateway
    export CLOUDFLARE_WORKER_URL=https://webhook-gateway.your-subdomain.workers.dev
    export GEMINI_API_KEY=your_gemini_api_key_here
fi

# Activate virtual environment
source venv/bin/activate

# Start the backend
uvicorn main_simple:app --host 0.0.0.0 --port 8080 --reload

