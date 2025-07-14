"""
Analysis API Routes - HTTP endpoints for graph-sitter repository analysis
Provides comprehensive endpoints for code analysis, symbol navigation, and visual repository exploration
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
import asyncio
import time
from pathlib import Path

from app.models.api.analysis import (
    AnalyzeCodebaseRequest, AnalyzeFileRequest, GetSymbolInfoRequest,
    GetDependencyGraphRequest, InteractiveAnalysisRequest, BatchAnalysisRequest,
    AnalysisResultResponse, CodebaseStructureResponse, FileStructureResponse,
    SymbolInfoResponse, DependencyGraphResponse, StructureOverviewResponse,
    InteractiveAnalysisResponse, BatchAnalysisResponse, CacheStatsResponse,
    PerformanceMetricsResponse, AnalysisErrorResponse, VisualGraphResponse,
    AnalysisTypeEnum
)
from app.services.adapters.graph_sitter_adapter import GraphSitterAdapter, AnalysisResult
from app.services.analysis_service import AnalysisService
from app.services.visualization_service import VisualizationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Global adapter instance (will be initialized in main.py)
_graph_sitter_adapter: Optional[GraphSitterAdapter] = None
_analysis_service: Optional[AnalysisService] = None
_visualization_service: Optional[VisualizationService] = None


def set_analysis_dependencies(
    adapter: GraphSitterAdapter,
    analysis_service: AnalysisService,
    visualization_service: VisualizationService
):
    """Set global analysis dependencies (called from main.py)"""
    global _graph_sitter_adapter, _analysis_service, _visualization_service
    _graph_sitter_adapter = adapter
    _analysis_service = analysis_service
    _visualization_service = visualization_service


async def get_graph_sitter_adapter() -> GraphSitterAdapter:
    """Get graph-sitter adapter instance"""
    if not _graph_sitter_adapter:
        raise HTTPException(
            status_code=503,
            detail="Graph-sitter adapter not initialized"
        )
    return _graph_sitter_adapter


async def get_analysis_service() -> AnalysisService:
    """Get analysis service instance"""
    if not _analysis_service:
        raise HTTPException(
            status_code=503,
            detail="Analysis service not initialized"
        )
    return _analysis_service


async def get_visualization_service() -> VisualizationService:
    """Get visualization service instance"""
    if not _visualization_service:
        raise HTTPException(
            status_code=503,
            detail="Visualization service not initialized"
        )
    return _visualization_service


@router.post("/codebase", response_model=AnalysisResultResponse)
async def analyze_codebase(
    request: AnalyzeCodebaseRequest,
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """
    Perform comprehensive codebase analysis.
    
    This endpoint analyzes an entire repository and returns:
    - File structure information
    - Symbol index (functions, classes, etc.)
    - Dependency graph
    - Language statistics
    - Complexity metrics
    """
    try:
        logger.info(f"Starting codebase analysis for: {request.repo_path}")
        
        # Validate repository path
        if not Path(request.repo_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Repository path not found: {request.repo_path}"
            )
        
        # Perform analysis
        result = await adapter.analyze_codebase(
            repo_path=request.repo_path,
            include_patterns=request.include_patterns,
            exclude_patterns=request.exclude_patterns
        )
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Analysis failed: {result.error_message}"
            )
        
        # Convert to response model
        return AnalysisResultResponse(
            success=result.success,
            analysis_type=AnalysisTypeEnum.FULL_CODEBASE,
            data=result.data,
            error_message=result.error_message,
            warnings=result.warnings,
            metadata=result.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in codebase analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/file", response_model=AnalysisResultResponse)
async def analyze_file(
    request: AnalyzeFileRequest,
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """
    Analyze a specific file.
    
    Returns detailed information about:
    - Functions and classes in the file
    - Import/export statements
    - Dependencies
    - Code metrics
    """
    try:
        logger.info(f"Analyzing file: {request.file_path}")
        
        # Validate file path
        if not Path(request.file_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {request.file_path}"
            )
        
        # Perform analysis
        result = await adapter.analyze_file(
            file_path=request.file_path,
            repo_path=request.repo_path
        )
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=f"File analysis failed: {result.error_message}"
            )
        
        return AnalysisResultResponse(
            success=result.success,
            analysis_type=AnalysisTypeEnum.FILE_ANALYSIS,
            data=result.data,
            error_message=result.error_message,
            warnings=result.warnings,
            metadata=result.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/symbol", response_model=AnalysisResultResponse)
async def get_symbol_info(
    request: GetSymbolInfoRequest,
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """
    Get detailed information about a specific symbol.
    
    Returns:
    - Symbol definition and location
    - Usage locations
    - Parameter information (for functions)
    - Documentation
    """
    try:
        logger.info(f"Getting symbol info for: {request.symbol_name}")
        
        # Validate repository path
        if not Path(request.repo_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Repository path not found: {request.repo_path}"
            )
        
        # Perform symbol analysis
        result = await adapter.get_symbol_info(
            symbol_name=request.symbol_name,
            repo_path=request.repo_path,
            file_path=request.file_path
        )
        
        if not result.success:
            raise HTTPException(
                status_code=404,
                detail=f"Symbol not found: {result.error_message}"
            )
        
        return AnalysisResultResponse(
            success=result.success,
            analysis_type=AnalysisTypeEnum.SYMBOL_ANALYSIS,
            data=result.data,
            error_message=result.error_message,
            warnings=result.warnings,
            metadata=result.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in symbol analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/dependency-graph", response_model=AnalysisResultResponse)
async def get_dependency_graph(
    request: GetDependencyGraphRequest,
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """
    Generate dependency graph for the repository.
    
    Returns:
    - File-to-file dependencies
    - Import relationships
    - External dependencies
    """
    try:
        logger.info(f"Generating dependency graph for: {request.repo_path}")
        
        # Validate repository path
        if not Path(request.repo_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Repository path not found: {request.repo_path}"
            )
        
        # Generate dependency graph
        result = await adapter.get_dependency_graph(repo_path=request.repo_path)
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Dependency graph generation failed: {result.error_message}"
            )
        
        return AnalysisResultResponse(
            success=result.success,
            analysis_type=AnalysisTypeEnum.DEPENDENCY_GRAPH,
            data=result.data,
            error_message=result.error_message,
            warnings=result.warnings,
            metadata=result.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating dependency graph: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/structure-overview", response_model=AnalysisResultResponse)
async def get_structure_overview(
    repo_path: str = Query(..., description="Repository path to analyze"),
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """
    Get a high-level structure overview of the repository.
    
    Returns:
    - File type distribution
    - Directory structure
    - Top-level symbols
    - Language statistics
    """
    try:
        logger.info(f"Getting structure overview for: {repo_path}")
        
        # Validate repository path
        if not Path(repo_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Repository path not found: {repo_path}"
            )
        
        # Get structure overview
        result = await adapter.get_structure_overview(repo_path=repo_path)
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Structure overview failed: {result.error_message}"
            )
        
        return AnalysisResultResponse(
            success=result.success,
            analysis_type=AnalysisTypeEnum.STRUCTURE_OVERVIEW,
            data=result.data,
            error_message=result.error_message,
            warnings=result.warnings,
            metadata=result.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting structure overview: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/interactive", response_model=InteractiveAnalysisResponse)
async def interactive_analysis(
    request: InteractiveAnalysisRequest,
    visualization_service: VisualizationService = Depends(get_visualization_service)
):
    """
    Perform interactive analysis for visual repository exploration.
    
    Returns:
    - Visual graph representation
    - Interactive navigation data
    - Performance metrics
    """
    try:
        logger.info(f"Starting interactive analysis for: {request.repo_path}")
        
        # Validate repository path
        if not Path(request.repo_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Repository path not found: {request.repo_path}"
            )
        
        # Perform interactive analysis
        result = await visualization_service.generate_interactive_analysis(
            repo_path=request.repo_path,
            focus_path=request.focus_path,
            analysis_depth=request.analysis_depth,
            include_dependencies=request.include_dependencies,
            include_symbols=request.include_symbols,
            layout_type=request.layout_type
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in interactive analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/batch", response_model=BatchAnalysisResponse)
async def batch_analysis(
    request: BatchAnalysisRequest,
    background_tasks: BackgroundTasks,
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """
    Perform batch analysis of multiple repositories.
    
    Supports parallel processing and multiple analysis types.
    """
    try:
        logger.info(f"Starting batch analysis for {len(request.repositories)} repositories")
        
        # Validate repository paths
        invalid_repos = []
        for repo_path in request.repositories:
            if not Path(repo_path).exists():
                invalid_repos.append(repo_path)
        
        if invalid_repos:
            raise HTTPException(
                status_code=404,
                detail=f"Repository paths not found: {invalid_repos}"
            )
        
        # Perform batch analysis
        result = await analysis_service.batch_analyze(
            repositories=request.repositories,
            analysis_types=request.analysis_types,
            parallel_processing=request.parallel_processing,
            max_concurrent=request.max_concurrent
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """Get cache statistics and performance metrics."""
    try:
        stats = adapter.get_cache_stats()
        return CacheStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/cache")
async def clear_cache(
    adapter: GraphSitterAdapter = Depends(get_graph_sitter_adapter)
):
    """Clear all cached analysis data."""
    try:
        adapter.clear_cache()
        return {"message": "Cache cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for the analysis service."""
    try:
        # Check if graph-sitter is available
        if not _graph_sitter_adapter:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "message": "Graph-sitter adapter not initialized",
                    "timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC')
                }
            )
        
        return {
            "status": "healthy",
            "message": "Analysis service is operational",
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC'),
            "cache_stats": _graph_sitter_adapter.get_cache_stats()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "message": f"Health check failed: {str(e)}",
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC')
            }
        )
