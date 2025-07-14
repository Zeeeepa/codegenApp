"""
CI/CD Workflow Templates
Pre-built workflows for continuous integration and deployment
"""

from app.models.domain.workflow import WorkflowDefinition, WorkflowStep


def create_code_review_workflow() -> WorkflowDefinition:
    """Create a code review workflow using all services"""
    return WorkflowDefinition(
        id="code-review-workflow",
        name="Automated Code Review",
        description="Comprehensive code review using AI agents and analysis tools",
        version="1.0.0",
        steps=[
            # Step 1: Analyze code with graph-sitter
            WorkflowStep(
                id="analyze-code",
                name="Analyze Code Structure",
                service="graph_sitter",
                action="analyze_code",
                parameters={
                    "language": "python",
                    "analysis_types": ["syntax", "structure", "complexity"]
                },
                timeout=60,
                retry_count=2
            ),
            
            # Step 2: Create sandbox for testing
            WorkflowStep(
                id="create-sandbox",
                name="Create Testing Sandbox",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11-slim",
                    "environment": {
                        "PYTHONPATH": "/app"
                    },
                    "ports": [8000]
                },
                timeout=120,
                retry_count=1
            ),
            
            # Step 3: Run Codegen agent for code review
            WorkflowStep(
                id="codegen-review",
                name="AI Code Review",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": "Please review this code for best practices, potential bugs, and improvements. Focus on code quality, security, and maintainability."
                },
                depends_on=["analyze-code"],
                timeout=300,
                retry_count=1
            ),
            
            # Step 4: Deploy to sandbox for testing
            WorkflowStep(
                id="deploy-to-sandbox",
                name="Deploy to Testing Environment",
                service="grainchain",
                action="deploy_image",
                parameters={},
                depends_on=["create-sandbox"],
                timeout=180,
                retry_count=2
            ),
            
            # Step 5: Run automated tests
            WorkflowStep(
                id="run-tests",
                name="Run Automated Tests",
                service="grainchain",
                action="test_deployment",
                parameters={
                    "test_config": {
                        "test_types": ["unit", "integration", "security"],
                        "coverage_threshold": 80
                    }
                },
                depends_on=["deploy-to-sandbox"],
                timeout=300,
                retry_count=1
            ),
            
            # Step 6: Web evaluation (if applicable)
            WorkflowStep(
                id="web-evaluation",
                name="Web Application Evaluation",
                service="web_eval",
                action="evaluate_url",
                parameters={
                    "evaluation_type": "comprehensive",
                    "criteria": {
                        "performance": True,
                        "accessibility": True,
                        "security": True
                    },
                    "screenshot": True
                },
                depends_on=["deploy-to-sandbox"],
                timeout=120,
                retry_count=1,
                optional=True  # Optional step
            ),
            
            # Step 7: Generate final report
            WorkflowStep(
                id="generate-report",
                name="Generate Review Report",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": "Generate a comprehensive code review report based on the analysis results, test outcomes, and evaluation findings. Include specific recommendations and action items."
                },
                depends_on=["codegen-review", "run-tests"],
                timeout=180,
                retry_count=1
            ),
            
            # Step 8: Cleanup sandbox
            WorkflowStep(
                id="cleanup-sandbox",
                name="Cleanup Testing Environment",
                service="grainchain",
                action="destroy_sandbox",
                parameters={},
                depends_on=["run-tests", "web-evaluation"],
                timeout=60,
                retry_count=0,
                optional=True
            )
        ],
        timeout=1800,  # 30 minutes total
        metadata={
            "category": "ci_cd",
            "complexity": "high",
            "estimated_duration": "15-30 minutes"
        },
        tags=["code-review", "ci-cd", "testing", "analysis"]
    )


