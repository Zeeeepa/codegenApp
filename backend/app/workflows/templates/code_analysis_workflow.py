"""
Code Analysis Workflow Template

Demonstrates integration between codegen agents, graph-sitter code analysis,
and automated refactoring suggestions.
"""

from typing import Dict, Any, List
from dataclasses import dataclass

from ...models.domain.workflow import WorkflowDefinition, WorkflowStep


@dataclass
class CodeAnalysisWorkflowConfig:
    """Configuration for code analysis workflow"""
    
    repository_url: str
    target_files: List[str]
    analysis_types: List[str] = None
    languages: List[str] = None
    include_refactoring: bool = True
    include_metrics: bool = True
    
    def __post_init__(self):
        if self.analysis_types is None:
            self.analysis_types = ["structure", "metrics", "dependencies", "issues"]
        if self.languages is None:
            self.languages = ["python", "javascript", "typescript"]


class CodeAnalysisWorkflow:
    """
    Code Analysis Workflow Template
    
    This workflow demonstrates:
    1. AI agent analyzes repository structure
    2. Graph-sitter performs detailed code analysis
    3. AI agent generates refactoring recommendations
    4. Results are compiled into actionable insights
    """
    
    @staticmethod
    def create_workflow(config: CodeAnalysisWorkflowConfig) -> WorkflowDefinition:
        """Create code analysis workflow"""
        
        steps = [
            # Step 1: Repository Analysis
            WorkflowStep(
                id="repo_analysis",
                name="Repository Structure Analysis",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": f"""
                    Analyze the repository structure and codebase at: {config.repository_url}
                    
                    Focus on:
                    1. Overall architecture and organization
                    2. Key components and modules
                    3. Dependencies and relationships
                    4. Potential areas for improvement
                    
                    Target files: {', '.join(config.target_files)}
                    Languages: {', '.join(config.languages)}
                    
                    Provide a comprehensive analysis of the codebase structure.
                    """,
                    "context": {
                        "repository_url": config.repository_url,
                        "target_files": config.target_files,
                        "languages": config.languages
                    }
                },
                timeout=300
            ),
            
            # Step 2: Detailed Code Analysis
            WorkflowStep(
                id="detailed_analysis",
                name="Graph-Sitter Code Analysis",
                service="graph_sitter",
                action="analyze_codebase",
                parameters={
                    "repo_path": config.repository_url,
                    "analysis_types": config.analysis_types,
                    "include_patterns": [f"*.{lang}" for lang in config.languages],
                    "target_files": config.target_files
                },
                depends_on=["repo_analysis"],
                timeout=600
            ),
            
            # Step 3: Refactoring Recommendations (if enabled)
            WorkflowStep(
                id="refactoring_suggestions",
                name="Generate Refactoring Recommendations",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": """
                    Based on the repository analysis and detailed code analysis, generate specific refactoring recommendations.
                    
                    Focus on:
                    1. Code complexity reduction
                    2. Improved maintainability
                    3. Better separation of concerns
                    4. Performance optimizations
                    5. Code duplication elimination
                    
                    For each recommendation:
                    - Provide specific file and line references
                    - Explain the rationale
                    - Estimate the impact and effort
                    - Suggest concrete implementation steps
                    """,
                    "context": {
                        "use_previous_results": ["repo_analysis", "detailed_analysis"]
                    }
                },
                depends_on=["repo_analysis", "detailed_analysis"],
                timeout=400
            ) if config.include_refactoring else None,
            
            # Step 4: Metrics and Quality Assessment
            WorkflowStep(
                id="quality_assessment",
                name="Code Quality and Metrics Assessment",
                service="graph_sitter",
                action="get_structure_overview",
                parameters={
                    "repo_path": config.repository_url,
                    "include_metrics": True,
                    "complexity_analysis": True
                },
                depends_on=["detailed_analysis"],
                timeout=300
            ) if config.include_metrics else None,
            
            # Step 5: Final Report Generation
            WorkflowStep(
                id="report_generation",
                name="Generate Analysis Report",
                service="codegen",
                action="create_agent_run",
                parameters={
                    "prompt": """
                    Generate a comprehensive code analysis report that combines all findings.
                    
                    The report should include:
                    1. Executive Summary
                    2. Repository Overview
                    3. Detailed Analysis Results
                    4. Code Quality Metrics
                    5. Refactoring Recommendations (if applicable)
                    6. Action Items and Priorities
                    7. Implementation Timeline
                    
                    Format the report in a clear, actionable manner suitable for development teams.
                    """,
                    "context": {
                        "report_format": "markdown",
                        "include_charts": True,
                        "use_previous_results": ["repo_analysis", "detailed_analysis"] + 
                                             (["refactoring_suggestions"] if config.include_refactoring else []) +
                                             (["quality_assessment"] if config.include_metrics else [])
                    }
                },
                depends_on=["repo_analysis", "detailed_analysis"] + 
                           (["refactoring_suggestions"] if config.include_refactoring else []) +
                           (["quality_assessment"] if config.include_metrics else []),
                timeout=300
            )
        ]
        
        # Filter out None steps
        steps = [step for step in steps if step is not None]
        
        return WorkflowDefinition(
            id=f"code_analysis_{hash(config.repository_url)}",
            name="Code Analysis Workflow",
            description="Comprehensive code analysis using AI agents and graph-sitter integration",
            steps=steps,
            timeout=1800,  # 30 minutes
            metadata={
                "template": "code_analysis",
                "config": config.__dict__
            },
            tags=["analysis", "refactoring", "quality", "graph-sitter"]
        )
    
    @staticmethod
    def create_quick_analysis_workflow(repository_url: str, target_files: List[str]) -> WorkflowDefinition:
        """Create a quick code analysis workflow with minimal configuration"""
        
        config = CodeAnalysisWorkflowConfig(
            repository_url=repository_url,
            target_files=target_files,
            analysis_types=["structure", "issues"],
            include_refactoring=False,
            include_metrics=False
        )
        
        return CodeAnalysisWorkflow.create_workflow(config)
    
    @staticmethod
    def create_comprehensive_analysis_workflow(repository_url: str, target_files: List[str]) -> WorkflowDefinition:
        """Create a comprehensive code analysis workflow with all features enabled"""
        
        config = CodeAnalysisWorkflowConfig(
            repository_url=repository_url,
            target_files=target_files,
            analysis_types=["structure", "metrics", "dependencies", "issues", "patterns"],
            include_refactoring=True,
            include_metrics=True
        )
        
        return CodeAnalysisWorkflow.create_workflow(config)
    
    @staticmethod
    def get_workflow_template() -> Dict[str, Any]:
        """Get workflow template definition for UI/API usage"""
        
        return {
            "name": "Code Analysis Workflow",
            "description": "Comprehensive code analysis using AI agents and graph-sitter integration",
            "category": "code_analysis",
            "tags": ["analysis", "refactoring", "quality", "graph-sitter"],
            "parameters": [
                {
                    "name": "repository_url",
                    "type": "string",
                    "required": True,
                    "description": "URL of the repository to analyze"
                },
                {
                    "name": "target_files",
                    "type": "array",
                    "items": {"type": "string"},
                    "required": True,
                    "description": "List of files to analyze"
                },
                {
                    "name": "analysis_types",
                    "type": "array",
                    "items": {"type": "string", "enum": ["structure", "metrics", "dependencies", "issues", "patterns"]},
                    "default": ["structure", "metrics", "dependencies", "issues"],
                    "description": "Types of analysis to perform"
                },
                {
                    "name": "languages",
                    "type": "array", 
                    "items": {"type": "string", "enum": ["python", "javascript", "typescript", "java", "go"]},
                    "default": ["python", "javascript", "typescript"],
                    "description": "Programming languages to analyze"
                },
                {
                    "name": "include_refactoring",
                    "type": "boolean",
                    "default": True,
                    "description": "Include refactoring recommendations"
                },
                {
                    "name": "include_metrics",
                    "type": "boolean", 
                    "default": True,
                    "description": "Include detailed code metrics"
                }
            ],
            "estimated_duration": "10-30 minutes",
            "complexity": "medium",
            "components_used": ["codegen", "graph_sitter"],
            "outputs": [
                "Repository structure analysis",
                "Detailed code analysis results",
                "Refactoring recommendations",
                "Code quality metrics",
                "Comprehensive analysis report"
            ]
        }

