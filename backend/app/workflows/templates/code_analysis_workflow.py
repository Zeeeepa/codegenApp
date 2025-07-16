"""
Code Analysis Workflow Template

Provides a comprehensive code analysis workflow using Graph-Sitter and other tools.
"""

from typing import Dict, Any, List
from pydantic import BaseModel
from app.models.domain.workflow import WorkflowDefinition, WorkflowStep


class CodeAnalysisWorkflowConfig(BaseModel):
    """Configuration for code analysis workflow"""
    repository_url: str
    branch: str = "main"
    languages: List[str] = ["python", "javascript", "typescript"]
    analysis_depth: str = "full"  # basic, standard, full
    include_dependencies: bool = True
    generate_report: bool = True


class CodeAnalysisWorkflow:
    """Code Analysis Workflow Template"""
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get the workflow template definition"""
        return {
            "id": "code_analysis",
            "name": "Code Analysis Workflow",
            "description": "Comprehensive code analysis using Graph-Sitter and static analysis tools",
            "version": "1.0.0",
            "tags": ["analysis", "code-quality", "graph-sitter"],
            "parameters": {
                "repository_url": {
                    "type": "string",
                    "required": True,
                    "description": "Repository URL to analyze"
                },
                "branch": {
                    "type": "string",
                    "default": "main",
                    "description": "Branch to analyze"
                },
                "languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "default": ["python", "javascript", "typescript"],
                    "description": "Programming languages to analyze"
                },
                "analysis_depth": {
                    "type": "string",
                    "enum": ["basic", "standard", "full"],
                    "default": "full",
                    "description": "Depth of analysis to perform"
                },
                "include_dependencies": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include dependency analysis"
                },
                "generate_report": {
                    "type": "boolean",
                    "default": True,
                    "description": "Generate analysis report"
                }
            },
            "estimated_duration": 300,  # 5 minutes
            "steps": [
                {
                    "id": "clone_repository",
                    "name": "Clone Repository",
                    "description": "Clone the repository for analysis",
                    "service": "git",
                    "timeout": 60
                },
                {
                    "id": "setup_graph_sitter",
                    "name": "Setup Graph-Sitter",
                    "description": "Initialize Graph-Sitter parsers for target languages",
                    "service": "graph_sitter",
                    "timeout": 30
                },
                {
                    "id": "parse_codebase",
                    "name": "Parse Codebase",
                    "description": "Parse all source files using Graph-Sitter",
                    "service": "graph_sitter",
                    "timeout": 120
                },
                {
                    "id": "analyze_syntax",
                    "name": "Syntax Analysis",
                    "description": "Perform syntax analysis and validation",
                    "service": "graph_sitter",
                    "timeout": 60
                },
                {
                    "id": "analyze_dependencies",
                    "name": "Dependency Analysis",
                    "description": "Analyze code dependencies and imports",
                    "service": "graph_sitter",
                    "timeout": 90,
                    "condition": "include_dependencies"
                },
                {
                    "id": "generate_report",
                    "name": "Generate Report",
                    "description": "Generate comprehensive analysis report",
                    "service": "reporting",
                    "timeout": 30,
                    "condition": "generate_report"
                }
            ]
        }
    
    @staticmethod
    def create_workflow(config: CodeAnalysisWorkflowConfig) -> WorkflowDefinition:
        """Create a workflow instance from configuration"""
        template = CodeAnalysisWorkflow.get_workflow_template()
        
        steps = []
        for step_def in template["steps"]:
            # Skip conditional steps if condition not met
            if "condition" in step_def:
                condition = step_def["condition"]
                if condition == "include_dependencies" and not config.include_dependencies:
                    continue
                if condition == "generate_report" and not config.generate_report:
                    continue
            
            step = WorkflowStep(
                id=step_def["id"],
                name=step_def["name"],
                service=step_def["service"],
                action=step_def.get("action", "execute"),
                parameters={
                    "repository_url": config.repository_url,
                    "branch": config.branch,
                    "languages": config.languages,
                    "analysis_depth": config.analysis_depth
                },
                timeout=step_def["timeout"],
                retry_count=3,
                depends_on=[]
            )
            steps.append(step)
        
        return WorkflowDefinition(
            id=f"code_analysis_{hash(config.repository_url)}",
            name=f"Code Analysis - {config.repository_url}",
            description=f"Code analysis for {config.repository_url} on branch {config.branch}",
            steps=steps,
            timeout=template["estimated_duration"],
            tags=template["tags"],
            metadata={
                "template": "code_analysis",
                "config": config.dict()
            }
        )