def create_deployment_workflow() -> WorkflowDefinition:
    """Create a deployment workflow"""
    return WorkflowDefinition(
        id="deployment-workflow",
        name="Automated Deployment",
        description="Deploy application with testing and validation",
        version="1.0.0",
        steps=[
            # Step 1: Create deployment image
            WorkflowStep(
                id="build-image",
                name="Build Deployment Image",
                service="grainchain",
                action="create_deployment_image",
                parameters={
                    "build_config": {
                        "dockerfile": "Dockerfile",
                        "context": ".",
                        "target": "production"
                    }
                },
                timeout=600,  # 10 minutes
                retry_count=2
            ),
            
            # Step 2: Create staging environment
            WorkflowStep(
                id="create-staging",
                name="Create Staging Environment",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "name": "staging-env",
                    "ports": [80, 443],
                    "resources": {
                        "memory": "2GB",
                        "cpu": "1"
                    }
                },
                timeout=120,
                retry_count=1
            ),
            
            # Step 3: Deploy to staging
            WorkflowStep(
                id="deploy-staging",
                name="Deploy to Staging",
                service="grainchain",
                action="deploy_image",
                parameters={},
                depends_on=["build-image", "create-staging"],
                timeout=300,
                retry_count=2
            ),
            
            # Step 4: Run deployment tests
            WorkflowStep(
                id="test-deployment",
                name="Test Deployment",
                service="grainchain",
                action="test_deployment",
                parameters={
                    "test_config": {
                        "test_types": ["smoke", "integration", "performance"],
                        "timeout": 300
                    }
                },
                depends_on=["deploy-staging"],
                timeout=400,
                retry_count=1
            ),
            
            # Step 5: Validate with AI agent
            WorkflowStep(
                id="validate-deployment",
                name="AI Deployment Validation",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": "Validate the deployment by checking logs, metrics, and overall system health. Provide a go/no-go recommendation for production deployment."
                },
                depends_on=["test-deployment"],
                timeout=180,
                retry_count=1
            )
        ],
        timeout=2400,  # 40 minutes total
        metadata={
            "category": "deployment",
            "complexity": "medium",
            "estimated_duration": "20-40 minutes"
        },
        tags=["deployment", "staging", "validation"]
    )


def create_quick_analysis_workflow() -> WorkflowDefinition:
    """Create a quick code analysis workflow"""
    return WorkflowDefinition(
        id="quick-analysis-workflow",
        name="Quick Code Analysis",
        description="Fast code analysis and review",
        version="1.0.0",
        steps=[
            # Step 1: Syntax check
            WorkflowStep(
                id="syntax-check",
                name="Syntax Validation",
                service="graph_sitter",
                action="check_syntax",
                parameters={
                    "language": "python"
                },
                timeout=30,
                retry_count=1
            ),
            
            # Step 2: Quick AI review
            WorkflowStep(
                id="quick-review",
                name="Quick AI Review",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": "Perform a quick code review focusing on obvious issues, syntax problems, and basic best practices. Keep it concise."
                },
                depends_on=["syntax-check"],
                timeout=120,
                retry_count=1
            )
        ],
        timeout=300,  # 5 minutes total
        metadata={
            "category": "analysis",
            "complexity": "low",
            "estimated_duration": "2-5 minutes"
        },
        tags=["analysis", "quick", "review"]
    )


# Template registry
WORKFLOW_TEMPLATES = {
    "code-review": create_code_review_workflow,
    "deployment": create_deployment_workflow,
    "quick-analysis": create_quick_analysis_workflow
}


def get_workflow_template(template_id: str) -> WorkflowDefinition:
    """Get workflow template by ID"""
    template_factory = WORKFLOW_TEMPLATES.get(template_id)
    if not template_factory:
        raise ValueError(f"Unknown workflow template: {template_id}")
    
    return template_factory()


def list_workflow_templates() -> list[dict]:
    """List available workflow templates"""
    templates = []
    
    for template_id, factory in WORKFLOW_TEMPLATES.items():
        workflow = factory()
        templates.append({
            "id": template_id,
            "name": workflow.name,
            "description": workflow.description,
            "category": workflow.metadata.get("category", "general"),
            "complexity": workflow.metadata.get("complexity", "medium"),
            "estimated_duration": workflow.metadata.get("estimated_duration", "unknown"),
            "tags": workflow.tags,
            "step_count": len(workflow.steps)
        })
    
    return templates
