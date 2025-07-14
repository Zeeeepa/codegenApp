"""
Analysis Service - Business logic for repository analysis operations
Provides high-level analysis operations and batch processing capabilities
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict

from app.services.adapters.graph_sitter_adapter import GraphSitterAdapter, AnalysisType
from app.models.api.analysis import (
    BatchAnalysisResponse, AnalysisResultResponse, AnalysisTypeEnum,
    PerformanceMetricsResponse
)

logger = logging.getLogger(__name__)


class AnalysisService:
    """
    High-level analysis service that orchestrates graph-sitter operations.
    
    Provides:
    - Batch analysis capabilities
    - Performance monitoring
    - Analysis result aggregation
    - Concurrent processing management
    """
    
    def __init__(self, graph_sitter_adapter: GraphSitterAdapter, max_workers: int = 4):
        """
        Initialize the analysis service.
        
        Args:
            graph_sitter_adapter: The graph-sitter adapter instance
            max_workers: Maximum number of worker threads for parallel processing
        """
        self.adapter = graph_sitter_adapter
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._analysis_stats = {
            "total_analyses": 0,
            "successful_analyses": 0,
            "failed_analyses": 0,
            "total_duration": 0.0
        }
    
    async def batch_analyze(
        self,
        repositories: List[str],
        analysis_types: List[AnalysisTypeEnum],
        parallel_processing: bool = True,
        max_concurrent: int = 3
    ) -> BatchAnalysisResponse:
        """
        Perform batch analysis of multiple repositories.
        
        Args:
            repositories: List of repository paths to analyze
            analysis_types: Types of analysis to perform on each repository
            parallel_processing: Whether to process repositories in parallel
            max_concurrent: Maximum number of concurrent analyses
            
        Returns:
            BatchAnalysisResponse with aggregated results
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting batch analysis of {len(repositories)} repositories")
            
            results = {}
            failed_repositories = []
            
            if parallel_processing:
                # Process repositories in parallel with concurrency limit
                semaphore = asyncio.Semaphore(max_concurrent)
                tasks = []
                
                for repo_path in repositories:
                    task = self._analyze_repository_with_semaphore(
                        semaphore, repo_path, analysis_types
                    )
                    tasks.append(task)
                
                # Wait for all tasks to complete
                task_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for i, result in enumerate(task_results):
                    repo_path = repositories[i]
                    if isinstance(result, Exception):
                        logger.error(f"Failed to analyze {repo_path}: {result}")
                        failed_repositories.append(repo_path)
                    else:
                        results[repo_path] = result
            else:
                # Process repositories sequentially
                for repo_path in repositories:
                    try:
                        result = await self._analyze_repository(repo_path, analysis_types)
                        results[repo_path] = result
                    except Exception as e:
                        logger.error(f"Failed to analyze {repo_path}: {e}")
                        failed_repositories.append(repo_path)
            
            # Generate summary
            summary = self._generate_batch_summary(results, failed_repositories)
            
            total_duration = time.time() - start_time
            
            # Update statistics
            self._analysis_stats["total_analyses"] += len(repositories)
            self._analysis_stats["successful_analyses"] += len(results)
            self._analysis_stats["failed_analyses"] += len(failed_repositories)
            self._analysis_stats["total_duration"] += total_duration
            
            return BatchAnalysisResponse(
                results=results,
                summary=summary,
                failed_repositories=failed_repositories,
                total_duration=total_duration,
                timestamp=time.strftime('%Y-%m-%d %H:%M:%S UTC')
            )
            
        except Exception as e:
            logger.error(f"Error in batch analysis: {e}")
            raise
    
    async def get_performance_metrics(self) -> PerformanceMetricsResponse:
        """Get performance metrics for the analysis service."""
        cache_stats = self.adapter.get_cache_stats()
        
        avg_duration = (
            self._analysis_stats["total_duration"] / max(1, self._analysis_stats["total_analyses"])
        )
        
        success_rate = (
            self._analysis_stats["successful_analyses"] / max(1, self._analysis_stats["total_analyses"])
        )
        
        return PerformanceMetricsResponse(
            analysis_duration=avg_duration,
            files_analyzed=0,  # Would need to track this separately
            symbols_indexed=0,  # Would need to track this separately
            cache_efficiency=success_rate,
            memory_usage=0.0  # Would need to implement memory tracking
        )
    
    async def _analyze_repository_with_semaphore(
        self,
        semaphore: asyncio.Semaphore,
        repo_path: str,
        analysis_types: List[AnalysisTypeEnum]
    ) -> AnalysisResultResponse:
        """Analyze a repository with semaphore-controlled concurrency."""
        async with semaphore:
            return await self._analyze_repository(repo_path, analysis_types)
    
    async def _analyze_repository(
        self,
        repo_path: str,
        analysis_types: List[AnalysisTypeEnum]
    ) -> AnalysisResultResponse:
        """
        Analyze a single repository with multiple analysis types.
        
        Args:
            repo_path: Path to the repository
            analysis_types: List of analysis types to perform
            
        Returns:
            AnalysisResultResponse with combined results
        """
        logger.info(f"Analyzing repository: {repo_path}")
        
        combined_results = {}
        warnings = []
        metadata = {"repo_path": repo_path, "analysis_types": analysis_types}
        
        for analysis_type in analysis_types:
            try:
                if analysis_type == AnalysisTypeEnum.FULL_CODEBASE:
                    result = await self.adapter.analyze_codebase(repo_path)
                elif analysis_type == AnalysisTypeEnum.STRUCTURE_OVERVIEW:
                    result = await self.adapter.get_structure_overview(repo_path)
                elif analysis_type == AnalysisTypeEnum.DEPENDENCY_GRAPH:
                    result = await self.adapter.get_dependency_graph(repo_path)
                else:
                    warnings.append(f"Unsupported analysis type for batch processing: {analysis_type}")
                    continue
                
                if result.success:
                    combined_results[analysis_type.value] = result.data
                else:
                    warnings.append(f"Analysis failed for {analysis_type.value}: {result.error_message}")
                    
            except Exception as e:
                logger.error(f"Error in {analysis_type.value} analysis for {repo_path}: {e}")
                warnings.append(f"Exception in {analysis_type.value}: {str(e)}")
        
        # Determine overall success
        success = len(combined_results) > 0
        
        return AnalysisResultResponse(
            success=success,
            analysis_type=AnalysisTypeEnum.FULL_CODEBASE,  # Default for batch
            data=combined_results,
            warnings=warnings,
            metadata=metadata
        )
    
    def _generate_batch_summary(
        self,
        results: Dict[str, AnalysisResultResponse],
        failed_repositories: List[str]
    ) -> Dict[str, Any]:
        """Generate summary statistics for batch analysis results."""
        
        total_repos = len(results) + len(failed_repositories)
        successful_repos = len(results)
        
        # Aggregate language statistics
        language_stats = {}
        total_files = 0
        total_lines = 0
        
        for repo_path, result in results.items():
            if isinstance(result.data, dict):
                # Handle combined results from multiple analysis types
                for analysis_type, data in result.data.items():
                    if analysis_type == "full_codebase" and hasattr(data, 'languages'):
                        for lang, count in data.languages.items():
                            language_stats[lang] = language_stats.get(lang, 0) + count
                        total_files += getattr(data, 'total_files', 0)
                        total_lines += getattr(data, 'total_lines', 0)
                    elif analysis_type == "structure_overview" and isinstance(data, dict):
                        if 'file_types' in data:
                            for file_type, count in data['file_types'].items():
                                language_stats[file_type] = language_stats.get(file_type, 0) + count
                        total_files += data.get('total_files', 0)
        
        return {
            "total_repositories": total_repos,
            "successful_repositories": successful_repos,
            "failed_repositories": len(failed_repositories),
            "success_rate": successful_repos / max(1, total_repos),
            "language_distribution": language_stats,
            "total_files_analyzed": total_files,
            "total_lines_analyzed": total_lines,
            "analysis_timestamp": time.strftime('%Y-%m-%d %H:%M:%S UTC')
        }
    
    async def analyze_repository_interactive(
        self,
        repo_path: str,
        focus_areas: Optional[List[str]] = None,
        depth: int = 2
    ) -> Dict[str, Any]:
        """
        Perform interactive analysis optimized for visual exploration.
        
        Args:
            repo_path: Repository path to analyze
            focus_areas: Specific areas to focus on (files, directories, symbols)
            depth: Analysis depth level
            
        Returns:
            Dictionary with interactive analysis results
        """
        logger.info(f"Starting interactive analysis for: {repo_path}")
        
        # Start with structure overview for quick navigation
        overview_result = await self.adapter.get_structure_overview(repo_path)
        
        if not overview_result.success:
            raise Exception(f"Failed to get structure overview: {overview_result.error_message}")
        
        # Get dependency graph for relationship visualization
        deps_result = await self.adapter.get_dependency_graph(repo_path)
        
        # Prepare interactive data
        interactive_data = {
            "structure_overview": overview_result.data,
            "dependency_graph": deps_result.data if deps_result.success else {},
            "focus_areas": focus_areas or [],
            "analysis_depth": depth,
            "navigation_hints": self._generate_navigation_hints(overview_result.data),
            "performance_metrics": {
                "analysis_duration": getattr(overview_result.data, 'analysis_duration', 0),
                "cache_stats": self.adapter.get_cache_stats()
            }
        }
        
        return interactive_data
    
    def _generate_navigation_hints(self, structure_data: Any) -> Dict[str, Any]:
        """Generate navigation hints for interactive exploration."""
        hints = {
            "suggested_entry_points": [],
            "high_complexity_areas": [],
            "dependency_hotspots": [],
            "exploration_paths": []
        }
        
        if hasattr(structure_data, 'top_level_symbols'):
            # Suggest main entry points
            for symbol in structure_data.top_level_symbols[:5]:
                if symbol.get('name') in ['main', 'index', 'app', 'server']:
                    hints["suggested_entry_points"].append(symbol)
        
        if hasattr(structure_data, 'file_types'):
            # Suggest exploration paths based on file types
            for file_type, count in structure_data.file_types.items():
                if count > 10:  # Areas with many files
                    hints["exploration_paths"].append({
                        "type": "file_type",
                        "pattern": f"*{file_type}",
                        "count": count,
                        "description": f"Explore {count} {file_type} files"
                    })
        
        return hints
    
    def get_analysis_statistics(self) -> Dict[str, Any]:
        """Get overall analysis statistics."""
        return {
            **self._analysis_stats,
            "cache_stats": self.adapter.get_cache_stats(),
            "worker_pool_size": self.max_workers
        }
    
    def reset_statistics(self):
        """Reset analysis statistics."""
        self._analysis_stats = {
            "total_analyses": 0,
            "successful_analyses": 0,
            "failed_analyses": 0,
            "total_duration": 0.0
        }
        logger.info("Analysis statistics reset")
    
    def shutdown(self):
        """Shutdown the analysis service and cleanup resources."""
        self.executor.shutdown(wait=True)
        logger.info("Analysis service shutdown complete")
