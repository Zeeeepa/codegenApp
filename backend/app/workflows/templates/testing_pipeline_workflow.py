"""
Testing Pipeline Workflow Template

Provides a comprehensive testing pipeline workflow with Web-Eval-Agent integration.
"""

from typing import Dict, Any, List
from pydantic import BaseModel
from app.models.domain.workflow import WorkflowDefinition, WorkflowStep


class TestingPipelineConfig(BaseModel):
    """Configuration for testing pipeline workflow"""
    repository_url: str
    branch: str = "main"
    test_types: List[str] = ["unit", "integration", "e2e"]
    deployment_url: str = None
    run_web_eval: bool = True
    generate_screenshots: bool = True
    performance_testing: bool = False


class TestingPipelineWorkflow:
    """Testing Pipeline Workflow Template"""
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get the workflow template definition"""
        return {
            "id": "testing_pipeline",
            "name": "Testing Pipeline Workflow",
            "description": "Comprehensive testing pipeline with Web-Eval-Agent integration",
            "version": "1.0.0",
            "tags": ["testing", "web-eval", "automation"],
            "parameters": {
                "repository_url": {
                    "type": "string",
                    "required": True,
                    "description": "Repository URL to test"
                },
                "branch": {
                    "type": "string",
                    "default": "main",
                    "description": "Branch to test"
                },
                "test_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "default": ["unit", "integration", "e2e"],
                    "description": "Types of tests to run"
                },
                "deployment_url": {
                    "type": "string",
                    "description": "URL of deployed application for testing"
                },
                "run_web_eval": {
                    "type": "boolean",
                    "default": True,
                    "description": "Run Web-Eval-Agent testing"
                },
                "generate_screenshots": {
                    "type": "boolean",
                    "default": True,
                    "description": "Generate screenshots during testing"
                },
                "performance_testing": {
                    "type": "boolean",
                    "default": False,
                    "description": "Include performance testing"
                }
            },
            "estimated_duration": 600,  # 10 minutes
            "steps": [
                {
                    "id": "setup_environment",
                    "name": "Setup Test Environment",
                    "description": "Setup testing environment and dependencies",
                    "service": "environment",
                    "timeout": 120
                },
                {
                    "id": "run_unit_tests",
                    "name": "Run Unit Tests",
                    "description": "Execute unit test suite",
                    "service": "testing",
                    "timeout": 180,
                    "condition": "unit_tests"
                },
                {
                    "id": "run_integration_tests",
                    "name": "Run Integration Tests",
                    "description": "Execute integration test suite",
                    "service": "testing",
                    "timeout": 240,
                    "condition": "integration_tests"
                },
                {
                    "id": "deploy_for_testing",
                    "name": "Deploy for Testing",
                    "description": "Deploy application for end-to-end testing",
                    "service": "deployment",
                    "timeout": 180,
                    "condition": "e2e_tests"
                },
                {
                    "id": "run_web_eval_agent",
                    "name": "Run Web-Eval-Agent",
                    "description": "Execute Web-Eval-Agent testing suite",
                    "service": "web_eval",
                    "timeout": 300,
                    "condition": "run_web_eval"
                },
                {
                    "id": "performance_testing",
                    "name": "Performance Testing",
                    "description": "Run performance and load testing",
                    "service": "performance",
                    "timeout": 240,
                    "condition": "performance_testing"
                },
                {
                    "id": "generate_test_report",
                    "name": "Generate Test Report",
                    "description": "Generate comprehensive test report",
                    "service": "reporting",
                    "timeout": 60
                }
            ]
        }
    
    @staticmethod
    def create_workflow(config: TestingPipelineConfig) -> WorkflowDefinition:
        """Create a workflow instance from configuration"""
        template = TestingPipelineWorkflow.get_workflow_template()
        
        steps = []
        for step_def in template["steps"]:
            # Skip conditional steps if condition not met
            if "condition" in step_def:
                condition = step_def["condition"]
                if condition == "unit_tests" and "unit" not in config.test_types:
                    continue
                if condition == "integration_tests" and "integration" not in config.test_types:
                    continue
                if condition == "e2e_tests" and "e2e" not in config.test_types:
                    continue
                if condition == "run_web_eval" and not config.run_web_eval:
                    continue
                if condition == "performance_testing" and not config.performance_testing:
                    continue
            
            step = WorkflowStep(
                id=step_def["id"],
                name=step_def["name"],
                service=step_def["service"],
                action=step_def.get("action", "execute"),
                parameters={
                    "repository_url": config.repository_url,
                    "branch": config.branch,
                    "test_types": config.test_types,
                    "deployment_url": config.deployment_url,
                    "generate_screenshots": config.generate_screenshots
                },
                timeout=step_def["timeout"],
                retry_count=2,
                depends_on=[]
            )
            steps.append(step)
        
        return WorkflowDefinition(
            id=f"testing_pipeline_{hash(config.repository_url)}",
            name=f"Testing Pipeline - {config.repository_url}",
            description=f"Testing pipeline for {config.repository_url} on branch {config.branch}",
            steps=steps,
            timeout=template["estimated_duration"],
            tags=template["tags"],
            metadata={
                "template": "testing_pipeline",
                "config": config.dict()
            }
        )
