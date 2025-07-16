"""
Deployment Validation Workflow Template

Demonstrates automated deployment validation with comprehensive testing.
"""

from typing import Dict, Any, List
from dataclasses import dataclass

from ...models.domain.workflow import WorkflowDefinition, WorkflowStep


@dataclass
class DeploymentValidationConfig:
    """Configuration for deployment validation workflow"""
    
    repository_url: str
    deployment_url: str
    environment: str = "staging"
    validation_types: List[str] = None
    rollback_enabled: bool = True
    notification_channels: List[str] = None
    
    def __post_init__(self):
        if self.validation_types is None:
            self.validation_types = ["health", "functionality", "performance", "security"]
        if self.notification_channels is None:
            self.notification_channels = ["slack", "email"]


class DeploymentValidationWorkflow:
    """
    Deployment Validation Workflow Template
    
    This workflow demonstrates:
    1. Pre-deployment validation
    2. Deployment health checks
    3. Functional testing
    4. Performance validation
    5. Security checks
    6. Rollback procedures (if needed)
    """
    
    @staticmethod
    def create_workflow(config: DeploymentValidationConfig) -> WorkflowDefinition:
        """Create deployment validation workflow"""
        
        steps = [
            # Step 1: Pre-deployment Validation
            WorkflowStep(
                id="pre_deployment_validation",
                name="Pre-deployment Validation",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": f"""
                    Perform pre-deployment validation for the application.
                    
                    Repository: {config.repository_url}
                    Deployment URL: {config.deployment_url}
                    Environment: {config.environment}
                    
                    Validate:
                    1. Code quality and build status
                    2. Configuration correctness
                    3. Dependencies and versions
                    4. Environment-specific settings
                    5. Database migration status
                    
                    Provide a go/no-go recommendation for deployment.
                    """,
                    "context": {
                        "repository_url": config.repository_url,
                        "deployment_url": config.deployment_url,
                        "environment": config.environment
                    }
                },
                timeout=300
            ),
            
            # Step 2: Health Check Validation
            WorkflowStep(
                id="health_check",
                name="Deployment Health Check",
                service="web_eval_agent",
                action="health_check",
                parameters={
                    "url": config.deployment_url,
                    "endpoints": [
                        "/health",
                        "/api/health",
                        "/status",
                        "/"
                    ],
                    "expected_status": 200,
                    "timeout": 30
                },
                depends_on=["pre_deployment_validation"],
                timeout=300
            ) if "health" in config.validation_types else None,
            
            # Step 3: Functional Testing
            WorkflowStep(
                id="functional_testing",
                name="Functional Testing",
                service="web_eval_agent",
                action="functional_test",
                parameters={
                    "url": config.deployment_url,
                    "test_scenarios": [
                        {
                            "name": "User Authentication",
                            "steps": [
                                "Navigate to login page",
                                "Enter valid credentials",
                                "Verify successful login"
                            ]
                        },
                        {
                            "name": "Core Functionality",
                            "steps": [
                                "Test main application features",
                                "Verify data persistence",
                                "Check error handling"
                            ]
                        },
                        {
                            "name": "API Endpoints",
                            "steps": [
                                "Test critical API endpoints",
                                "Verify response formats",
                                "Check authentication"
                            ]
                        }
                    ],
                    "timeout": 600
                },
                depends_on=["health_check"] if "health" in config.validation_types else ["pre_deployment_validation"],
                timeout=900
            ) if "functionality" in config.validation_types else None,
            
            # Step 4: Performance Validation
            WorkflowStep(
                id="performance_validation",
                name="Performance Validation",
                service="web_eval_agent",
                action="performance_test",
                parameters={
                    "url": config.deployment_url,
                    "test_duration": 300,  # 5 minutes
                    "concurrent_users": 20,
                    "ramp_up_time": 60,
                    "metrics": [
                        "response_time",
                        "throughput",
                        "error_rate",
                        "cpu_usage",
                        "memory_usage"
                    ],
                    "thresholds": {
                        "avg_response_time": 2000,  # 2 seconds
                        "error_rate": 0.01,  # 1%
                        "cpu_usage": 80,  # 80%
                        "memory_usage": 85  # 85%
                    }
                },
                depends_on=["functional_testing"] if "functionality" in config.validation_types else ["health_check"],
                timeout=900
            ) if "performance" in config.validation_types else None,
            
            # Step 5: Security Validation
            WorkflowStep(
                id="security_validation",
                name="Security Validation",
                service="web_eval_agent",
                action="security_scan",
                parameters={
                    "url": config.deployment_url,
                    "scan_types": [
                        "ssl_certificate",
                        "security_headers",
                        "vulnerability_scan",
                        "authentication_test"
                    ],
                    "compliance_checks": ["OWASP_TOP10", "GDPR"],
                    "timeout": 600
                },
                depends_on=["performance_validation"] if "performance" in config.validation_types else ["functional_testing"],
                timeout=900
            ) if "security" in config.validation_types else None,
            
            # Step 6: Database Validation
            WorkflowStep(
                id="database_validation",
                name="Database Validation",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11",
                    "commands": [
                        f"git clone {config.repository_url} /app",
                        "cd /app",
                        "pip install -r requirements.txt",
                        "python scripts/validate_database.py",
                        "python scripts/check_migrations.py"
                    ],
                    "environment": {
                        "DATABASE_URL": f"${{{config.environment.upper()}_DATABASE_URL}}",
                        "ENVIRONMENT": config.environment
                    },
                    "timeout": 600
                },
                depends_on=["security_validation"] if "security" in config.validation_types else ["performance_validation"],
                timeout=900
            ),
            
            # Step 7: Validation Report
            WorkflowStep(
                id="validation_report",
                name="Generate Validation Report",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": """
                    Generate a comprehensive deployment validation report.
                    
                    Include:
                    1. Pre-deployment Validation Results
                    2. Health Check Status
                    3. Functional Testing Results
                    4. Performance Validation Results
                    5. Security Validation Results
                    6. Database Validation Results
                    7. Overall Deployment Status
                    8. Recommendations and Next Steps
                    9. Rollback Plan (if needed)
                    
                    Provide a clear PASS/FAIL status for the deployment.
                    """,
                    "context": {
                        "report_format": "markdown",
                        "include_charts": True,
                        "deployment_url": config.deployment_url,
                        "environment": config.environment,
                        "use_previous_results": [
                            "pre_deployment_validation",
                            "health_check",
                            "functional_testing",
                            "performance_validation",
                            "security_validation",
                            "database_validation"
                        ]
                    }
                },
                depends_on=["database_validation"],
                timeout=300
            ),
            
            # Step 8: Rollback (conditional)
            WorkflowStep(
                id="rollback_deployment",
                name="Rollback Deployment",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11",
                    "commands": [
                        f"git clone {config.repository_url} /app",
                        "cd /app",
                        "python scripts/rollback_deployment.py",
                        f"python scripts/notify_rollback.py --channels {','.join(config.notification_channels)}"
                    ],
                    "environment": {
                        "DEPLOYMENT_URL": config.deployment_url,
                        "ENVIRONMENT": config.environment,
                        "ROLLBACK_ENABLED": str(config.rollback_enabled)
                    },
                    "timeout": 600
                },
                depends_on=["validation_report"],
                timeout=900,
                # This step only runs if validation fails
                condition="validation_report.status == 'FAIL'"
            ) if config.rollback_enabled else None,
            
            # Step 9: Success Notification
            WorkflowStep(
                id="success_notification",
                name="Send Success Notification",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": f"""
                    Send deployment success notification to configured channels.
                    
                    Deployment Details:
                    - URL: {config.deployment_url}
                    - Environment: {config.environment}
                    - Status: SUCCESS
                    
                    Channels: {', '.join(config.notification_channels)}
                    
                    Include validation summary and key metrics.
                    """,
                    "context": {
                        "notification_channels": config.notification_channels,
                        "deployment_url": config.deployment_url,
                        "environment": config.environment
                    }
                },
                depends_on=["validation_report"],
                timeout=300,
                # This step only runs if validation passes
                condition="validation_report.status == 'PASS'"
            )
        ]
        
        # Filter out None steps
        steps = [step for step in steps if step is not None]
        
        return WorkflowDefinition(
            id=f"deployment_validation_{hash(config.deployment_url)}",
            name="Deployment Validation Workflow",
            description="Comprehensive deployment validation with health checks, testing, and rollback capabilities",
            steps=steps,
            timeout=3600,  # 1 hour
            metadata={
                "template": "deployment_validation",
                "config": config.__dict__
            },
            tags=["deployment", "validation", "testing", "rollback"]
        )
    
    @staticmethod
    def create_basic_validation_workflow(
        repository_url: str, 
        deployment_url: str
    ) -> WorkflowDefinition:
        """Create a basic deployment validation workflow"""
        
        config = DeploymentValidationConfig(
            repository_url=repository_url,
            deployment_url=deployment_url,
            validation_types=["health", "functionality"],
            rollback_enabled=False
        )
        
        return DeploymentValidationWorkflow.create_workflow(config)
    
    @staticmethod
    def create_production_validation_workflow(
        repository_url: str, 
        deployment_url: str
    ) -> WorkflowDefinition:
        """Create a production-ready deployment validation workflow"""
        
        config = DeploymentValidationConfig(
            repository_url=repository_url,
            deployment_url=deployment_url,
            environment="production",
            validation_types=["health", "functionality", "performance", "security"],
            rollback_enabled=True,
            notification_channels=["slack", "email", "pagerduty"]
        )
        
        return DeploymentValidationWorkflow.create_workflow(config)
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get workflow template definition for UI/API usage"""
        
        return {
            "name": "Deployment Validation Workflow",
            "description": "Comprehensive deployment validation with health checks, testing, and rollback capabilities",
            "category": "deployment",
            "tags": ["deployment", "validation", "testing", "rollback"],
            "parameters": [
                {
                    "name": "repository_url",
                    "type": "string",
                    "required": True,
                    "description": "URL of the repository being deployed"
                },
                {
                    "name": "deployment_url",
                    "type": "string",
                    "required": True,
                    "description": "URL of the deployed application"
                },
                {
                    "name": "environment",
                    "type": "string",
                    "enum": ["development", "staging", "production"],
                    "default": "staging",
                    "description": "Deployment environment"
                },
                {
                    "name": "validation_types",
                    "type": "array",
                    "items": {"type": "string", "enum": ["health", "functionality", "performance", "security"]},
                    "default": ["health", "functionality", "performance"],
                    "description": "Types of validation to perform"
                },
                {
                    "name": "rollback_enabled",
                    "type": "boolean",
                    "default": True,
                    "description": "Enable automatic rollback on validation failure"
                },
                {
                    "name": "notification_channels",
                    "type": "array",
                    "items": {"type": "string", "enum": ["slack", "email", "pagerduty", "webhook"]},
                    "default": ["slack", "email"],
                    "description": "Notification channels for deployment status"
                }
            ],
            "estimated_duration": "20-60 minutes",
            "complexity": "high",
            "components_used": ["codegen", "web_eval_agent", "grainchain"],
            "outputs": [
                "Pre-deployment validation results",
                "Health check status",
                "Functional testing results",
                "Performance validation results",
                "Security validation results",
                "Database validation results",
                "Deployment validation report",
                "Rollback status (if applicable)"
            ]
        }

