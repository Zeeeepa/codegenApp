"""
Graph-Sitter Adapter - Comprehensive code analysis and repository structure analysis
This adapter provides full integration with the graph-sitter library for advanced
code analysis, symbol resolution, and visual repository structure capabilities.
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Union
from dataclasses import dataclass, asdict
from enum import Enum
import json
import time

try:
    from graph_sitter import Codebase
    from graph_sitter.core.class_definition import Class
    from graph_sitter.core.file import SourceFile
    from graph_sitter.core.function import Function
    from graph_sitter.core.symbol import Symbol
    from graph_sitter.core.import_resolution import Import
    from graph_sitter.core.external_module import ExternalModule
    from graph_sitter.enums import EdgeType, SymbolType
    GRAPH_SITTER_AVAILABLE = True
except ImportError:
    GRAPH_SITTER_AVAILABLE = False

logger = logging.getLogger(__name__)


class AnalysisType(Enum):
    """Types of analysis that can be performed"""
    FULL_CODEBASE = "full_codebase"
    FILE_ANALYSIS = "file_analysis"
    SYMBOL_ANALYSIS = "symbol_analysis"
    DEPENDENCY_GRAPH = "dependency_graph"
    STRUCTURE_OVERVIEW = "structure_overview"
    IMPORT_ANALYSIS = "import_analysis"


@dataclass
class SymbolInfo:
    """Information about a code symbol"""
    name: str
    type: str
    file_path: str
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    definition: Optional[str] = None
    usages: List[Dict[str, Any]] = None
    parameters: List[str] = None
    return_type: Optional[str] = None
    docstring: Optional[str] = None
    
    def __post_init__(self):
        if self.usages is None:
            self.usages = []
        if self.parameters is None:
            self.parameters = []


@dataclass
class FileStructure:
    """Structure information for a source file"""
    path: str
    language: str
    functions: List[SymbolInfo]
    classes: List[SymbolInfo]
    imports: List[Dict[str, str]]
    exports: List[Dict[str, str]]
    dependencies: List[str]
    lines_of_code: int
    complexity_score: float = 0.0
    
    def __post_init__(self):
        if self.functions is None:
            self.functions = []
        if self.classes is None:
            self.classes = []
        if self.imports is None:
            self.imports = []
        if self.exports is None:
            self.exports = []
        if self.dependencies is None:
            self.dependencies = []


@dataclass
class CodebaseStructure:
    """Overall codebase structure information"""
    total_files: int
    total_lines: int
    languages: Dict[str, int]
    file_structures: List[FileStructure]
    dependency_graph: Dict[str, List[str]]
    symbol_index: Dict[str, SymbolInfo]
    analysis_timestamp: str
    analysis_duration: float
    
    def __post_init__(self):
        if self.languages is None:
            self.languages = {}
        if self.file_structures is None:
            self.file_structures = []
        if self.dependency_graph is None:
            self.dependency_graph = {}
        if self.symbol_index is None:
            self.symbol_index = {}


@dataclass
class AnalysisResult:
    """Result of a graph-sitter analysis operation"""
    success: bool
    analysis_type: AnalysisType
    data: Union[CodebaseStructure, FileStructure, SymbolInfo, Dict[str, Any]]
    error_message: Optional[str] = None
    warnings: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
        if self.metadata is None:
            self.metadata = {}


class GraphSitterAdapter:
    """
    Comprehensive Graph-Sitter adapter for code analysis and repository structure analysis.
    
    This adapter provides:
    - Full codebase analysis and indexing
    - Symbol resolution and navigation
    - Dependency graph generation
    - File structure analysis
    - Import/export tracking
    - Visual repository structure data
    """
    
    def __init__(self, cache_enabled: bool = True, max_file_size: int = 1024 * 1024):
        """
        Initialize the Graph-Sitter adapter.
        
        Args:
            cache_enabled: Whether to enable caching of analysis results
            max_file_size: Maximum file size to analyze (in bytes)
        """
        self.cache_enabled = cache_enabled
        self.max_file_size = max_file_size
        self._cache: Dict[str, Any] = {}
        self._codebase_cache: Dict[str, Codebase] = {}
        
        if not GRAPH_SITTER_AVAILABLE:
            logger.error("Graph-sitter is not available. Please install it with: pip install graph-sitter")
            raise ImportError("Graph-sitter is required but not available")
    
    async def analyze_codebase(
        self, 
        repo_path: str, 
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None
    ) -> AnalysisResult:
        """
        Perform comprehensive codebase analysis.
        
        Args:
            repo_path: Path to the repository to analyze
            include_patterns: File patterns to include (e.g., ['*.py', '*.js'])
            exclude_patterns: File patterns to exclude (e.g., ['node_modules/*', '*.test.js'])
            
        Returns:
            AnalysisResult containing CodebaseStructure
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting codebase analysis for: {repo_path}")
            
            # Check cache first
            cache_key = f"codebase_{repo_path}_{hash(str(include_patterns))}_{hash(str(exclude_patterns))}"
            if self.cache_enabled and cache_key in self._cache:
                logger.info("Returning cached codebase analysis")
                return self._cache[cache_key]
            
            # Initialize codebase
            codebase = await self._get_or_create_codebase(repo_path)
            
            # Analyze all files
            file_structures = []
            total_lines = 0
            languages = {}
            dependency_graph = {}
            symbol_index = {}
            
            for source_file in codebase.files:
                if not self._should_analyze_file(source_file, include_patterns, exclude_patterns):
                    continue
                
                file_analysis = await self._analyze_file(source_file)
                if file_analysis.success:
                    file_structure = file_analysis.data
                    file_structures.append(file_structure)
                    
                    # Update statistics
                    total_lines += file_structure.lines_of_code
                    languages[file_structure.language] = languages.get(file_structure.language, 0) + 1
                    
                    # Build dependency graph
                    dependency_graph[file_structure.path] = file_structure.dependencies
                    
                    # Index symbols
                    for symbol in file_structure.functions + file_structure.classes:
                        symbol_index[f"{file_structure.path}::{symbol.name}"] = symbol
            
            # Create codebase structure
            structure = CodebaseStructure(
                total_files=len(file_structures),
                total_lines=total_lines,
                languages=languages,
                file_structures=file_structures,
                dependency_graph=dependency_graph,
                symbol_index=symbol_index,
                analysis_timestamp=time.strftime('%Y-%m-%d %H:%M:%S UTC'),
                analysis_duration=time.time() - start_time
            )
            
            result = AnalysisResult(
                success=True,
                analysis_type=AnalysisType.FULL_CODEBASE,
                data=structure,
                metadata={
                    "repo_path": repo_path,
                    "include_patterns": include_patterns,
                    "exclude_patterns": exclude_patterns
                }
            )
            
            # Cache result
            if self.cache_enabled:
                self._cache[cache_key] = result
            
            logger.info(f"Codebase analysis completed in {result.data.analysis_duration:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing codebase: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.FULL_CODEBASE,
                data={},
                error_message=str(e)
            )
    
    async def analyze_file(self, file_path: str, repo_path: Optional[str] = None) -> AnalysisResult:
        """
        Analyze a specific file.
        
        Args:
            file_path: Path to the file to analyze
            repo_path: Optional repository path for context
            
        Returns:
            AnalysisResult containing FileStructure
        """
        try:
            logger.info(f"Analyzing file: {file_path}")
            
            # Get codebase context if available
            codebase = None
            if repo_path:
                codebase = await self._get_or_create_codebase(repo_path)
            
            # Find the source file
            source_file = None
            if codebase:
                for file in codebase.files:
                    if str(file.path).endswith(file_path) or str(file.path) == file_path:
                        source_file = file
                        break
            
            if not source_file:
                # Try to create a standalone file analysis
                if Path(file_path).exists():
                    # Create minimal codebase for single file
                    temp_codebase = Codebase(str(Path(file_path).parent))
                    for file in temp_codebase.files:
                        if str(file.path) == file_path:
                            source_file = file
                            break
            
            if not source_file:
                raise FileNotFoundError(f"Could not find or analyze file: {file_path}")
            
            return await self._analyze_file(source_file)
            
        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.FILE_ANALYSIS,
                data={},
                error_message=str(e)
            )
    
    async def get_symbol_info(
        self, 
        symbol_name: str, 
        repo_path: str,
        file_path: Optional[str] = None
    ) -> AnalysisResult:
        """
        Get detailed information about a specific symbol.
        
        Args:
            symbol_name: Name of the symbol to analyze
            repo_path: Repository path for context
            file_path: Optional specific file to search in
            
        Returns:
            AnalysisResult containing SymbolInfo
        """
        try:
            logger.info(f"Getting symbol info for: {symbol_name}")
            
            codebase = await self._get_or_create_codebase(repo_path)
            
            # Search for symbol
            symbol_info = None
            
            # If file_path is specified, search in that file first
            if file_path:
                source_file = self._find_source_file(codebase, file_path)
                if source_file:
                    symbol_info = await self._find_symbol_in_file(source_file, symbol_name)
            
            # If not found, search across all files
            if not symbol_info:
                for source_file in codebase.files:
                    symbol_info = await self._find_symbol_in_file(source_file, symbol_name)
                    if symbol_info:
                        break
            
            if not symbol_info:
                raise ValueError(f"Symbol '{symbol_name}' not found in codebase")
            
            return AnalysisResult(
                success=True,
                analysis_type=AnalysisType.SYMBOL_ANALYSIS,
                data=symbol_info,
                metadata={
                    "symbol_name": symbol_name,
                    "repo_path": repo_path,
                    "file_path": file_path
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting symbol info for {symbol_name}: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.SYMBOL_ANALYSIS,
                data={},
                error_message=str(e)
            )
    
    async def get_dependency_graph(self, repo_path: str) -> AnalysisResult:
        """
        Generate dependency graph for the repository.
        
        Args:
            repo_path: Repository path to analyze
            
        Returns:
            AnalysisResult containing dependency graph data
        """
        try:
            logger.info(f"Generating dependency graph for: {repo_path}")
            
            codebase = await self._get_or_create_codebase(repo_path)
            
            dependency_graph = {}
            import_graph = {}
            
            for source_file in codebase.files:
                file_path = str(source_file.path)
                dependencies = []
                imports = []
                
                # Analyze imports
                if hasattr(source_file, 'imports'):
                    for import_obj in source_file.imports:
                        if hasattr(import_obj, 'module_name'):
                            imports.append({
                                "module": import_obj.module_name,
                                "type": "import"
                            })
                            dependencies.append(import_obj.module_name)
                
                dependency_graph[file_path] = dependencies
                import_graph[file_path] = imports
            
            graph_data = {
                "dependency_graph": dependency_graph,
                "import_graph": import_graph,
                "analysis_timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC')
            }
            
            return AnalysisResult(
                success=True,
                analysis_type=AnalysisType.DEPENDENCY_GRAPH,
                data=graph_data,
                metadata={"repo_path": repo_path}
            )
            
        except Exception as e:
            logger.error(f"Error generating dependency graph: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.DEPENDENCY_GRAPH,
                data={},
                error_message=str(e)
            )
    
    async def get_structure_overview(self, repo_path: str) -> AnalysisResult:
        """
        Get a high-level structure overview of the repository.
        
        Args:
            repo_path: Repository path to analyze
            
        Returns:
            AnalysisResult containing structure overview
        """
        try:
            logger.info(f"Getting structure overview for: {repo_path}")
            
            codebase = await self._get_or_create_codebase(repo_path)
            
            overview = {
                "total_files": len(codebase.files),
                "file_types": {},
                "directory_structure": {},
                "top_level_symbols": [],
                "analysis_timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC')
            }
            
            # Analyze file types and directory structure
            for source_file in codebase.files:
                file_path = Path(source_file.path)
                
                # File type analysis
                extension = file_path.suffix
                overview["file_types"][extension] = overview["file_types"].get(extension, 0) + 1
                
                # Directory structure
                parts = file_path.parts
                current_level = overview["directory_structure"]
                for part in parts[:-1]:  # Exclude filename
                    if part not in current_level:
                        current_level[part] = {}
                    current_level = current_level[part]
                
                # Top-level symbols (functions and classes)
                if hasattr(source_file, 'functions'):
                    for func in source_file.functions:
                        overview["top_level_symbols"].append({
                            "name": func.name,
                            "type": "function",
                            "file": str(source_file.path)
                        })
                
                if hasattr(source_file, 'classes'):
                    for cls in source_file.classes:
                        overview["top_level_symbols"].append({
                            "name": cls.name,
                            "type": "class",
                            "file": str(source_file.path)
                        })
            
            return AnalysisResult(
                success=True,
                analysis_type=AnalysisType.STRUCTURE_OVERVIEW,
                data=overview,
                metadata={"repo_path": repo_path}
            )
            
        except Exception as e:
            logger.error(f"Error getting structure overview: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.STRUCTURE_OVERVIEW,
                data={},
                error_message=str(e)
            )
    
    # Private helper methods
    
    async def _get_or_create_codebase(self, repo_path: str) -> Codebase:
        """Get or create a codebase instance with caching."""
        if repo_path in self._codebase_cache:
            return self._codebase_cache[repo_path]
        
        codebase = Codebase(repo_path)
        if self.cache_enabled:
            self._codebase_cache[repo_path] = codebase
        
        return codebase
    
    def _should_analyze_file(
        self, 
        source_file: SourceFile, 
        include_patterns: Optional[List[str]], 
        exclude_patterns: Optional[List[str]]
    ) -> bool:
        """Determine if a file should be analyzed based on patterns."""
        file_path = str(source_file.path)
        
        # Check file size
        try:
            if Path(file_path).stat().st_size > self.max_file_size:
                return False
        except (OSError, FileNotFoundError):
            return False
        
        # Check exclude patterns
        if exclude_patterns:
            for pattern in exclude_patterns:
                if self._matches_pattern(file_path, pattern):
                    return False
        
        # Check include patterns
        if include_patterns:
            for pattern in include_patterns:
                if self._matches_pattern(file_path, pattern):
                    return True
            return False
        
        return True
    
    def _matches_pattern(self, file_path: str, pattern: str) -> bool:
        """Simple pattern matching for file paths."""
        import fnmatch
        return fnmatch.fnmatch(file_path, pattern)
    
    async def _analyze_file(self, source_file: SourceFile) -> AnalysisResult:
        """Analyze a single source file."""
        try:
            file_path = str(source_file.path)
            
            # Extract basic information
            functions = []
            classes = []
            imports = []
            exports = []
            dependencies = []
            
            # Analyze functions
            if hasattr(source_file, 'functions'):
                for func in source_file.functions:
                    func_info = SymbolInfo(
                        name=func.name,
                        type="function",
                        file_path=file_path,
                        line_number=getattr(func, 'line_number', None),
                        parameters=getattr(func, 'parameters', []),
                        return_type=getattr(func, 'return_type', None),
                        docstring=getattr(func, 'docstring', None)
                    )
                    functions.append(func_info)
            
            # Analyze classes
            if hasattr(source_file, 'classes'):
                for cls in source_file.classes:
                    cls_info = SymbolInfo(
                        name=cls.name,
                        type="class",
                        file_path=file_path,
                        line_number=getattr(cls, 'line_number', None),
                        docstring=getattr(cls, 'docstring', None)
                    )
                    classes.append(cls_info)
            
            # Analyze imports
            if hasattr(source_file, 'imports'):
                for import_obj in source_file.imports:
                    import_info = {
                        "module": getattr(import_obj, 'module_name', ''),
                        "alias": getattr(import_obj, 'alias', None),
                        "type": "import"
                    }
                    imports.append(import_info)
                    dependencies.append(import_info["module"])
            
            # Calculate lines of code
            lines_of_code = 0
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines_of_code = len(f.readlines())
            except (OSError, UnicodeDecodeError):
                lines_of_code = 0
            
            # Determine language
            language = Path(file_path).suffix.lstrip('.')
            
            file_structure = FileStructure(
                path=file_path,
                language=language,
                functions=functions,
                classes=classes,
                imports=imports,
                exports=exports,
                dependencies=dependencies,
                lines_of_code=lines_of_code,
                complexity_score=len(functions) + len(classes)  # Simple complexity metric
            )
            
            return AnalysisResult(
                success=True,
                analysis_type=AnalysisType.FILE_ANALYSIS,
                data=file_structure
            )
            
        except Exception as e:
            logger.error(f"Error analyzing file {source_file.path}: {e}")
            return AnalysisResult(
                success=False,
                analysis_type=AnalysisType.FILE_ANALYSIS,
                data={},
                error_message=str(e)
            )
    
    def _find_source_file(self, codebase: Codebase, file_path: str) -> Optional[SourceFile]:
        """Find a source file in the codebase."""
        for source_file in codebase.files:
            if str(source_file.path).endswith(file_path) or str(source_file.path) == file_path:
                return source_file
        return None
    
    async def _find_symbol_in_file(self, source_file: SourceFile, symbol_name: str) -> Optional[SymbolInfo]:
        """Find a symbol in a specific file."""
        file_path = str(source_file.path)
        
        # Search in functions
        if hasattr(source_file, 'functions'):
            for func in source_file.functions:
                if func.name == symbol_name:
                    return SymbolInfo(
                        name=func.name,
                        type="function",
                        file_path=file_path,
                        line_number=getattr(func, 'line_number', None),
                        parameters=getattr(func, 'parameters', []),
                        return_type=getattr(func, 'return_type', None),
                        docstring=getattr(func, 'docstring', None)
                    )
        
        # Search in classes
        if hasattr(source_file, 'classes'):
            for cls in source_file.classes:
                if cls.name == symbol_name:
                    return SymbolInfo(
                        name=cls.name,
                        type="class",
                        file_path=file_path,
                        line_number=getattr(cls, 'line_number', None),
                        docstring=getattr(cls, 'docstring', None)
                    )
        
        return None
    
    def clear_cache(self):
        """Clear all cached data."""
        self._cache.clear()
        self._codebase_cache.clear()
        logger.info("Graph-sitter adapter cache cleared")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        return {
            "analysis_cache_size": len(self._cache),
            "codebase_cache_size": len(self._codebase_cache)
        }
