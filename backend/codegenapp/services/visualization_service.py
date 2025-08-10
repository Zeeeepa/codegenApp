"""
Visualization Service - Generates visual representations of repository structures
Provides graph generation and layout algorithms for interactive repository exploration
"""

import logging
import time
from typing import Dict, List, Any, Optional, Tuple

from codegenapp.services.adapters.graph_sitter_adapter import GraphSitterAdapter
from codegenapp.models.api.analysis import (
    InteractiveAnalysisResponse, VisualGraphResponse, VisualNodeResponse,
    VisualEdgeResponse, StructureOverviewResponse
)

logger = logging.getLogger(__name__)


class VisualizationService:
    """
    Service for generating visual representations of repository structures.
    
    Provides:
    - Graph generation from analysis data
    - Layout algorithms for different visualization types
    - Interactive navigation support
    - Performance-optimized rendering data
    """
    
    def __init__(self, graph_sitter_adapter: GraphSitterAdapter):
        """
        Initialize the visualization service.
        
        Args:
            graph_sitter_adapter: The graph-sitter adapter instance
        """
        self.adapter = graph_sitter_adapter
        self._layout_algorithms = {
            "hierarchical": self._hierarchical_layout,
            "force_directed": self._force_directed_layout,
            "circular": self._circular_layout,
            "tree": self._tree_layout
        }
    
    async def generate_interactive_analysis(
        self,
        repo_path: str,
        focus_path: Optional[str] = None,
        analysis_depth: int = 2,
        include_dependencies: bool = True,
        include_symbols: bool = True,
        layout_type: str = "hierarchical"
    ) -> InteractiveAnalysisResponse:
        """
        Generate interactive analysis data for visual repository exploration.
        
        Args:
            repo_path: Repository path to analyze
            focus_path: Specific path to focus on
            analysis_depth: Depth of analysis (1-5)
            include_dependencies: Include dependency relationships
            include_symbols: Include symbol relationships
            layout_type: Graph layout algorithm to use
            
        Returns:
            InteractiveAnalysisResponse with visual graph and metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Generating interactive analysis for: {repo_path}")
            
            # Get structure overview
            overview_result = await self.adapter.get_structure_overview(repo_path)
            if not overview_result.success:
                raise Exception(f"Failed to get structure overview: {overview_result.error_message}")
            
            # Get dependency graph if requested
            dependency_data = {}
            if include_dependencies:
                deps_result = await self.adapter.get_dependency_graph(repo_path)
                if deps_result.success:
                    dependency_data = deps_result.data
            
            # Generate visual graph
            visual_graph = await self._generate_visual_graph(
                overview_result.data,
                dependency_data,
                focus_path,
                analysis_depth,
                include_symbols,
                layout_type
            )
            
            # Generate navigation hints
            navigation_hints = self._generate_navigation_hints(
                overview_result.data,
                dependency_data,
                focus_path
            )
            
            # Calculate performance metrics
            analysis_duration = time.time() - start_time
            performance_metrics = {
                "analysis_duration": analysis_duration,
                "nodes_generated": len(visual_graph.nodes),
                "edges_generated": len(visual_graph.edges),
                "layout_algorithm": layout_type,
                "cache_efficiency": self._calculate_cache_efficiency()
            }
            
            return InteractiveAnalysisResponse(
                graph=visual_graph,
                summary=self._convert_to_structure_overview_response(overview_result.data),
                navigation_hints=navigation_hints,
                performance_metrics=performance_metrics
            )
            
        except Exception as e:
            logger.error(f"Error generating interactive analysis: {e}")
            raise
    
    async def _generate_visual_graph(
        self,
        structure_data: Any,
        dependency_data: Dict[str, Any],
        focus_path: Optional[str],
        depth: int,
        include_symbols: bool,
        layout_type: str
    ) -> VisualGraphResponse:
        """Generate visual graph from analysis data."""
        
        nodes = []
        edges = []
        
        # Generate file nodes
        if hasattr(structure_data, 'directory_structure'):
            file_nodes, file_edges = self._generate_file_nodes(
                structure_data.directory_structure,
                focus_path,
                depth
            )
            nodes.extend(file_nodes)
            edges.extend(file_edges)
        
        # Generate symbol nodes if requested
        if include_symbols and hasattr(structure_data, 'top_level_symbols'):
            symbol_nodes, symbol_edges = self._generate_symbol_nodes(
                structure_data.top_level_symbols,
                focus_path
            )
            nodes.extend(symbol_nodes)
            edges.extend(symbol_edges)
        
        # Generate dependency edges
        if dependency_data and 'dependency_graph' in dependency_data:
            dep_edges = self._generate_dependency_edges(
                dependency_data['dependency_graph'],
                [node.id for node in nodes]
            )
            edges.extend(dep_edges)
        
        # Apply layout algorithm
        layout_hints = self._apply_layout_algorithm(nodes, edges, layout_type)
        
        return VisualGraphResponse(
            nodes=nodes,
            edges=edges,
            layout_hints=layout_hints,
            metadata={
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "layout_type": layout_type,
                "focus_path": focus_path,
                "analysis_depth": depth
            }
        )
    
    def _generate_file_nodes(
        self,
        directory_structure: Dict[str, Any],
        focus_path: Optional[str],
        depth: int,
        current_path: str = "",
        current_depth: int = 0
    ) -> Tuple[List[VisualNodeResponse], List[VisualEdgeResponse]]:
        """Generate nodes and edges for file structure."""
        
        nodes = []
        edges = []
        
        if current_depth >= depth:
            return nodes, edges
        
        for name, content in directory_structure.items():
            node_path = f"{current_path}/{name}" if current_path else name
            node_id = f"file_{node_path.replace('/', '_')}"
            
            # Determine node type
            if isinstance(content, dict) and content:
                node_type = "directory"
            else:
                node_type = "file"
            
            # Create node
            node = VisualNodeResponse(
                id=node_id,
                label=name,
                type=node_type,
                file_path=node_path,
                metadata={
                    "depth": current_depth,
                    "is_focus": focus_path and node_path.startswith(focus_path),
                    "size": len(content) if isinstance(content, dict) else 1
                }
            )
            nodes.append(node)
            
            # Create edge to parent
            if current_path:
                parent_id = f"file_{current_path.replace('/', '_')}"
                edge = VisualEdgeResponse(
                    source=parent_id,
                    target=node_id,
                    type="contains",
                    label="contains"
                )
                edges.append(edge)
            
            # Recursively process subdirectories
            if isinstance(content, dict) and content:
                child_nodes, child_edges = self._generate_file_nodes(
                    content,
                    focus_path,
                    depth,
                    node_path,
                    current_depth + 1
                )
                nodes.extend(child_nodes)
                edges.extend(child_edges)
        
        return nodes, edges
    
    def _generate_symbol_nodes(
        self,
        symbols: List[Dict[str, str]],
        focus_path: Optional[str]
    ) -> Tuple[List[VisualNodeResponse], List[VisualEdgeResponse]]:
        """Generate nodes and edges for symbols."""
        
        nodes = []
        edges = []
        
        for symbol in symbols:
            symbol_id = f"symbol_{symbol['name']}_{symbol['file']}"
            file_id = f"file_{symbol['file'].replace('/', '_')}"
            
            # Create symbol node
            node = VisualNodeResponse(
                id=symbol_id,
                label=symbol['name'],
                type=f"symbol_{symbol['type']}",
                file_path=symbol['file'],
                metadata={
                    "symbol_type": symbol['type'],
                    "is_focus": focus_path and symbol['file'].startswith(focus_path)
                }
            )
            nodes.append(node)
            
            # Create edge from file to symbol
            edge = VisualEdgeResponse(
                source=file_id,
                target=symbol_id,
                type="defines",
                label="defines"
            )
            edges.append(edge)
        
        return nodes, edges
    
    def _generate_dependency_edges(
        self,
        dependency_graph: Dict[str, List[str]],
        existing_node_ids: List[str]
    ) -> List[VisualEdgeResponse]:
        """Generate edges for dependencies."""
        
        edges = []
        
        for source_file, dependencies in dependency_graph.items():
            source_id = f"file_{source_file.replace('/', '_')}"
            
            if source_id not in existing_node_ids:
                continue
            
            for dep in dependencies:
                target_id = f"file_{dep.replace('/', '_')}"
                
                if target_id in existing_node_ids:
                    edge = VisualEdgeResponse(
                        source=source_id,
                        target=target_id,
                        type="depends_on",
                        label="imports",
                        metadata={"dependency": dep}
                    )
                    edges.append(edge)
        
        return edges
    
    def _apply_layout_algorithm(
        self,
        nodes: List[VisualNodeResponse],
        edges: List[VisualEdgeResponse],
        layout_type: str
    ) -> Dict[str, Any]:
        """Apply layout algorithm and return layout hints."""
        
        if layout_type in self._layout_algorithms:
            return self._layout_algorithms[layout_type](nodes, edges)
        else:
            logger.warning(f"Unknown layout type: {layout_type}, using hierarchical")
            return self._hierarchical_layout(nodes, edges)
    
    def _hierarchical_layout(
        self,
        nodes: List[VisualNodeResponse],
        edges: List[VisualEdgeResponse]
    ) -> Dict[str, Any]:
        """Generate hierarchical layout hints."""
        
        # Group nodes by depth/type
        levels = {}
        for node in nodes:
            depth = node.metadata.get("depth", 0)
            if depth not in levels:
                levels[depth] = []
            levels[depth].append(node.id)
        
        return {
            "algorithm": "hierarchical",
            "levels": levels,
            "direction": "top-down",
            "spacing": {
                "node": 100,
                "level": 150
            },
            "suggested_viewport": {
                "width": max(1200, len(nodes) * 50),
                "height": max(800, len(levels) * 150)
            }
        }
    
    def _force_directed_layout(
        self,
        nodes: List[VisualNodeResponse],
        edges: List[VisualEdgeResponse]
    ) -> Dict[str, Any]:
        """Generate force-directed layout hints."""
        
        return {
            "algorithm": "force_directed",
            "forces": {
                "repulsion": 1000,
                "attraction": 0.1,
                "gravity": 0.01
            },
            "iterations": 100,
            "suggested_viewport": {
                "width": 1200,
                "height": 800
            }
        }
    
    def _circular_layout(
        self,
        nodes: List[VisualNodeResponse],
        edges: List[VisualEdgeResponse]
    ) -> Dict[str, Any]:
        """Generate circular layout hints."""
        
        return {
            "algorithm": "circular",
            "radius": max(200, len(nodes) * 10),
            "center": {"x": 400, "y": 400},
            "suggested_viewport": {
                "width": 800,
                "height": 800
            }
        }
    
    def _tree_layout(
        self,
        nodes: List[VisualNodeResponse],
        edges: List[VisualEdgeResponse]
    ) -> Dict[str, Any]:
        """Generate tree layout hints."""
        
        # Find root nodes (nodes with no incoming edges)
        incoming_edges = set()
        for edge in edges:
            incoming_edges.add(edge.target)
        
        root_nodes = [node.id for node in nodes if node.id not in incoming_edges]
        
        return {
            "algorithm": "tree",
            "roots": root_nodes,
            "orientation": "vertical",
            "spacing": {
                "sibling": 100,
                "level": 150
            },
            "suggested_viewport": {
                "width": max(1000, len(nodes) * 80),
                "height": 600
            }
        }
    
    def _generate_navigation_hints(
        self,
        structure_data: Any,
        dependency_data: Dict[str, Any],
        focus_path: Optional[str]
    ) -> Dict[str, Any]:
        """Generate navigation hints for interactive exploration."""
        
        hints = {
            "suggested_focus_areas": [],
            "complexity_hotspots": [],
            "entry_points": [],
            "exploration_suggestions": []
        }
        
        # Suggest focus areas based on file types
        if hasattr(structure_data, 'file_types'):
            for file_type, count in structure_data.file_types.items():
                if count > 5:
                    hints["suggested_focus_areas"].append({
                        "type": "file_type",
                        "pattern": f"*{file_type}",
                        "count": count,
                        "description": f"Focus on {count} {file_type} files"
                    })
        
        # Identify complexity hotspots
        if hasattr(structure_data, 'top_level_symbols'):
            file_symbol_counts = {}
            for symbol in structure_data.top_level_symbols:
                file_path = symbol.get('file', '')
                file_symbol_counts[file_path] = file_symbol_counts.get(file_path, 0) + 1
            
            # Files with many symbols might be complex
            for file_path, count in file_symbol_counts.items():
                if count > 10:
                    hints["complexity_hotspots"].append({
                        "file": file_path,
                        "symbol_count": count,
                        "reason": "High symbol density"
                    })
        
        # Suggest entry points
        if hasattr(structure_data, 'top_level_symbols'):
            for symbol in structure_data.top_level_symbols:
                if symbol.get('name') in ['main', 'index', 'app', 'server', 'init']:
                    hints["entry_points"].append({
                        "symbol": symbol['name'],
                        "file": symbol['file'],
                        "type": symbol['type']
                    })
        
        # Generate exploration suggestions
        hints["exploration_suggestions"] = [
            "Start with entry points to understand the application flow",
            "Examine complexity hotspots for potential refactoring opportunities",
            "Follow dependency chains to understand module relationships",
            "Focus on specific file types to understand architectural patterns"
        ]
        
        return hints
    
    def _convert_to_structure_overview_response(self, data: Any) -> StructureOverviewResponse:
        """Convert structure data to response model."""
        
        if isinstance(data, dict):
            return StructureOverviewResponse(
                total_files=data.get('total_files', 0),
                file_types=data.get('file_types', {}),
                directory_structure=data.get('directory_structure', {}),
                top_level_symbols=data.get('top_level_symbols', []),
                analysis_timestamp=data.get('analysis_timestamp', ''),
                languages_summary=data.get('file_types', {}),
                complexity_metrics={}
            )
        else:
            # Handle dataclass or object
            return StructureOverviewResponse(
                total_files=getattr(data, 'total_files', 0),
                file_types=getattr(data, 'file_types', {}),
                directory_structure=getattr(data, 'directory_structure', {}),
                top_level_symbols=getattr(data, 'top_level_symbols', []),
                analysis_timestamp=getattr(data, 'analysis_timestamp', ''),
                languages_summary=getattr(data, 'file_types', {}),
                complexity_metrics={}
            )
    
    def _calculate_cache_efficiency(self) -> float:
        """Calculate cache efficiency metric."""
        cache_stats = self.adapter.get_cache_stats()
        total_cache_size = cache_stats.get("analysis_cache_size", 0) + cache_stats.get("codebase_cache_size", 0)
        
        # Simple efficiency metric based on cache utilization
        if total_cache_size > 0:
            return min(1.0, total_cache_size / 100.0)  # Normalize to 0-1
        return 0.0
    
    async def generate_dependency_visualization(
        self,
        repo_path: str,
        max_depth: int = 3,
        include_external: bool = False
    ) -> VisualGraphResponse:
        """Generate specialized dependency visualization."""
        
        logger.info(f"Generating dependency visualization for: {repo_path}")
        
        # Get dependency graph
        deps_result = await self.adapter.get_dependency_graph(repo_path)
        if not deps_result.success:
            raise Exception(f"Failed to get dependency graph: {deps_result.error_message}")
        
        dependency_data = deps_result.data
        nodes = []
        edges = []
        
        # Generate nodes for each file
        if 'dependency_graph' in dependency_data:
            all_files = set()
            for source, targets in dependency_data['dependency_graph'].items():
                all_files.add(source)
                all_files.update(targets)
            
            for file_path in all_files:
                if not include_external and file_path.startswith('external:'):
                    continue
                
                node_id = f"dep_{file_path.replace('/', '_')}"
                node = VisualNodeResponse(
                    id=node_id,
                    label=file_path.split('/')[-1],  # Just filename
                    type="dependency_file",
                    file_path=file_path,
                    metadata={
                        "full_path": file_path,
                        "is_external": file_path.startswith('external:')
                    }
                )
                nodes.append(node)
            
            # Generate dependency edges
            for source, targets in dependency_data['dependency_graph'].items():
                if not include_external and source.startswith('external:'):
                    continue
                
                source_id = f"dep_{source.replace('/', '_')}"
                
                for target in targets:
                    if not include_external and target.startswith('external:'):
                        continue
                    
                    target_id = f"dep_{target.replace('/', '_')}"
                    
                    edge = VisualEdgeResponse(
                        source=source_id,
                        target=target_id,
                        type="dependency",
                        label="depends on"
                    )
                    edges.append(edge)
        
        # Apply force-directed layout for dependencies
        layout_hints = self._force_directed_layout(nodes, edges)
        
        return VisualGraphResponse(
            nodes=nodes,
            edges=edges,
            layout_hints=layout_hints,
            metadata={
                "visualization_type": "dependency_graph",
                "max_depth": max_depth,
                "include_external": include_external,
                "total_dependencies": len(edges)
            }
        )
