"""
Deployment Validation Workflow Template

Provides a comprehensive deployment validation workflow with Grainchain integration.
"""

from typing import Dict, Any, List
from pydantic import BaseModel
from app.models.domain.workflow import WorkflowDefinition, WorkflowStep


class DeploymentValidationConfig(BaseModel):
    """Configuration for deployment validation workflow"""
    repository_url: str
    branch: str = "main"
    deployment_environment: str = "staging"
    validation_tests: List[str] = ["smoke", "health", "integration"]
    rollback_on_failure: bool = True
    notify_on_completion: bool = True


class DeploymentValidationWorkflow:
    """Deployment Validation Workflow Template"""
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get the workflow template definition"""
        return {
            "id": "deployment_validation",
            "name": "Deployment Validation Workflow",
            "description": "Comprehensive deployment validation with Grainchain sandboxing",
            "version": "1.0.0",
            "tags": ["deployment", "validation", "grainchain"],
            "parameters": {
                "repository_url": {
                    "type": "string",
                    "required": True,
                    "description": "Repository URL to deploy and validate"
                },
                "branch": {
                    "type": "string",
                    "default": "main",
                    "description": "Branch to deploy"
                },
                "deployment_environment": {
                    "type": "string",
                    "enum": ["development", "staging", "production"],
                    "default": "staging",
                    "description": "Target deployment environment"
                },
                "validation_tests": {
                    "type": "array",
                    "items": {"type": "string"},
                    "default": ["smoke", "health", "integration"],
                    "description": "Types of validation tests to run"
                },
                "rollback_on_failure": {
                    "type": "boolean",
                    "default": True,
                    "description": "Automatically rollback on validation failure"
                },
                "notify_on_completion": {
                    "type": "boolean",
                    "default": True,
                    "description": "Send notification on completion"
                }
            },
            "estimated_duration": 900,  # 15 minutes
            "steps": [
                {
                    "id": "create_sandbox",
                    "name": "Create Sandbox Environment",
                    "description": "Create isolated sandbox environment using Grainchain",
                    "service": "grainchain",
                    "timeout": 120
                },
                {
                    "id": "clone_and_build",
                    "name": "Clone and Build",
                    "description": "Clone repository and build application",
                    "service": "build",
                    "timeout": 300
                },
                {
                    "id": "deploy_to_sandbox",
                    "name": "Deploy to Sandbox",
                    "description": "Deploy application to sandbox environment",
                    "service": "deployment",
                    "timeout": 180
                },
                {
                    "id": "run_smoke_tests",
                    "name": "Run Smoke Tests",
                    "description": "Execute smoke tests to verify basic functionality",
                    "service": "testing",
                    "timeout": 120,
                    "condition": "smoke_tests"
                },
                {
                    "id": "run_health_checks",
                    "name": "Run Health Checks",
                    "description": "Execute health checks on deployed application",
                    "service": "health",
                    "timeout": 60,
                    "condition": "health_tests"
                },
                {
                    "id": "run_integration_tests",
                    "name": "Run Integration Tests",
                    "description": "Execute integration tests in sandbox environment",
                    "service": "testing",
                    "timeout": 240,
                    "condition": "integration_tests"
                },
                {
                    "id": "validate_deployment",
                    "name": "Validate Deployment",
                    "description": "Comprehensive deployment validation using Gemini API",
                    "service": "validation",
                    "timeout": 120
                },
                {
                    "id": "cleanup_sandbox",
                    "name": "Cleanup Sandbox",
                    "description": "Clean up sandbox environment and resources",
                    "service": "grainchain",
                    "timeout": 60
                },
                {
                    "id": "send_notification",
                    "name": "Send Notification",
                    "description": "Send completion notification",
                    "service": "notification",
                    "timeout": 30,
                    "condition": "notify_on_completion"
                }
            ]
        }
    
    @staticmethod
    def create_workflow(config: DeploymentValidationConfig) -> WorkflowDefinition:
        """Create a workflow instance from configuration"""
        template = DeploymentValidationWorkflow.get_workflow_template()
        
        steps = []
        for step_def in template["steps"]:
            # Skip conditional steps if condition not met
            if "condition" in step_def:
                condition = step_def["condition"]
                if condition == "smoke_tests" and "smoke" not in config.validation_tests:
                    continue
                if condition == "health_tests" and "health" not in config.validation_tests:
                    continue
                if condition == "integration_tests" and "integration" not in config.validation_tests:
                    continue
                if condition == "notify_on_completion" and not config.notify_on_completion:
                    continue
            
            step = WorkflowStep(
                id=step_def["id"],
                name=step_def["name"],
                service=step_def["service"],
                action=step_def.get("action", "execute"),
                parameters={
                    "repository_url": config.repository_url,
                    "branch": config.branch,
                    "deployment_environment": config.deployment_environment,
                    "validation_tests": config.validation_tests,
                    "rollback_on_failure": config.rollback_on_failure
                },
                timeout=step_def["timeout"],
                retry_count=2,
                depends_on=[]
            )
            steps.append(step)
        
        return WorkflowDefinition(
            id=f"deployment_validation_{hash(config.repository_url)}",
            name=f"Deployment Validation - {config.repository_url}",
            description=f"Deployment validation for {config.repository_url} to {config.deployment_environment}",
            steps=steps,
            timeout=template["estimated_duration"],
            tags=template["tags"],
            metadata={
                "template": "deployment_validation",
                "config": config.dict()
            }
        )
    
    @staticmethod
    def generate_deployment_script(config: DeploymentValidationConfig) -> str:
        """Generate deployment script for the configuration"""
        script = f"""#!/bin/bash
# Deployment script for {config.repository_url}
# Environment: {config.deployment_environment}
# Branch: {config.branch}

set -e

echo "Starting deployment validation for {config.repository_url}"

# Clone repository
git clone {config.repository_url} /tmp/deployment
cd /tmp/deployment
git checkout {config.branch}

# Install dependencies
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "package.json" ]; then
    npm install
elif [ -f "Pipfile" ]; then
    pipenv install
fi

# Build application
if [ -f "build.sh" ]; then
    ./build.sh
elif [ -f "package.json" ]; then
    npm run build
elif [ -f "Makefile" ]; then
    make build
fi

# Run deployment
if [ -f "deploy.sh" ]; then
    ./deploy.sh {config.deployment_environment}
elif [ -f "docker-compose.yml" ]; then
    docker-compose up -d
fi

echo "Deployment completed successfully"
"""
        return script
    
    @staticmethod
    def validate_build_process(config: DeploymentValidationConfig) -> bool:
        """Validate that the build process will work"""
        # This would contain logic to validate the build process
        # For now, we'll return True as a placeholder
        return True
