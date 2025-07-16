"""
Testing Pipeline Workflow Template

Demonstrates automated testing pipeline with web evaluation and code analysis.
"""

from typing import Dict, Any, List
from dataclasses import dataclass

from ...models.domain.workflow import WorkflowDefinition, WorkflowStep


@dataclass
class TestingPipelineConfig:
    """Configuration for testing pipeline workflow"""
    
    repository_url: str
    test_types: List[str] = None
    web_app_url: str = None
    include_performance: bool = True
    include_accessibility: bool = True
    include_security: bool = False
    
    def __post_init__(self):
        if self.test_types is None:
            self.test_types = ["unit", "integration", "e2e"]


class TestingPipelineWorkflow:
    """
    Testing Pipeline Workflow Template
    
    This workflow demonstrates:
    1. Code analysis for test coverage
    2. Automated test execution
    3. Web application evaluation
    4. Performance and accessibility testing
    5. Comprehensive test reporting
    """
    
    @staticmethod
    def create_workflow(config: TestingPipelineConfig) -> WorkflowDefinition:
        """Create testing pipeline workflow"""
        
        steps = [
            # Step 1: Test Coverage Analysis
            WorkflowStep(
                id="test_coverage_analysis",
                name="Analyze Test Coverage",
                service="graph_sitter",
                action="analyze_codebase",
                parameters={
                    "repo_path": config.repository_url,
                    "analysis_types": ["structure", "test_coverage"],
                    "include_patterns": ["*.py", "*.js", "*.ts", "*.test.*", "*.spec.*"]
                },
                timeout=300
            ),
            
            # Step 2: Unit Test Execution
            WorkflowStep(
                id="unit_tests",
                name="Execute Unit Tests",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11",
                    "commands": [
                        f"git clone {config.repository_url} /app",
                        "cd /app",
                        "pip install -r requirements.txt",
                        "python -m pytest tests/unit/ -v --cov=. --cov-report=json"
                    ],
                    "timeout": 600
                },
                depends_on=["test_coverage_analysis"],
                timeout=900
            ) if "unit" in config.test_types else None,
            
            # Step 3: Integration Tests
            WorkflowStep(
                id="integration_tests",
                name="Execute Integration Tests",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11",
                    "commands": [
                        f"git clone {config.repository_url} /app",
                        "cd /app",
                        "pip install -r requirements.txt",
                        "python -m pytest tests/integration/ -v"
                    ],
                    "timeout": 900
                },
                depends_on=["test_coverage_analysis"],
                timeout=1200
            ) if "integration" in config.test_types else None,
            
            # Step 4: Web Application Evaluation (if web app URL provided)
            WorkflowStep(
                id="web_evaluation",
                name="Web Application Evaluation",
                service="web_eval_agent",
                action="evaluate_website",
                parameters={
                    "url": config.web_app_url,
                    "evaluation_types": ["performance", "accessibility", "seo"] if config.include_performance else ["basic"],
                    "device_types": ["desktop", "mobile"],
                    "screenshot": True
                },
                depends_on=["unit_tests"] if "unit" in config.test_types else [],
                timeout=600
            ) if config.web_app_url else None,
            
            # Step 5: Performance Testing
            WorkflowStep(
                id="performance_tests",
                name="Performance Testing",
                service="web_eval_agent",
                action="performance_test",
                parameters={
                    "url": config.web_app_url,
                    "test_duration": 300,  # 5 minutes
                    "concurrent_users": 10,
                    "metrics": ["response_time", "throughput", "error_rate"]
                },
                depends_on=["web_evaluation"] if config.web_app_url else ["unit_tests"],
                timeout=900
            ) if config.include_performance and config.web_app_url else None,
            
            # Step 6: Accessibility Testing
            WorkflowStep(
                id="accessibility_tests",
                name="Accessibility Testing",
                service="web_eval_agent",
                action="accessibility_test",
                parameters={
                    "url": config.web_app_url,
                    "standards": ["WCAG2.1", "Section508"],
                    "level": "AA"
                },
                depends_on=["web_evaluation"] if config.web_app_url else ["unit_tests"],
                timeout=600
            ) if config.include_accessibility and config.web_app_url else None,
            
            # Step 7: Security Testing
            WorkflowStep(
                id="security_tests",
                name="Security Testing",
                service="grainchain",
                action="create_sandbox",
                parameters={
                    "image": "python:3.11",
                    "commands": [
                        f"git clone {config.repository_url} /app",
                        "cd /app",
                        "pip install bandit safety",
                        "bandit -r . -f json -o security_report.json",
                        "safety check --json --output safety_report.json"
                    ],
                    "timeout": 600
                },
                depends_on=["test_coverage_analysis"],
                timeout=900
            ) if config.include_security else None,
            
            # Step 8: Test Report Generation
            WorkflowStep(
                id="test_report",
                name="Generate Test Report",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": """
                    Generate a comprehensive testing report based on all test results.
                    
                    Include:
                    1. Test Coverage Summary
                    2. Unit Test Results
                    3. Integration Test Results
                    4. Web Evaluation Results (if applicable)
                    5. Performance Test Results (if applicable)
                    6. Accessibility Test Results (if applicable)
                    7. Security Test Results (if applicable)
                    8. Recommendations for Improvement
                    9. Quality Gates Status
                    
                    Format as a detailed markdown report with charts and metrics.
                    """,
                    "context": {
                        "report_format": "markdown",
                        "include_charts": True,
                        "use_previous_results": [
                            "test_coverage_analysis",
                            "unit_tests",
                            "integration_tests",
                            "web_evaluation",
                            "performance_tests",
                            "accessibility_tests",
                            "security_tests"
                        ]
                    }
                },
                depends_on=[
                    step.id for step in [
                        WorkflowStep(id="test_coverage_analysis", name="", service="", action=""),
                        WorkflowStep(id="unit_tests", name="", service="", action="") if "unit" in config.test_types else None,
                        WorkflowStep(id="integration_tests", name="", service="", action="") if "integration" in config.test_types else None,
                        WorkflowStep(id="web_evaluation", name="", service="", action="") if config.web_app_url else None,
                        WorkflowStep(id="performance_tests", name="", service="", action="") if config.include_performance and config.web_app_url else None,
                        WorkflowStep(id="accessibility_tests", name="", service="", action="") if config.include_accessibility and config.web_app_url else None,
                        WorkflowStep(id="security_tests", name="", service="", action="") if config.include_security else None
                    ] if step is not None
                ],
                timeout=300
            )
        ]
        
        # Filter out None steps
        steps = [step for step in steps if step is not None]
        
        return WorkflowDefinition(
            id=f"testing_pipeline_{hash(config.repository_url)}",
            name="Testing Pipeline Workflow",
            description="Comprehensive testing pipeline with code analysis, automated tests, and web evaluation",
            steps=steps,
            timeout=3600,  # 1 hour
            metadata={
                "template": "testing_pipeline",
                "config": config.__dict__
            },
            tags=["testing", "quality", "web-evaluation", "performance"]
        )
    
    @staticmethod
    def create_basic_testing_workflow(repository_url: str) -> WorkflowDefinition:
        """Create a basic testing workflow with minimal configuration"""
        
        config = TestingPipelineConfig(
            repository_url=repository_url,
            test_types=["unit"],
            include_performance=False,
            include_accessibility=False,
            include_security=False
        )
        
        return TestingPipelineWorkflow.create_workflow(config)
    
    @staticmethod
    def create_comprehensive_testing_workflow(
        repository_url: str, 
        web_app_url: str = None
    ) -> WorkflowDefinition:
        """Create a comprehensive testing workflow with all features enabled"""
        
        config = TestingPipelineConfig(
            repository_url=repository_url,
            web_app_url=web_app_url,
            test_types=["unit", "integration", "e2e"],
            include_performance=True,
            include_accessibility=True,
            include_security=True
        )
        
        return TestingPipelineWorkflow.create_workflow(config)
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get workflow template definition for UI/API usage"""
        
        return {
            "name": "Testing Pipeline Workflow",
            "description": "Comprehensive testing pipeline with code analysis, automated tests, and web evaluation",
            "category": "testing",
            "tags": ["testing", "quality", "web-evaluation", "performance"],
            "parameters": [
                {
                    "name": "repository_url",
                    "type": "string",
                    "required": True,
                    "description": "URL of the repository to test"
                },
                {
                    "name": "test_types",
                    "type": "array",
                    "items": {"type": "string", "enum": ["unit", "integration", "e2e"]},
                    "default": ["unit", "integration"],
                    "description": "Types of tests to execute"
                },
                {
                    "name": "web_app_url",
                    "type": "string",
                    "required": False,
                    "description": "URL of the web application to evaluate"
                },
                {
                    "name": "include_performance",
                    "type": "boolean",
                    "default": True,
                    "description": "Include performance testing"
                },
                {
                    "name": "include_accessibility",
                    "type": "boolean",
                    "default": True,
                    "description": "Include accessibility testing"
                },
                {
                    "name": "include_security",
                    "type": "boolean",
                    "default": False,
                    "description": "Include security testing"
                }
            ],
            "estimated_duration": "30-60 minutes",
            "complexity": "high",
            "components_used": ["codegen", "graph_sitter", "grainchain", "web_eval_agent"],
            "outputs": [
                "Test coverage analysis",
                "Unit test results",
                "Integration test results",
                "Web evaluation results",
                "Performance test results",
                "Accessibility test results",
                "Security test results",
                "Comprehensive test report"
            ]
        }

