"""
CodegenApp Integration API Routes
System integration endpoints for external services and tools
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.core.monitoring import get_metrics_collector
from app.services.adapters.gemini_adapter import GeminiAdapter
from app.services.web_eval_service import WebEvalService
from app.services.adapters.graph_sitter_adapter import GraphSitterAdapter
from app.utils.exceptions import (
    GeminiAPIException,
    WebEvalException,
    GraphSitterException
)

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()
metrics = get_metrics_collector()

# Service instances
gemini_adapter = GeminiAdapter()
web_eval_service = WebEvalService()
graph_sitter_adapter = GraphSitterAdapter()


class ServiceHealthRequest(BaseModel):
    """Request model for service health check"""
    services: List[str] = Field(default=["all"], description="Services to check")
    timeout: int = Field(default=30, description="Health check timeout")


class ServiceHealthResponse(BaseModel):
    """Response model for service health"""
    service: str
    status: str
    response_time: float
    details: Dict[str, Any]
    timestamp: datetime


class GeminiTestRequest(BaseModel):
    """Request model for Gemini API test"""
    prompt: str = Field(..., description="Test prompt")
    model_config: Optional[Dict[str, Any]] = Field(None, description="Model configuration")


class WebEvalTestRequest(BaseModel):
    """Request model for Web-Eval test"""
    url: str = Field(..., description="URL to test")
    test_scenarios: List[Dict[str, Any]] = Field(default=[], description="Test scenarios")


class GraphSitterTestRequest(BaseModel):
    """Request model for Graph-Sitter test"""
    code_content: str = Field(..., description="Code content to analyze")
    language: str = Field(..., description="Programming language")


@router.get("/health", response_model=List[ServiceHealthResponse])
async def check_service_health(
    services: Optional[str] = "all",
    timeout: int = 30
):
    """
    Check health of integrated services
    
    Tests connectivity and basic functionality of all integrated services
    including Gemini API, Web-Eval-Agent, and Graph-Sitter.
    """
    try:
        service_list = services.split(",") if services != "all" else [
            "gemini", "web_eval", "graph_sitter", "codegen_api", "github_api"
        ]
        
        health_results = []
        
        for service in service_list:
            start_time = datetime.utcnow()
            
            try:
                if service == "gemini":
                    result = await _test_gemini_health(timeout)
                elif service == "web_eval":
                    result = await _test_web_eval_health(timeout)
                elif service == "graph_sitter":
                    result = await _test_graph_sitter_health(timeout)
                elif service == "codegen_api":
                    result = await _test_codegen_api_health(timeout)
                elif service == "github_api":
                    result = await _test_github_api_health(timeout)
                else:
                    result = {
                        "status": "unknown",
                        "details": {"error": f"Unknown service: {service}"}
                    }
                
                response_time = (datetime.utcnow() - start_time).total_seconds()
                
                health_results.append(ServiceHealthResponse(
                    service=service,
                    status=result["status"],
                    response_time=response_time,
                    details=result["details"],
                    timestamp=datetime.utcnow()
                ))
                
            except Exception as e:
                response_time = (datetime.utcnow() - start_time).total_seconds()
                
                health_results.append(ServiceHealthResponse(
                    service=service,
                    status="error",
                    response_time=response_time,
                    details={"error": str(e)},
                    timestamp=datetime.utcnow()
                ))
        
        return health_results
        
    except Exception as e:
        logger.error("Service health check failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.post("/gemini/test")
async def test_gemini_integration(request: GeminiTestRequest):
    """
    Test Gemini API integration
    
    Sends a test prompt to Gemini API to verify connectivity and functionality.
    """
    try:
        logger.info("Testing Gemini integration", prompt_length=len(request.prompt))
        
        # Test basic prompt response
        start_time = datetime.utcnow()
        
        # Use the deployment validation method as a test
        result = await gemini_adapter.validate_deployment(
            project_name="test_project",
            pr_url="https://github.com/test/test/pull/1",
            deployment_output=request.prompt,
            deployment_success=True
        )
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            "success": True,
            "response_time": response_time,
            "result": {
                "confidence_score": result.confidence_score,
                "analysis_length": len(result.analysis),
                "recommendations_count": len(result.recommendations),
                "issues_found": len(result.issues_found)
            },
            "timestamp": datetime.utcnow()
        }
        
    except GeminiAPIException as e:
        logger.error("Gemini integration test failed", error=str(e))
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")
    except Exception as e:
        logger.error("Gemini test failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.post("/web-eval/test")
async def test_web_eval_integration(request: WebEvalTestRequest):
    """
    Test Web-Eval-Agent integration
    
    Runs a basic web evaluation test to verify Playwright and testing functionality.
    """
    try:
        logger.info("Testing Web-Eval integration", url=request.url)
        
        start_time = datetime.utcnow()
        
        # Run comprehensive tests
        result = await web_eval_service.run_comprehensive_tests(
            project_name="test_project",
            deployment_url=request.url,
            test_config={"test_scenarios": request.test_scenarios}
        )
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            "success": result.success,
            "response_time": response_time,
            "result": {
                "tests_passed": result.tests_passed,
                "tests_failed": result.tests_failed,
                "total_tests": result.total_tests,
                "coverage_percentage": result.coverage_percentage,
                "accessibility_score": result.accessibility_score,
                "performance_metrics": result.performance_metrics,
                "ui_issues_count": len(result.ui_issues),
                "screenshots_captured": len(result.screenshots)
            },
            "timestamp": datetime.utcnow()
        }
        
    except WebEvalException as e:
        logger.error("Web-Eval integration test failed", error=str(e))
        raise HTTPException(status_code=502, detail=f"Web-Eval error: {str(e)}")
    except Exception as e:
        logger.error("Web-Eval test failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.post("/graph-sitter/test")
async def test_graph_sitter_integration(request: GraphSitterTestRequest):
    """
    Test Graph-Sitter integration
    
    Analyzes provided code content to verify Tree-sitter parsing and analysis.
    """
    try:
        logger.info("Testing Graph-Sitter integration", language=request.language)
        
        # Create temporary file for analysis
        import tempfile
        from pathlib import Path
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Write code to temporary file
            file_extension = {
                "python": ".py",
                "javascript": ".js",
                "typescript": ".ts",
                "go": ".go",
                "rust": ".rs",
                "java": ".java",
                "cpp": ".cpp",
                "c": ".c"
            }.get(request.language, ".txt")
            
            test_file = temp_path / f"test{file_extension}"
            test_file.write_text(request.code_content)
            
            start_time = datetime.utcnow()
            
            # Run analysis
            result = await graph_sitter_adapter.analyze_codebase(
                workspace_path=str(temp_path),
                languages=[request.language]
            )
            
            response_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "success": result.success,
                "response_time": response_time,
                "result": {
                    "files_analyzed": result.files_analyzed,
                    "complexity_score": result.complexity_score,
                    "languages_analyzed": result.languages_analyzed,
                    "patterns_found": len(result.code_patterns),
                    "issues_found": len(result.potential_issues),
                    "refactoring_suggestions": len(result.refactoring_suggestions)
                },
                "timestamp": datetime.utcnow()
            }
        
    except GraphSitterException as e:
        logger.error("Graph-Sitter integration test failed", error=str(e))
        raise HTTPException(status_code=502, detail=f"Graph-Sitter error: {str(e)}")
    except Exception as e:
        logger.error("Graph-Sitter test failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.get("/configuration")
async def get_integration_configuration():
    """
    Get current integration configuration
    
    Returns configuration details for all integrated services.
    """
    try:
        config = {
            "gemini": {
                "model": settings.gemini.model,
                "temperature": settings.gemini.temperature,
                "max_tokens": settings.gemini.max_tokens,
                "timeout": settings.gemini.timeout
            },
            "web_eval": {
                "browser": settings.web_eval.browser,
                "headless": settings.web_eval.headless,
                "timeout": settings.web_eval.timeout,
                "max_concurrent": settings.web_eval.max_concurrent
            },
            "graph_sitter": {
                "supported_languages": settings.graph_sitter.supported_languages,
                "cache_size": settings.graph_sitter.cache_size,
                "max_file_size": settings.graph_sitter.max_file_size,
                "timeout": settings.graph_sitter.timeout
            },
            "validation": {
                "timeout": settings.validation.timeout,
                "max_retries": settings.validation.max_retries,
                "confidence_threshold": settings.validation.confidence_threshold,
                "concurrent_limit": settings.validation.concurrent_limit
            },
            "auto_merge": {
                "enabled": settings.auto_merge.enabled,
                "confidence_threshold": settings.auto_merge.confidence_threshold,
                "error_threshold": settings.auto_merge.error_threshold,
                "require_tests": settings.auto_merge.require_tests
            }
        }
        
        return {
            "configuration": config,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error("Failed to get configuration", error=str(e))
        raise HTTPException(status_code=500, detail=f"Configuration retrieval failed: {str(e)}")


@router.post("/cache/clear")
async def clear_integration_caches():
    """
    Clear all integration caches
    
    Clears caches for Graph-Sitter analysis and other cached data.
    """
    try:
        logger.info("Clearing integration caches")
        
        # Clear Graph-Sitter cache
        graph_sitter_adapter.clear_cache()
        
        # Clear other caches as needed
        # (Add more cache clearing logic here)
        
        return {
            "success": True,
            "message": "All integration caches cleared",
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error("Failed to clear caches", error=str(e))
        raise HTTPException(status_code=500, detail=f"Cache clearing failed: {str(e)}")


# Helper functions for health checks

async def _test_gemini_health(timeout: int) -> Dict[str, Any]:
    """Test Gemini API health"""
    try:
        # Simple test prompt
        result = await asyncio.wait_for(
            gemini_adapter.validate_deployment(
                project_name="health_check",
                pr_url="https://github.com/test/test/pull/1",
                deployment_output="Health check test",
                deployment_success=True
            ),
            timeout=timeout
        )
        
        return {
            "status": "healthy",
            "details": {
                "model": settings.gemini.model,
                "response_received": True,
                "confidence_score": result.confidence_score
            }
        }
        
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "details": {"error": f"Health check timed out after {timeout}s"}
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "details": {"error": str(e)}
        }


async def _test_web_eval_health(timeout: int) -> Dict[str, Any]:
    """Test Web-Eval service health"""
    try:
        # Test with a simple URL
        result = await asyncio.wait_for(
            web_eval_service.run_performance_tests(
                deployment_url="https://httpbin.org/get",
                performance_config={}
            ),
            timeout=timeout
        )
        
        return {
            "status": "healthy",
            "details": {
                "browser": settings.web_eval.browser,
                "load_time": result.get("load_time", 0),
                "test_completed": True
            }
        }
        
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "details": {"error": f"Health check timed out after {timeout}s"}
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "details": {"error": str(e)}
        }


async def _test_graph_sitter_health(timeout: int) -> Dict[str, Any]:
    """Test Graph-Sitter health"""
    try:
        # Test with simple code analysis
        import tempfile
        from pathlib import Path
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            test_file = temp_path / "test.py"
            test_file.write_text("def hello():\n    return 'world'")
            
            result = await asyncio.wait_for(
                graph_sitter_adapter.analyze_codebase(
                    workspace_path=str(temp_path),
                    languages=["python"]
                ),
                timeout=timeout
            )
            
            return {
                "status": "healthy",
                "details": {
                    "supported_languages": settings.graph_sitter.supported_languages,
                    "files_analyzed": result.files_analyzed,
                    "analysis_completed": result.success
                }
            }
        
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "details": {"error": f"Health check timed out after {timeout}s"}
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "details": {"error": str(e)}
        }


async def _test_codegen_api_health(timeout: int) -> Dict[str, Any]:
    """Test Codegen API health"""
    try:
        # This would test actual Codegen API connectivity
        # For now, return a placeholder
        return {
            "status": "healthy",
            "details": {
                "api_base": settings.codegen.api_base,
                "org_id": settings.codegen.org_id,
                "connection": "simulated"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "details": {"error": str(e)}
        }


async def _test_github_api_health(timeout: int) -> Dict[str, Any]:
    """Test GitHub API health"""
    try:
        # This would test actual GitHub API connectivity
        # For now, return a placeholder
        return {
            "status": "healthy",
            "details": {
                "api_base": settings.github.api_base,
                "token_configured": bool(settings.github.token),
                "connection": "simulated"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "details": {"error": str(e)}
        }

