"""
API Models for Graph-Sitter Analysis
Pydantic models for request/response schemas for repository analysis endpoints
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from datetime import datetime


class AnalysisTypeEnum(str, Enum):
    """Types of analysis that can be performed"""
    FULL_CODEBASE = "full_codebase"
    FILE_ANALYSIS = "file_analysis"
    SYMBOL_ANALYSIS = "symbol_analysis"
    DEPENDENCY_GRAPH = "dependency_graph"
    STRUCTURE_OVERVIEW = "structure_overview"
    IMPORT_ANALYSIS = "import_analysis"


class SymbolTypeEnum(str, Enum):
    """Types of code symbols"""
    FUNCTION = "function"
    CLASS = "class"
    VARIABLE = "variable"
    CONSTANT = "constant"
    METHOD = "method"
    PROPERTY = "property"


# Request Models

class AnalyzeCodebaseRequest(BaseModel):
    """Request model for codebase analysis"""
    repo_path: str = Field(..., description="Path to the repository to analyze")
    include_patterns: Optional[List[str]] = Field(
        None, 
        description="File patterns to include (e.g., ['*.py', '*.js'])",
        example=["*.py", "*.js", "*.ts"]
    )
    exclude_patterns: Optional[List[str]] = Field(
        None,
        description="File patterns to exclude (e.g., ['node_modules/*', '*.test.js'])",
        example=["node_modules/*", "*.test.js", "__pycache__/*"]
    )
    use_cache: bool = Field(True, description="Whether to use cached results if available")


class AnalyzeFileRequest(BaseModel):
    """Request model for single file analysis"""
    file_path: str = Field(..., description="Path to the file to analyze")
    repo_path: Optional[str] = Field(None, description="Optional repository path for context")
    include_symbols: bool = Field(True, description="Whether to include symbol analysis")
    include_dependencies: bool = Field(True, description="Whether to include dependency analysis")


class GetSymbolInfoRequest(BaseModel):
    """Request model for symbol information"""
    symbol_name: str = Field(..., description="Name of the symbol to analyze")
    repo_path: str = Field(..., description="Repository path for context")
    file_path: Optional[str] = Field(None, description="Optional specific file to search in")
    include_usages: bool = Field(True, description="Whether to include usage information")


class GetDependencyGraphRequest(BaseModel):
    """Request model for dependency graph generation"""
    repo_path: str = Field(..., description="Repository path to analyze")
    max_depth: Optional[int] = Field(None, description="Maximum depth for dependency traversal")
    include_external: bool = Field(True, description="Whether to include external dependencies")


# Response Models

class SymbolInfoResponse(BaseModel):
    """Response model for symbol information"""
    name: str
    type: SymbolTypeEnum
    file_path: str
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    definition: Optional[str] = None
    usages: List[Dict[str, Any]] = []
    parameters: List[str] = []
    return_type: Optional[str] = None
    docstring: Optional[str] = None


class FileStructureResponse(BaseModel):
    """Response model for file structure information"""
    path: str
    language: str
    functions: List[SymbolInfoResponse]
    classes: List[SymbolInfoResponse]
    imports: List[Dict[str, str]]
    exports: List[Dict[str, str]]
    dependencies: List[str]
    lines_of_code: int
    complexity_score: float = 0.0


class CodebaseStructureResponse(BaseModel):
    """Response model for overall codebase structure"""
    total_files: int
    total_lines: int
    languages: Dict[str, int]
    file_structures: List[FileStructureResponse]
    dependency_graph: Dict[str, List[str]]
    symbol_index: Dict[str, SymbolInfoResponse]
    analysis_timestamp: str
    analysis_duration: float


class DependencyGraphResponse(BaseModel):
    """Response model for dependency graph"""
    dependency_graph: Dict[str, List[str]]
    import_graph: Dict[str, List[Dict[str, str]]]
    analysis_timestamp: str
    metadata: Dict[str, Any] = {}


class StructureOverviewResponse(BaseModel):
    """Response model for structure overview"""
    total_files: int
    file_types: Dict[str, int]
    directory_structure: Dict[str, Any]
    top_level_symbols: List[Dict[str, str]]
    analysis_timestamp: str
    languages_summary: Dict[str, int] = {}
    complexity_metrics: Dict[str, float] = {}


class AnalysisResultResponse(BaseModel):
    """Generic response model for analysis results"""
    success: bool
    analysis_type: AnalysisTypeEnum
    data: Union[
        CodebaseStructureResponse,
        FileStructureResponse,
        SymbolInfoResponse,
        DependencyGraphResponse,
        StructureOverviewResponse,
        Dict[str, Any]
    ]
    error_message: Optional[str] = None
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}


# Visual Interface Models

class VisualNodeResponse(BaseModel):
    """Response model for visual graph nodes"""
    id: str
    label: str
    type: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    metadata: Dict[str, Any] = {}


class VisualEdgeResponse(BaseModel):
    """Response model for visual graph edges"""
    source: str
    target: str
    type: str
    label: Optional[str] = None
    metadata: Dict[str, Any] = {}


class VisualGraphResponse(BaseModel):
    """Response model for visual repository structure graph"""
    nodes: List[VisualNodeResponse]
    edges: List[VisualEdgeResponse]
    layout_hints: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}


class InteractiveAnalysisRequest(BaseModel):
    """Request model for interactive analysis"""
    repo_path: str = Field(..., description="Repository path to analyze")
    focus_path: Optional[str] = Field(None, description="Specific path to focus on")
    analysis_depth: int = Field(2, description="Depth of analysis (1-5)", ge=1, le=5)
    include_dependencies: bool = Field(True, description="Include dependency relationships")
    include_symbols: bool = Field(True, description="Include symbol relationships")
    layout_type: str = Field("hierarchical", description="Graph layout type")


class InteractiveAnalysisResponse(BaseModel):
    """Response model for interactive analysis"""
    graph: VisualGraphResponse
    summary: StructureOverviewResponse
    navigation_hints: Dict[str, Any] = {}
    performance_metrics: Dict[str, float] = {}


# Cache and Performance Models

class CacheStatsResponse(BaseModel):
    """Response model for cache statistics"""
    analysis_cache_size: int
    codebase_cache_size: int
    cache_hit_rate: float = 0.0
    total_analyses: int = 0


class PerformanceMetricsResponse(BaseModel):
    """Response model for performance metrics"""
    analysis_duration: float
    files_analyzed: int
    symbols_indexed: int
    memory_usage: float = 0.0
    cache_efficiency: float = 0.0


# Error Models

class AnalysisErrorResponse(BaseModel):
    """Response model for analysis errors"""
    error_type: str
    error_message: str
    error_details: Dict[str, Any] = {}
    suggestions: List[str] = []
    timestamp: str


# Batch Analysis Models

class BatchAnalysisRequest(BaseModel):
    """Request model for batch analysis of multiple repositories"""
    repositories: List[str] = Field(..., description="List of repository paths to analyze")
    analysis_types: List[AnalysisTypeEnum] = Field(
        [AnalysisTypeEnum.STRUCTURE_OVERVIEW],
        description="Types of analysis to perform"
    )
    parallel_processing: bool = Field(True, description="Whether to process repositories in parallel")
    max_concurrent: int = Field(3, description="Maximum concurrent analyses", ge=1, le=10)


class BatchAnalysisResponse(BaseModel):
    """Response model for batch analysis results"""
    results: Dict[str, AnalysisResultResponse]
    summary: Dict[str, Any]
    failed_repositories: List[str] = []
    total_duration: float
    timestamp: str


# WebSocket Models for Real-time Updates

class AnalysisProgressUpdate(BaseModel):
    """Model for real-time analysis progress updates"""
    analysis_id: str
    progress_percentage: float
    current_stage: str
    files_processed: int
    total_files: int
    estimated_remaining: float = 0.0
    timestamp: str


class AnalysisCompletedEvent(BaseModel):
    """Model for analysis completion events"""
    analysis_id: str
    success: bool
    result: Optional[AnalysisResultResponse] = None
    error: Optional[AnalysisErrorResponse] = None
    timestamp: str
