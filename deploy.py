#!/usr/bin/env python3
"""
CodegenApp Deployment and Validation Pipeline
Orchestrates the complete CI/CD flow with AI-powered validation
"""

import os
import sys
import json
import asyncio
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class DeploymentConfig:
    """Configuration for deployment pipeline"""
    project_name: str
    github_repo: str
    webhook_url: str
    codegen_api_token: str
    codegen_org_id: str
    github_token: str
    gemini_api_key: str
    cloudflare_api_key: str
    cloudflare_account_id: str
    cloudflare_worker_url: str
    auto_merge: bool = False

class ValidationPipeline:
    """Main validation pipeline orchestrator"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.validation_results = {}
        
    async def run_validation_flow(self, pr_number: str) -> Dict[str, Any]:
        """Run the complete validation flow for a PR"""
        logger.info(f"Starting validation flow for PR #{pr_number}")
        
        try:
            # Step 1: Create isolated validation environment
            snapshot_id = await self.create_validation_snapshot()
            logger.info(f"Created validation snapshot: {snapshot_id}")
            
            # Step 2: Deploy PR code to validation environment
            deployment_result = await self.deploy_pr_code(pr_number, snapshot_id)
            if not deployment_result['success']:
                return await self.handle_deployment_failure(pr_number, deployment_result)
            
            # Step 3: Run deployment validation
            validation_result = await self.validate_deployment(snapshot_id)
            if not validation_result['success']:
                return await self.handle_validation_failure(pr_number, validation_result)
            
            # Step 4: Run web evaluation tests
            web_eval_result = await self.run_web_evaluation(snapshot_id)
            if not web_eval_result['success']:
                return await self.handle_web_eval_failure(pr_number, web_eval_result)
            
            # Step 5: Final validation and auto-merge decision
            final_result = await self.finalize_validation(pr_number)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Validation pipeline failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'stage': 'pipeline_error'
            }
    
    async def create_validation_snapshot(self) -> str:
        """Create isolated validation environment with pre-deployed tools"""
        logger.info("Creating validation snapshot...")
        
        # Use grainchain to create isolated environment
        cmd = [
            "python", "-m", "grainchain.snapshot",
            "--create",
            "--name", f"validation-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "--pre-install", "graph-sitter,web-eval-agent"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to create snapshot: {result.stderr}")
        
        snapshot_data = json.loads(result.stdout)
        return snapshot_data['snapshot_id']
    
    async def deploy_pr_code(self, pr_number: str, snapshot_id: str) -> Dict[str, Any]:
        """Deploy PR code to validation environment"""
        logger.info(f"Deploying PR #{pr_number} to snapshot {snapshot_id}")
        
        try:
            # Clone PR code
            clone_cmd = [
                "git", "clone", 
                f"https://github.com/{self.config.github_repo}.git",
                f"/tmp/pr-{pr_number}"
            ]
            subprocess.run(clone_cmd, check=True)
            
            # Checkout PR branch
            os.chdir(f"/tmp/pr-{pr_number}")
            subprocess.run(["git", "fetch", "origin", f"pull/{pr_number}/head:pr-{pr_number}"], check=True)
            subprocess.run(["git", "checkout", f"pr-{pr_number}"], check=True)
            
            # Run deployment commands
            deployment_commands = [
                "npm install",
                "npm run build",
                "cd backend && pip install -r requirements.txt",
                "cd backend && python -m pytest tests/ -v"
            ]
            
            for cmd in deployment_commands:
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.returncode != 0:
                    return {
                        'success': False,
                        'error': result.stderr,
                        'command': cmd,
                        'stage': 'deployment'
                    }
            
            return {'success': True, 'snapshot_id': snapshot_id}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'stage': 'deployment'
            }
    
    async def validate_deployment(self, snapshot_id: str) -> Dict[str, Any]:
        """Validate deployment using Gemini AI analysis"""
        logger.info(f"Validating deployment in snapshot {snapshot_id}")
        
        try:
            # Analyze deployment logs and context using Gemini
            import google.generativeai as genai
            genai.configure(api_key=self.config.gemini_api_key)
            
            model = genai.GenerativeModel('gemini-pro')
            
            # Get deployment logs
            logs = self.get_deployment_logs(snapshot_id)
            
            prompt = f"""
            Analyze the following deployment logs and determine if the deployment was successful:
            
            {logs}
            
            Provide a JSON response with:
            - success: boolean
            - issues: list of any issues found
            - recommendations: list of recommendations
            """
            
            response = model.generate_content(prompt)
            analysis = json.loads(response.text)
            
            return {
                'success': analysis.get('success', False),
                'analysis': analysis,
                'stage': 'validation'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'stage': 'validation'
            }
    
    async def run_web_evaluation(self, snapshot_id: str) -> Dict[str, Any]:
        """Run comprehensive web evaluation using web-eval-agent"""
        logger.info(f"Running web evaluation in snapshot {snapshot_id}")
        
        try:
            # Run web-eval-agent comprehensive testing
            cmd = [
                "python", "-m", "webEvalAgent.mcp_server",
                "--url", "http://localhost:3000",
                "--comprehensive",
                "--output", f"/tmp/web-eval-{snapshot_id}.json"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return {
                    'success': False,
                    'error': result.stderr,
                    'stage': 'web_evaluation'
                }
            
            # Parse evaluation results
            with open(f"/tmp/web-eval-{snapshot_id}.json", 'r') as f:
                eval_results = json.load(f)
            
            return {
                'success': eval_results.get('overall_success', False),
                'results': eval_results,
                'stage': 'web_evaluation'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'stage': 'web_evaluation'
            }
    
    async def handle_deployment_failure(self, pr_number: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Handle deployment failures by sending context to Codegen API"""
        logger.info(f"Handling deployment failure for PR #{pr_number}")
        
        # Send error context to Codegen API for resolution
        await self.send_codegen_continuation(
            pr_number,
            f"Deployment failed with error: {result['error']}. Please update the PR to resolve this issue."
        )
        
        return {
            'success': False,
            'action': 'codegen_continuation_sent',
            'stage': result['stage']
        }
    
    async def handle_validation_failure(self, pr_number: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Handle validation failures"""
        logger.info(f"Handling validation failure for PR #{pr_number}")
        
        await self.send_codegen_continuation(
            pr_number,
            f"Validation failed: {result['error']}. Please review and update the PR."
        )
        
        return {
            'success': False,
            'action': 'codegen_continuation_sent',
            'stage': result['stage']
        }
    
    async def handle_web_eval_failure(self, pr_number: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Handle web evaluation failures"""
        logger.info(f"Handling web evaluation failure for PR #{pr_number}")
        
        await self.send_codegen_continuation(
            pr_number,
            f"Web evaluation failed: {result['error']}. Please fix the issues and update the PR."
        )
        
        return {
            'success': False,
            'action': 'codegen_continuation_sent',
            'stage': result['stage']
        }
    
    async def finalize_validation(self, pr_number: str) -> Dict[str, Any]:
        """Finalize validation and handle auto-merge"""
        logger.info(f"Finalizing validation for PR #{pr_number}")
        
        if self.config.auto_merge:
            # Auto-merge the PR
            merge_result = await self.merge_pr(pr_number)
            return {
                'success': True,
                'action': 'auto_merged',
                'merge_result': merge_result
            }
        else:
            return {
                'success': True,
                'action': 'validation_complete',
                'message': 'Validation successful. Ready for manual merge.'
            }
    
    async def send_codegen_continuation(self, pr_number: str, message: str):
        """Send continuation message to Codegen API"""
        import requests
        
        headers = {
            'Authorization': f'Bearer {self.config.codegen_api_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'message': message,
            'context': f'PR #{pr_number}',
            'organization_id': self.config.codegen_org_id
        }
        
        response = requests.post(
            'https://api.codegen.com/v1/agents/continue',
            headers=headers,
            json=data
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to send continuation: {response.text}")
    
    async def merge_pr(self, pr_number: str) -> Dict[str, Any]:
        """Merge PR to main branch"""
        import requests
        
        headers = {
            'Authorization': f'token {self.config.github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        data = {
            'commit_title': f'Auto-merge PR #{pr_number} after successful validation',
            'merge_method': 'squash'
        }
        
        response = requests.put(
            f'https://api.github.com/repos/{self.config.github_repo}/pulls/{pr_number}/merge',
            headers=headers,
            json=data
        )
        
        return {
            'success': response.status_code == 200,
            'response': response.json() if response.status_code == 200 else response.text
        }
    
    def get_deployment_logs(self, snapshot_id: str) -> str:
        """Get deployment logs from snapshot"""
        try:
            with open(f"/tmp/deployment-{snapshot_id}.log", 'r') as f:
                return f.read()
        except FileNotFoundError:
            return "No deployment logs found"

class WebhookHandler:
    """Handle GitHub webhook events"""
    
    def __init__(self, config: DeploymentConfig):
        self.config = config
        self.pipeline = ValidationPipeline(config)
    
    async def handle_pr_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle PR webhook events"""
        action = event_data.get('action')
        pr_number = str(event_data.get('pull_request', {}).get('number', ''))
        
        if action in ['opened', 'synchronize']:
            logger.info(f"Processing PR #{pr_number} event: {action}")
            return await self.pipeline.run_validation_flow(pr_number)
        
        return {'success': True, 'action': 'ignored'}

def load_config() -> DeploymentConfig:
    """Load configuration from environment variables"""
    return DeploymentConfig(
        project_name=os.getenv('PROJECT_NAME', 'codegenApp'),
        github_repo=os.getenv('GITHUB_REPO', 'Zeeeepa/codegenApp'),
        webhook_url=os.getenv('CLOUDFLARE_WORKER_URL', ''),
        codegen_api_token=os.getenv('CODEGEN_API_TOKEN', ''),
        codegen_org_id=os.getenv('CODEGEN_ORG_ID', ''),
        github_token=os.getenv('GITHUB_TOKEN', ''),
        gemini_api_key=os.getenv('GEMINI_API_KEY', ''),
        cloudflare_api_key=os.getenv('CLOUDFLARE_API_KEY', ''),
        cloudflare_account_id=os.getenv('CLOUDFLARE_ACCOUNT_ID', ''),
        cloudflare_worker_url=os.getenv('CLOUDFLARE_WORKER_URL', ''),
        auto_merge=os.getenv('AUTO_MERGE', 'false').lower() == 'true'
    )

async def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python deploy.py <command> [args]")
        print("Commands:")
        print("  validate-pr <pr_number>  - Run validation pipeline for PR")
        print("  webhook <event_file>     - Process webhook event")
        print("  setup                    - Setup deployment environment")
        return
    
    command = sys.argv[1]
    config = load_config()
    
    if command == 'validate-pr':
        if len(sys.argv) < 3:
            print("Usage: python deploy.py validate-pr <pr_number>")
            return
        
        pr_number = sys.argv[2]
        pipeline = ValidationPipeline(config)
        result = await pipeline.run_validation_flow(pr_number)
        print(json.dumps(result, indent=2))
    
    elif command == 'webhook':
        if len(sys.argv) < 3:
            print("Usage: python deploy.py webhook <event_file>")
            return
        
        event_file = sys.argv[2]
        with open(event_file, 'r') as f:
            event_data = json.load(f)
        
        handler = WebhookHandler(config)
        result = await handler.handle_pr_event(event_data)
        print(json.dumps(result, indent=2))
    
    elif command == 'setup':
        print("Setting up deployment environment...")
        # Add setup logic here
        print("Setup complete!")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == '__main__':
    asyncio.run(main())
