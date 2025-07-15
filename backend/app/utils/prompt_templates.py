"""
CodegenApp Prompt Templates
Intelligent prompt engineering for AI-powered validation and analysis
"""

from typing import Dict, List, Any, Optional
import json


class PromptTemplates:
    """
    Prompt template manager for AI interactions
    
    Provides carefully crafted prompts for different validation scenarios
    with consistent formatting and comprehensive context.
    """
    
    def get_deployment_validation_prompt(
        self,
        project_name: str,
        pr_url: str,
        deployment_output: str,
        deployment_success: bool,
        additional_context: Dict[str, Any]
    ) -> str:
        """Generate deployment validation prompt"""
        
        return f"""
# Deployment Validation Analysis

You are an expert DevOps engineer analyzing a deployment for the project "{project_name}".

## Context
- **Project**: {project_name}
- **PR URL**: {pr_url}
- **Deployment Status**: {"SUCCESS" if deployment_success else "FAILED"}
- **Additional Context**: {json.dumps(additional_context, indent=2)}

## Deployment Output
```
{deployment_output}
```

## Analysis Requirements

Please provide a comprehensive analysis in JSON format with the following structure:

```json
{{
    "success": boolean,
    "confidence_score": float (0.0-1.0),
    "analysis": "detailed analysis text",
    "recommendations": ["list", "of", "recommendations"],
    "issues_found": [
        {{
            "severity": "high|medium|low",
            "category": "deployment|configuration|dependency|security",
            "description": "issue description",
            "suggested_fix": "how to fix this issue"
        }}
    ],
    "code_quality_score": float (0.0-1.0),
    "security_score": float (0.0-1.0),
    "performance_score": float (0.0-1.0),
    "maintainability_score": float (0.0-1.0),
    "metadata": {{
        "deployment_time_estimate": "estimated deployment time",
        "risk_level": "low|medium|high",
        "rollback_recommended": boolean
    }}
}}
```

## Evaluation Criteria

1. **Deployment Success**: Did the deployment complete without critical errors?
2. **Error Analysis**: Are there any warnings or errors that need attention?
3. **Performance Impact**: Any performance-related concerns?
4. **Security Considerations**: Security implications of the deployment?
5. **Rollback Necessity**: Should this deployment be rolled back?

Focus on actionable insights and specific recommendations for improvement.
"""
    
    def get_code_quality_prompt(
        self,
        code_content: str,
        file_path: str,
        language: str,
        context: Dict[str, Any]
    ) -> str:
        """Generate code quality analysis prompt"""
        
        return f"""
# Code Quality Analysis

You are an expert software engineer analyzing code quality for a {language} file.

## File Information
- **File Path**: {file_path}
- **Language**: {language}
- **Context**: {json.dumps(context, indent=2)}

## Code Content
```{language}
{code_content}
```

## Analysis Requirements

Please provide a comprehensive code quality analysis in JSON format:

```json
{{
    "success": boolean,
    "confidence_score": float (0.0-1.0),
    "analysis": "detailed analysis text",
    "recommendations": ["list", "of", "recommendations"],
    "issues_found": [
        {{
            "severity": "high|medium|low",
            "category": "bug|performance|security|maintainability|style",
            "line_number": integer,
            "description": "issue description",
            "suggested_fix": "how to fix this issue"
        }}
    ],
    "code_quality_score": float (0.0-1.0),
    "security_score": float (0.0-1.0),
    "performance_score": float (0.0-1.0),
    "maintainability_score": float (0.0-1.0),
    "metadata": {{
        "complexity_level": "low|medium|high",
        "test_coverage_needed": boolean,
        "refactoring_priority": "low|medium|high"
    }}
}}
```

## Evaluation Criteria

1. **Code Structure**: Is the code well-organized and follows best practices?
2. **Security**: Are there any security vulnerabilities or concerns?
3. **Performance**: Any performance bottlenecks or inefficiencies?
4. **Maintainability**: How easy is this code to maintain and extend?
5. **Testing**: Does the code need additional testing?
6. **Documentation**: Is the code properly documented?

Provide specific, actionable feedback with line numbers where applicable.
"""
    
    def get_pr_analysis_prompt(
        self,
        pr_diff: str,
        pr_description: str,
        project_context: Dict[str, Any]
    ) -> str:
        """Generate PR analysis prompt"""
        
        return f"""
# Pull Request Analysis

You are an expert code reviewer analyzing a pull request for potential issues and impact.

## PR Information
- **Description**: {pr_description}
- **Project Context**: {json.dumps(project_context, indent=2)}

## Changes (Diff)
```diff
{pr_diff}
```

## Analysis Requirements

Please provide a comprehensive PR analysis in JSON format:

```json
{{
    "success": boolean,
    "confidence_score": float (0.0-1.0),
    "analysis": "detailed analysis text",
    "recommendations": ["list", "of", "recommendations"],
    "issues_found": [
        {{
            "severity": "high|medium|low",
            "category": "breaking_change|bug_risk|performance|security|style",
            "file_path": "affected file path",
            "description": "issue description",
            "suggested_fix": "how to fix this issue"
        }}
    ],
    "code_quality_score": float (0.0-1.0),
    "security_score": float (0.0-1.0),
    "performance_score": float (0.0-1.0),
    "maintainability_score": float (0.0-1.0),
    "metadata": {{
        "breaking_changes": boolean,
        "database_changes": boolean,
        "api_changes": boolean,
        "test_coverage_impact": "improved|maintained|reduced",
        "deployment_risk": "low|medium|high"
    }}
}}
```

## Evaluation Criteria

1. **Breaking Changes**: Does this PR introduce breaking changes?
2. **Bug Risk**: Could these changes introduce new bugs?
3. **Security Impact**: Any security implications?
4. **Performance Impact**: Will this affect application performance?
5. **Test Coverage**: Are the changes adequately tested?
6. **Documentation**: Is documentation updated appropriately?

Focus on identifying potential risks and providing actionable feedback.
"""
    
    def get_error_resolution_prompt(
        self,
        error_message: str,
        error_context: Dict[str, Any],
        previous_attempts: List[str]
    ) -> str:
        """Generate error resolution prompt"""
        
        return f"""
# Error Resolution Analysis

You are an expert troubleshooter helping to resolve a deployment or validation error.

## Error Information
- **Error Message**: {error_message}
- **Context**: {json.dumps(error_context, indent=2)}
- **Previous Attempts**: {json.dumps(previous_attempts, indent=2)}

## Resolution Requirements

Please provide error resolution suggestions in JSON format:

```json
{{
    "suggestions": [
        {{
            "priority": "high|medium|low",
            "category": "configuration|dependency|code|environment",
            "description": "what to do",
            "commands": ["list", "of", "commands", "if", "applicable"],
            "estimated_time": "time estimate",
            "success_probability": float (0.0-1.0)
        }}
    ],
    "root_cause": "likely root cause analysis",
    "confidence": float (0.0-1.0),
    "estimated_fix_time": "overall time estimate",
    "prevention_tips": ["how", "to", "prevent", "this", "in", "future"]
}}
```

## Analysis Focus

1. **Root Cause**: What is the most likely cause of this error?
2. **Quick Fixes**: What are the fastest ways to resolve this?
3. **Comprehensive Solutions**: What are the most reliable fixes?
4. **Prevention**: How can this error be prevented in the future?

Prioritize solutions that haven't been tried yet and consider the context of previous attempts.
"""
    
    def get_merge_assessment_prompt(
        self,
        validation_results: Dict[str, Any],
        project_requirements: Dict[str, Any],
        risk_tolerance: str
    ) -> str:
        """Generate merge assessment prompt"""
        
        return f"""
# Merge Readiness Assessment

You are an expert release manager assessing whether a PR is ready for merge based on validation results.

## Validation Results
{json.dumps(validation_results, indent=2)}

## Project Requirements
{json.dumps(project_requirements, indent=2)}

## Risk Tolerance
{risk_tolerance}

## Assessment Requirements

Please provide a merge recommendation in JSON format:

```json
{{
    "recommendation": "approve|reject|manual_review",
    "confidence": float (0.0-1.0),
    "reasoning": "detailed explanation of the decision",
    "risk_factors": [
        {{
            "category": "deployment|security|performance|stability",
            "severity": "high|medium|low",
            "description": "risk description",
            "mitigation": "how to mitigate this risk"
        }}
    ],
    "requirements_met": {{
        "deployment_success": boolean,
        "test_coverage": boolean,
        "security_scan": boolean,
        "performance_check": boolean,
        "code_review": boolean
    }},
    "conditions_for_approval": ["list", "of", "conditions", "if", "manual_review"],
    "estimated_merge_impact": {{
        "user_impact": "none|low|medium|high",
        "system_impact": "none|low|medium|high",
        "rollback_difficulty": "easy|medium|hard"
    }}
}}
```

## Decision Criteria

1. **All Requirements Met**: Are all project requirements satisfied?
2. **Risk Assessment**: Do the risks align with the risk tolerance?
3. **Quality Gates**: Have all quality gates passed?
4. **Impact Analysis**: What is the potential impact of merging?

Base your recommendation on the validation results and project requirements, considering the specified risk tolerance level.
"""
    
    def get_web_eval_analysis_prompt(
        self,
        test_results: Dict[str, Any],
        screenshots: List[str],
        performance_metrics: Dict[str, Any]
    ) -> str:
        """Generate web evaluation analysis prompt"""
        
        return f"""
# Web Evaluation Analysis

You are a QA expert analyzing web application test results and user experience.

## Test Results
{json.dumps(test_results, indent=2)}

## Performance Metrics
{json.dumps(performance_metrics, indent=2)}

## Screenshots Available
{len(screenshots)} screenshots captured during testing

## Analysis Requirements

Please provide a comprehensive web evaluation analysis in JSON format:

```json
{{
    "success": boolean,
    "confidence_score": float (0.0-1.0),
    "analysis": "detailed analysis text",
    "recommendations": ["list", "of", "recommendations"],
    "issues_found": [
        {{
            "severity": "high|medium|low",
            "category": "functionality|performance|accessibility|ui_ux",
            "description": "issue description",
            "screenshot_reference": "screenshot filename if applicable",
            "suggested_fix": "how to fix this issue"
        }}
    ],
    "user_experience_score": float (0.0-1.0),
    "performance_score": float (0.0-1.0),
    "accessibility_score": float (0.0-1.0),
    "functionality_score": float (0.0-1.0),
    "metadata": {{
        "critical_paths_working": boolean,
        "mobile_compatibility": "good|fair|poor",
        "load_time_acceptable": boolean,
        "accessibility_compliant": boolean
    }}
}}
```

## Evaluation Focus

1. **Functionality**: Do all features work as expected?
2. **Performance**: Are load times and responsiveness acceptable?
3. **User Experience**: Is the interface intuitive and user-friendly?
4. **Accessibility**: Does the application meet accessibility standards?
5. **Cross-browser Compatibility**: Does it work across different browsers?

Provide specific, actionable feedback for improving the web application.
"""

