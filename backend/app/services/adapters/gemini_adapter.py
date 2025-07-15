"""
Gemini Adapter for AI-Powered Validation Analysis

Provides AI-powered analysis of deployment logs, error context, and validation results.
"""

import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
import logging
import google.generativeai as genai
from dataclasses import dataclass

from app.config.settings import get_settings
from app.core.workflow.deployment_executor import DeploymentResult

logger = logging.getLogger(__name__)


@dataclass
class ValidationAnalysis:
    """Result of AI validation analysis"""
    success: bool
    confidence: float
    summary: str
    issues: List[Dict[str, Any]]
    recommendations: List[str]
    error_context: Optional[str] = None
    suggested_fixes: List[str] = None


class GeminiAdapter:
    """Adapter for Gemini AI validation analysis"""
    
    def __init__(self):
        self.settings = get_settings()
        self._initialize_gemini()
        
    def _initialize_gemini(self):
        """Initialize Gemini AI client"""
        try:
            api_key = getattr(self.settings, 'gemini_api_key', None)
            if not api_key:
                logger.warning("Gemini API key not configured")
                self.client = None
                return
            
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel('gemini-pro')
            logger.info("Gemini AI client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini AI client: {e}")
            self.client = None
    
    async def analyze_deployment_results(
        self,
        deployment_results: List[DeploymentResult],
        deployment_context: Dict[str, Any],
        project_name: str
    ) -> ValidationAnalysis:
        """Analyze deployment results using Gemini AI"""
        
        if not self.client:
            return self._create_fallback_analysis(deployment_results, "Gemini AI not available")
        
        try:
            # Prepare analysis prompt
            prompt = self._create_deployment_analysis_prompt(
                deployment_results, 
                deployment_context, 
                project_name
            )
            
            # Generate analysis
            response = await self._generate_response(prompt)
            
            # Parse response
            analysis = self._parse_deployment_analysis(response, deployment_results)
            
            logger.info(f"Deployment analysis completed for {project_name}")
            return analysis
            
        except Exception as e:
            logger.error(f"Deployment analysis failed: {e}")
            return self._create_fallback_analysis(deployment_results, str(e))
    
    async def analyze_error_context(
        self,
        error_logs: str,
        deployment_context: Dict[str, Any],
        project_name: str,
        previous_attempts: List[str] = None
    ) -> ValidationAnalysis:
        """Analyze error context and suggest fixes"""
        
        if not self.client:
            return self._create_fallback_analysis([], "Gemini AI not available")
        
        try:
            # Prepare error analysis prompt
            prompt = self._create_error_analysis_prompt(
                error_logs,
                deployment_context,
                project_name,
                previous_attempts or []
            )
            
            # Generate analysis
            response = await self._generate_response(prompt)
            
            # Parse response
            analysis = self._parse_error_analysis(response, error_logs)
            
            logger.info(f"Error analysis completed for {project_name}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error analysis failed: {e}")
            return self._create_fallback_analysis([], str(e))
    
    async def analyze_web_eval_results(
        self,
        web_eval_results: Dict[str, Any],
        project_name: str
    ) -> ValidationAnalysis:
        """Analyze web evaluation results"""
        
        if not self.client:
            return self._create_fallback_analysis([], "Gemini AI not available")
        
        try:
            # Prepare web eval analysis prompt
            prompt = self._create_web_eval_analysis_prompt(web_eval_results, project_name)
            
            # Generate analysis
            response = await self._generate_response(prompt)
            
            # Parse response
            analysis = self._parse_web_eval_analysis(response, web_eval_results)
            
            logger.info(f"Web evaluation analysis completed for {project_name}")
            return analysis
            
        except Exception as e:
            logger.error(f"Web evaluation analysis failed: {e}")
            return self._create_fallback_analysis([], str(e))
    
    def _create_deployment_analysis_prompt(
        self,
        deployment_results: List[DeploymentResult],
        deployment_context: Dict[str, Any],
        project_name: str
    ) -> str:
        """Create prompt for deployment analysis"""
        
        prompt = f"""
Analyze the deployment results for project '{project_name}' and provide a comprehensive assessment.

DEPLOYMENT CONTEXT:
- Overall Success: {deployment_context.get('overall_success', False)}
- Total Commands: {deployment_context.get('total_commands', 0)}
- Successful Commands: {deployment_context.get('successful_commands', 0)}
- Failed Commands: {deployment_context.get('failed_commands', 0)}
- Total Duration: {deployment_context.get('total_duration', 0):.2f}s

COMMAND RESULTS:
"""
        
        for i, result in enumerate(deployment_results):
            prompt += f"""
Command {i+1}: {result.command}
- Success: {result.success}
- Exit Code: {result.exit_code}
- Duration: {result.duration:.2f}s
- STDOUT: {result.stdout[:500]}{'...' if len(result.stdout) > 500 else ''}
- STDERR: {result.stderr[:500]}{'...' if len(result.stderr) > 500 else ''}
"""
        
        prompt += f"""
DEPLOYMENT ARTIFACTS:
{json.dumps(deployment_context.get('artifacts', {}), indent=2)}

RUNNING SERVICES:
{json.dumps(deployment_context.get('services', {}), indent=2)}

Please provide a JSON response with the following structure:
{{
    "success": boolean,
    "confidence": float (0.0-1.0),
    "summary": "Brief summary of deployment status",
    "issues": [
        {{
            "type": "error|warning|info",
            "command": "command that caused issue",
            "description": "detailed description",
            "severity": "high|medium|low"
        }}
    ],
    "recommendations": [
        "specific actionable recommendations"
    ]
}}

Focus on:
1. Whether the deployment was truly successful
2. Any potential issues or warnings
3. Performance concerns
4. Missing artifacts or services
5. Specific recommendations for improvement
"""
        
        return prompt
    
    def _create_error_analysis_prompt(
        self,
        error_logs: str,
        deployment_context: Dict[str, Any],
        project_name: str,
        previous_attempts: List[str]
    ) -> str:
        """Create prompt for error analysis"""
        
        prompt = f"""
Analyze the deployment errors for project '{project_name}' and provide specific fixes.

ERROR LOGS:
{error_logs[:2000]}{'...' if len(error_logs) > 2000 else ''}

DEPLOYMENT CONTEXT:
{json.dumps(deployment_context, indent=2)}

PREVIOUS ATTEMPTS:
{json.dumps(previous_attempts, indent=2) if previous_attempts else 'None'}

Please provide a JSON response with the following structure:
{{
    "success": false,
    "confidence": float (0.0-1.0),
    "summary": "Brief summary of the error",
    "error_context": "Detailed explanation of what went wrong",
    "issues": [
        {{
            "type": "error",
            "description": "specific error description",
            "severity": "high|medium|low",
            "location": "file/command where error occurred"
        }}
    ],
    "suggested_fixes": [
        "specific code changes or commands to fix the issue"
    ],
    "recommendations": [
        "general recommendations to prevent similar issues"
    ]
}}

Focus on:
1. Root cause analysis of the error
2. Specific code changes needed
3. Command-line fixes
4. Configuration adjustments
5. Dependency issues
6. Environment setup problems
"""
        
        return prompt
    
    def _create_web_eval_analysis_prompt(
        self,
        web_eval_results: Dict[str, Any],
        project_name: str
    ) -> str:
        """Create prompt for web evaluation analysis"""
        
        prompt = f"""
Analyze the web evaluation results for project '{project_name}' and assess functionality.

WEB EVALUATION RESULTS:
{json.dumps(web_eval_results, indent=2)}

Please provide a JSON response with the following structure:
{{
    "success": boolean,
    "confidence": float (0.0-1.0),
    "summary": "Brief summary of web evaluation",
    "issues": [
        {{
            "type": "error|warning|info",
            "component": "UI component or flow affected",
            "description": "detailed description",
            "severity": "high|medium|low"
        }}
    ],
    "recommendations": [
        "specific recommendations for UI/UX improvements"
    ]
}}

Focus on:
1. Functionality validation
2. UI/UX issues
3. Performance problems
4. Accessibility concerns
5. Cross-browser compatibility
6. User flow completeness
"""
        
        return prompt
    
    async def _generate_response(self, prompt: str) -> str:
        """Generate response from Gemini AI"""
        
        try:
            # Use asyncio to run the synchronous generate_content method
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.generate_content(prompt)
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Failed to generate Gemini response: {e}")
            raise
    
    def _parse_deployment_analysis(
        self,
        response: str,
        deployment_results: List[DeploymentResult]
    ) -> ValidationAnalysis:
        """Parse deployment analysis response"""
        
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                return ValidationAnalysis(
                    success=data.get('success', False),
                    confidence=data.get('confidence', 0.5),
                    summary=data.get('summary', 'Analysis completed'),
                    issues=data.get('issues', []),
                    recommendations=data.get('recommendations', [])
                )
            else:
                # Fallback parsing
                return self._create_fallback_analysis(deployment_results, "Failed to parse JSON response")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse deployment analysis JSON: {e}")
            return self._create_fallback_analysis(deployment_results, "JSON parsing error")
    
    def _parse_error_analysis(self, response: str, error_logs: str) -> ValidationAnalysis:
        """Parse error analysis response"""
        
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                return ValidationAnalysis(
                    success=False,
                    confidence=data.get('confidence', 0.5),
                    summary=data.get('summary', 'Error analysis completed'),
                    issues=data.get('issues', []),
                    recommendations=data.get('recommendations', []),
                    error_context=data.get('error_context'),
                    suggested_fixes=data.get('suggested_fixes', [])
                )
            else:
                # Fallback parsing
                return self._create_fallback_analysis([], "Failed to parse error analysis JSON")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse error analysis JSON: {e}")
            return self._create_fallback_analysis([], "JSON parsing error")
    
    def _parse_web_eval_analysis(
        self,
        response: str,
        web_eval_results: Dict[str, Any]
    ) -> ValidationAnalysis:
        """Parse web evaluation analysis response"""
        
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                return ValidationAnalysis(
                    success=data.get('success', False),
                    confidence=data.get('confidence', 0.5),
                    summary=data.get('summary', 'Web evaluation analysis completed'),
                    issues=data.get('issues', []),
                    recommendations=data.get('recommendations', [])
                )
            else:
                # Fallback parsing
                return self._create_fallback_analysis([], "Failed to parse web eval analysis JSON")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse web eval analysis JSON: {e}")
            return self._create_fallback_analysis([], "JSON parsing error")
    
    def _create_fallback_analysis(
        self,
        deployment_results: List[DeploymentResult],
        error_message: str
    ) -> ValidationAnalysis:
        """Create fallback analysis when AI analysis fails"""
        
        # Basic rule-based analysis
        if deployment_results:
            success = all(result.success for result in deployment_results)
            failed_commands = [r for r in deployment_results if not r.success]
            
            issues = []
            for result in failed_commands:
                issues.append({
                    "type": "error",
                    "command": result.command,
                    "description": f"Command failed with exit code {result.exit_code}",
                    "severity": "high"
                })
            
            summary = f"Deployment {'succeeded' if success else 'failed'} ({len(failed_commands)} failures)"
        else:
            success = False
            issues = [{"type": "error", "description": error_message, "severity": "high"}]
            summary = "Analysis failed"
        
        return ValidationAnalysis(
            success=success,
            confidence=0.3,  # Low confidence for fallback
            summary=summary,
            issues=issues,
            recommendations=["Check logs for detailed error information", "Verify environment configuration"]
        )


# Global Gemini adapter instance
_gemini_adapter = None

def get_gemini_adapter() -> GeminiAdapter:
    """Get the global Gemini adapter instance"""
    global _gemini_adapter
    if _gemini_adapter is None:
        _gemini_adapter = GeminiAdapter()
    return _gemini_adapter

