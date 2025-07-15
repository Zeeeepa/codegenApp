"""
CodegenApp Gemini AI Adapter
Integration with Google Gemini API for AI-powered validation and analysis
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.models.validation import GeminiValidationResult
from app.utils.exceptions import GeminiAPIException, RateLimitException
from app.utils.prompt_templates import PromptTemplates

logger = get_logger(__name__)
settings = get_settings()


class GeminiAdapter:
    """
    Gemini AI integration adapter
    
    Provides AI-powered validation, analysis, and decision-making capabilities
    using Google's Gemini API. Includes intelligent prompt engineering and
    response parsing for deployment validation and code analysis.
    """
    
    def __init__(self):
        # Configure Gemini API
        genai.configure(api_key=settings.gemini.api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=settings.gemini.model,
            generation_config=genai.types.GenerationConfig(
                temperature=settings.gemini.temperature,
                max_output_tokens=settings.gemini.max_tokens,
                top_p=0.8,
                top_k=40
            ),
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        self.prompt_templates = PromptTemplates()
        
        logger.info("GeminiAdapter initialized", model=settings.gemini.model)
    
    async def validate_deployment(
        self,
        project_name: str,
        pr_url: str,
        deployment_output: str,
        deployment_success: bool,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> GeminiValidationResult:
        """
        Validate deployment using AI analysis
        
        Analyzes deployment output, success status, and context to provide
        intelligent validation results and recommendations.
        """
        try:
            logger.info(
                "Starting Gemini deployment validation",
                project=project_name,
                pr_url=pr_url,
                deployment_success=deployment_success
            )
            
            # Prepare validation prompt
            prompt = self.prompt_templates.get_deployment_validation_prompt(
                project_name=project_name,
                pr_url=pr_url,
                deployment_output=deployment_output,
                deployment_success=deployment_success,
                additional_context=additional_context or {}
            )
            
            # Generate AI response
            response = await self._generate_response(prompt)
            
            # Parse response
            result = self._parse_validation_response(response)
            
            logger.info(
                "Gemini deployment validation completed",
                project=project_name,
                confidence_score=result.confidence_score,
                success=result.success
            )
            
            return result
            
        except Exception as e:
            logger.error("Gemini deployment validation failed", error=str(e))
            raise GeminiAPIException(f"Deployment validation failed: {str(e)}")
    
    async def analyze_code_quality(
        self,
        code_content: str,
        file_path: str,
        language: str,
        context: Optional[Dict[str, Any]] = None
    ) -> GeminiValidationResult:
        """
        Analyze code quality using AI
        
        Provides detailed code quality analysis including maintainability,
        security, performance, and best practices assessment.
        """
        try:
            logger.info(
                "Starting Gemini code quality analysis",
                file_path=file_path,
                language=language,
                code_length=len(code_content)
            )
            
            # Prepare code analysis prompt
            prompt = self.prompt_templates.get_code_quality_prompt(
                code_content=code_content,
                file_path=file_path,
                language=language,
                context=context or {}
            )
            
            # Generate AI response
            response = await self._generate_response(prompt)
            
            # Parse response
            result = self._parse_code_analysis_response(response)
            
            logger.info(
                "Gemini code quality analysis completed",
                file_path=file_path,
                code_quality_score=result.code_quality_score,
                issues_found=len(result.issues_found)
            )
            
            return result
            
        except Exception as e:
            logger.error("Gemini code quality analysis failed", error=str(e))
            raise GeminiAPIException(f"Code quality analysis failed: {str(e)}")
    
    async def analyze_pr_changes(
        self,
        pr_diff: str,
        pr_description: str,
        project_context: Optional[Dict[str, Any]] = None
    ) -> GeminiValidationResult:
        """
        Analyze PR changes for impact and quality
        
        Evaluates PR changes for potential issues, breaking changes,
        and overall impact on the codebase.
        """
        try:
            logger.info(
                "Starting Gemini PR analysis",
                diff_length=len(pr_diff),
                description_length=len(pr_description)
            )
            
            # Prepare PR analysis prompt
            prompt = self.prompt_templates.get_pr_analysis_prompt(
                pr_diff=pr_diff,
                pr_description=pr_description,
                project_context=project_context or {}
            )
            
            # Generate AI response
            response = await self._generate_response(prompt)
            
            # Parse response
            result = self._parse_pr_analysis_response(response)
            
            logger.info(
                "Gemini PR analysis completed",
                confidence_score=result.confidence_score,
                issues_found=len(result.issues_found)
            )
            
            return result
            
        except Exception as e:
            logger.error("Gemini PR analysis failed", error=str(e))
            raise GeminiAPIException(f"PR analysis failed: {str(e)}")
    
    async def generate_error_resolution(
        self,
        error_message: str,
        error_context: Dict[str, Any],
        previous_attempts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate error resolution suggestions
        
        Analyzes errors and provides intelligent suggestions for resolution
        based on context and previous attempts.
        """
        try:
            logger.info(
                "Generating error resolution",
                error_type=error_context.get("error_type", "unknown")
            )
            
            # Prepare error resolution prompt
            prompt = self.prompt_templates.get_error_resolution_prompt(
                error_message=error_message,
                error_context=error_context,
                previous_attempts=previous_attempts or []
            )
            
            # Generate AI response
            response = await self._generate_response(prompt)
            
            # Parse response
            resolution = self._parse_error_resolution_response(response)
            
            logger.info("Error resolution generated", suggestions=len(resolution.get("suggestions", [])))
            
            return resolution
            
        except Exception as e:
            logger.error("Error resolution generation failed", error=str(e))
            raise GeminiAPIException(f"Error resolution failed: {str(e)}")
    
    async def assess_merge_readiness(
        self,
        validation_results: Dict[str, Any],
        project_requirements: Dict[str, Any],
        risk_tolerance: str = "medium"
    ) -> Dict[str, Any]:
        """
        Assess PR merge readiness using AI
        
        Evaluates all validation results and provides intelligent merge
        recommendations based on project requirements and risk tolerance.
        """
        try:
            logger.info(
                "Assessing merge readiness",
                risk_tolerance=risk_tolerance,
                validation_stages=len(validation_results)
            )
            
            # Prepare merge assessment prompt
            prompt = self.prompt_templates.get_merge_assessment_prompt(
                validation_results=validation_results,
                project_requirements=project_requirements,
                risk_tolerance=risk_tolerance
            )
            
            # Generate AI response
            response = await self._generate_response(prompt)
            
            # Parse response
            assessment = self._parse_merge_assessment_response(response)
            
            logger.info(
                "Merge readiness assessed",
                recommendation=assessment.get("recommendation", "unknown"),
                confidence=assessment.get("confidence", 0.0)
            )
            
            return assessment
            
        except Exception as e:
            logger.error("Merge readiness assessment failed", error=str(e))
            raise GeminiAPIException(f"Merge assessment failed: {str(e)}")
    
    # Private helper methods
    
    async def _generate_response(self, prompt: str, max_retries: int = 3) -> str:
        """
        Generate response from Gemini API with retry logic
        """
        for attempt in range(max_retries):
            try:
                # Add delay between retries
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)
                
                # Generate response
                response = await asyncio.to_thread(
                    self.model.generate_content,
                    prompt
                )
                
                if response.text:
                    return response.text
                else:
                    raise GeminiAPIException("Empty response from Gemini API")
                    
            except Exception as e:
                error_str = str(e).lower()
                
                # Handle rate limiting
                if "quota" in error_str or "rate" in error_str or "429" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = min(60, 2 ** (attempt + 2))
                        logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        raise RateLimitException("gemini", retry_after=60)
                
                # Handle other errors
                if attempt == max_retries - 1:
                    raise GeminiAPIException(f"Failed after {max_retries} attempts: {str(e)}")
                
                logger.warning(f"Attempt {attempt + 1} failed, retrying: {str(e)}")
        
        raise GeminiAPIException("Max retries exceeded")
    
    def _parse_validation_response(self, response: str) -> GeminiValidationResult:
        """Parse deployment validation response"""
        try:
            # Try to parse as JSON first
            if response.strip().startswith('{'):
                data = json.loads(response)
                return GeminiValidationResult(
                    success=data.get("success", False),
                    confidence_score=data.get("confidence_score", 0.0),
                    analysis=data.get("analysis", response),
                    recommendations=data.get("recommendations", []),
                    issues_found=data.get("issues_found", []),
                    code_quality_score=data.get("code_quality_score", 0.0),
                    security_score=data.get("security_score", 0.0),
                    performance_score=data.get("performance_score", 0.0),
                    maintainability_score=data.get("maintainability_score", 0.0)
                )
            
            # Fallback to text parsing
            return self._parse_text_response(response)
            
        except json.JSONDecodeError:
            return self._parse_text_response(response)
    
    def _parse_text_response(self, response: str) -> GeminiValidationResult:
        """Parse text-based response"""
        lines = response.split('\n')
        
        # Extract key information using simple text parsing
        success = "success" in response.lower() and "fail" not in response.lower()
        confidence_score = self._extract_score(response, "confidence")
        
        # Extract recommendations
        recommendations = []
        in_recommendations = False
        for line in lines:
            if "recommendation" in line.lower():
                in_recommendations = True
                continue
            if in_recommendations and line.strip().startswith(('-', '*', '•')):
                recommendations.append(line.strip()[1:].strip())
        
        return GeminiValidationResult(
            success=success,
            confidence_score=confidence_score,
            analysis=response,
            recommendations=recommendations,
            code_quality_score=self._extract_score(response, "quality"),
            security_score=self._extract_score(response, "security"),
            performance_score=self._extract_score(response, "performance"),
            maintainability_score=self._extract_score(response, "maintainability")
        )
    
    def _extract_score(self, text: str, score_type: str) -> float:
        """Extract numeric score from text"""
        import re
        
        patterns = [
            rf"{score_type}[:\s]+(\d+(?:\.\d+)?)",
            rf"{score_type}[:\s]+(\d+(?:\.\d+)?)/10",
            rf"{score_type}[:\s]+(\d+(?:\.\d+)?)%"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                score = float(match.group(1))
                # Normalize to 0-1 range
                if score > 1:
                    score = score / 10 if score <= 10 else score / 100
                return min(1.0, max(0.0, score))
        
        return 0.0
    
    def _parse_code_analysis_response(self, response: str) -> GeminiValidationResult:
        """Parse code analysis response"""
        return self._parse_validation_response(response)
    
    def _parse_pr_analysis_response(self, response: str) -> GeminiValidationResult:
        """Parse PR analysis response"""
        return self._parse_validation_response(response)
    
    def _parse_error_resolution_response(self, response: str) -> Dict[str, Any]:
        """Parse error resolution response"""
        try:
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # Fallback text parsing
            return {
                "suggestions": [line.strip() for line in response.split('\n') if line.strip()],
                "confidence": 0.7,
                "estimated_fix_time": "unknown"
            }
            
        except json.JSONDecodeError:
            return {
                "suggestions": [response],
                "confidence": 0.5,
                "estimated_fix_time": "unknown"
            }
    
    def _parse_merge_assessment_response(self, response: str) -> Dict[str, Any]:
        """Parse merge assessment response"""
        try:
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # Fallback text parsing
            recommendation = "manual_review"
            if "approve" in response.lower() or "merge" in response.lower():
                recommendation = "approve"
            elif "reject" in response.lower() or "block" in response.lower():
                recommendation = "reject"
            
            return {
                "recommendation": recommendation,
                "confidence": self._extract_score(response, "confidence"),
                "reasoning": response,
                "risk_factors": [],
                "requirements_met": {}
            }
            
        except json.JSONDecodeError:
            return {
                "recommendation": "manual_review",
                "confidence": 0.5,
                "reasoning": response,
                "risk_factors": [],
                "requirements_met": {}
            }

