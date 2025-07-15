"""
CodegenApp Graph-Sitter Adapter
Advanced code analysis and manipulation using Tree-sitter with codemods support
"""

import asyncio
import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
import json
import hashlib

import tree_sitter
from tree_sitter import Language, Parser, Node

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.models.validation import GraphSitterAnalysisResult
from app.utils.exceptions import GraphSitterException

logger = get_logger(__name__)
settings = get_settings()


class LanguageAnalyzer:
    """
    Individual language analyzer using Tree-sitter
    
    Provides language-specific analysis capabilities including
    AST parsing, pattern matching, and code complexity analysis.
    """
    
    def __init__(self, language_name: str, parser: Parser):
        self.language_name = language_name
        self.parser = parser
        self.complexity_weights = {
            "function_definition": 1,
            "class_definition": 2,
            "if_statement": 1,
            "for_statement": 2,
            "while_statement": 2,
            "try_statement": 2,
            "lambda": 1,
            "nested_function": 3
        }
    
    def analyze_file(self, file_path: str, content: str) -> Dict[str, Any]:
        """
        Analyze individual file
        
        Args:
            file_path: Path to the file being analyzed
            content: File content as string
            
        Returns:
            Analysis results dictionary
        """
        try:
            # Parse content into AST
            tree = self.parser.parse(bytes(content, "utf8"))
            root_node = tree.root_node
            
            # Perform various analyses
            analysis = {
                "file_path": file_path,
                "language": self.language_name,
                "lines_of_code": len(content.split('\n')),
                "complexity_score": self._calculate_complexity(root_node),
                "functions": self._extract_functions(root_node, content),
                "classes": self._extract_classes(root_node, content),
                "imports": self._extract_imports(root_node, content),
                "potential_issues": self._find_potential_issues(root_node, content),
                "code_patterns": self._identify_patterns(root_node, content),
                "dependencies": self._analyze_dependencies(root_node, content)
            }
            
            return analysis
            
        except Exception as e:
            logger.error("File analysis failed", file_path=file_path, error=str(e))
            return {
                "file_path": file_path,
                "language": self.language_name,
                "error": str(e),
                "analysis_failed": True
            }
    
    def _calculate_complexity(self, node: Node) -> float:
        """Calculate cyclomatic complexity of code"""
        complexity = 0
        
        def traverse(node: Node, depth: int = 0):
            nonlocal complexity
            
            node_type = node.type
            
            # Add complexity based on node type
            if node_type in self.complexity_weights:
                weight = self.complexity_weights[node_type]
                # Increase weight for nested structures
                complexity += weight * (1 + depth * 0.1)
            
            # Recursively analyze children
            for child in node.children:
                traverse(child, depth + 1)
        
        traverse(node)
        return min(complexity / 10.0, 1.0)  # Normalize to 0-1 range
    
    def _extract_functions(self, node: Node, content: str) -> List[Dict[str, Any]]:
        """Extract function definitions and their metadata"""
        functions = []
        
        def find_functions(node: Node):
            if node.type in ["function_definition", "method_definition", "function_declaration"]:
                func_info = self._extract_function_info(node, content)
                if func_info:
                    functions.append(func_info)
            
            for child in node.children:
                find_functions(child)
        
        find_functions(node)
        return functions
    
    def _extract_function_info(self, node: Node, content: str) -> Optional[Dict[str, Any]]:
        """Extract detailed function information"""
        try:
            lines = content.split('\n')
            start_line = node.start_point[0]
            end_line = node.end_point[0]
            
            # Extract function name
            name_node = None
            for child in node.children:
                if child.type == "identifier":
                    name_node = child
                    break
            
            if not name_node:
                return None
            
            function_name = content[name_node.start_byte:name_node.end_byte]
            
            # Extract parameters
            parameters = self._extract_parameters(node, content)
            
            # Calculate function complexity
            func_complexity = self._calculate_complexity(node)
            
            return {
                "name": function_name,
                "start_line": start_line + 1,
                "end_line": end_line + 1,
                "parameters": parameters,
                "complexity": func_complexity,
                "lines_of_code": end_line - start_line + 1,
                "docstring": self._extract_docstring(node, content)
            }
            
        except Exception as e:
            logger.warning("Failed to extract function info", error=str(e))
            return None
    
    def _extract_parameters(self, func_node: Node, content: str) -> List[str]:
        """Extract function parameters"""
        parameters = []
        
        def find_parameters(node: Node):
            if node.type in ["parameter", "parameter_list", "formal_parameters"]:
                for child in node.children:
                    if child.type == "identifier":
                        param_name = content[child.start_byte:child.end_byte]
                        parameters.append(param_name)
                    else:
                        find_parameters(child)
            else:
                for child in node.children:
                    find_parameters(child)
        
        find_parameters(func_node)
        return parameters
    
    def _extract_classes(self, node: Node, content: str) -> List[Dict[str, Any]]:
        """Extract class definitions and their metadata"""
        classes = []
        
        def find_classes(node: Node):
            if node.type in ["class_definition", "class_declaration"]:
                class_info = self._extract_class_info(node, content)
                if class_info:
                    classes.append(class_info)
            
            for child in node.children:
                find_classes(child)
        
        find_classes(node)
        return classes
    
    def _extract_class_info(self, node: Node, content: str) -> Optional[Dict[str, Any]]:
        """Extract detailed class information"""
        try:
            start_line = node.start_point[0]
            end_line = node.end_point[0]
            
            # Extract class name
            name_node = None
            for child in node.children:
                if child.type == "identifier":
                    name_node = child
                    break
            
            if not name_node:
                return None
            
            class_name = content[name_node.start_byte:name_node.end_byte]
            
            # Extract methods
            methods = []
            for child in node.children:
                if child.type in ["function_definition", "method_definition"]:
                    method_info = self._extract_function_info(child, content)
                    if method_info:
                        methods.append(method_info)
            
            return {
                "name": class_name,
                "start_line": start_line + 1,
                "end_line": end_line + 1,
                "methods": methods,
                "lines_of_code": end_line - start_line + 1,
                "method_count": len(methods)
            }
            
        except Exception as e:
            logger.warning("Failed to extract class info", error=str(e))
            return None
    
    def _extract_imports(self, node: Node, content: str) -> List[Dict[str, Any]]:
        """Extract import statements"""
        imports = []
        
        def find_imports(node: Node):
            if node.type in ["import_statement", "import_from_statement", "include_statement"]:
                import_info = self._extract_import_info(node, content)
                if import_info:
                    imports.append(import_info)
            
            for child in node.children:
                find_imports(child)
        
        find_imports(node)
        return imports
    
    def _extract_import_info(self, node: Node, content: str) -> Optional[Dict[str, Any]]:
        """Extract import information"""
        try:
            import_text = content[node.start_byte:node.end_byte]
            
            return {
                "statement": import_text.strip(),
                "line": node.start_point[0] + 1,
                "type": node.type
            }
            
        except Exception as e:
            logger.warning("Failed to extract import info", error=str(e))
            return None
    
    def _find_potential_issues(self, node: Node, content: str) -> List[Dict[str, Any]]:
        """Find potential code issues and anti-patterns"""
        issues = []
        
        def analyze_node(node: Node):
            # Check for deeply nested structures
            if self._get_nesting_depth(node) > 4:
                issues.append({
                    "type": "deep_nesting",
                    "severity": "medium",
                    "line": node.start_point[0] + 1,
                    "description": "Deeply nested code structure detected",
                    "suggestion": "Consider refactoring to reduce nesting"
                })
            
            # Check for long functions
            if node.type in ["function_definition", "method_definition"]:
                lines = node.end_point[0] - node.start_point[0] + 1
                if lines > 50:
                    issues.append({
                        "type": "long_function",
                        "severity": "medium",
                        "line": node.start_point[0] + 1,
                        "description": f"Function is {lines} lines long",
                        "suggestion": "Consider breaking down into smaller functions"
                    })
            
            # Check for too many parameters
            if node.type in ["function_definition", "method_definition"]:
                params = self._extract_parameters(node, content)
                if len(params) > 5:
                    issues.append({
                        "type": "too_many_parameters",
                        "severity": "low",
                        "line": node.start_point[0] + 1,
                        "description": f"Function has {len(params)} parameters",
                        "suggestion": "Consider using parameter objects or reducing parameters"
                    })
            
            for child in node.children:
                analyze_node(child)
        
        analyze_node(node)
        return issues
    
    def _get_nesting_depth(self, node: Node) -> int:
        """Calculate maximum nesting depth"""
        max_depth = 0
        
        def calculate_depth(node: Node, current_depth: int = 0):
            nonlocal max_depth
            
            if node.type in ["if_statement", "for_statement", "while_statement", "try_statement"]:
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            
            for child in node.children:
                calculate_depth(child, current_depth)
        
        calculate_depth(node)
        return max_depth
    
    def _identify_patterns(self, node: Node, content: str) -> List[Dict[str, Any]]:
        """Identify common code patterns"""
        patterns = []
        
        # Pattern: Singleton pattern
        if self._detect_singleton_pattern(node, content):
            patterns.append({
                "type": "singleton",
                "description": "Singleton pattern detected",
                "confidence": 0.8
            })
        
        # Pattern: Factory pattern
        if self._detect_factory_pattern(node, content):
            patterns.append({
                "type": "factory",
                "description": "Factory pattern detected",
                "confidence": 0.7
            })
        
        return patterns
    
    def _detect_singleton_pattern(self, node: Node, content: str) -> bool:
        """Detect singleton pattern implementation"""
        # Simple heuristic: look for private constructor and getInstance method
        has_private_constructor = False
        has_get_instance = False
        
        def check_singleton(node: Node):
            nonlocal has_private_constructor, has_get_instance
            
            if node.type == "function_definition":
                func_name = self._get_node_text(node, content)
                if "getInstance" in func_name or "get_instance" in func_name:
                    has_get_instance = True
            
            for child in node.children:
                check_singleton(child)
        
        check_singleton(node)
        return has_get_instance  # Simplified check
    
    def _detect_factory_pattern(self, node: Node, content: str) -> bool:
        """Detect factory pattern implementation"""
        # Look for create methods or factory classes
        def check_factory(node: Node):
            if node.type == "function_definition":
                func_name = self._get_node_text(node, content)
                if "create" in func_name.lower() or "factory" in func_name.lower():
                    return True
            
            for child in node.children:
                if check_factory(child):
                    return True
            
            return False
        
        return check_factory(node)
    
    def _analyze_dependencies(self, node: Node, content: str) -> Dict[str, Any]:
        """Analyze code dependencies"""
        dependencies = {
            "internal_calls": [],
            "external_imports": [],
            "complexity_contributors": []
        }
        
        # This would be expanded with more sophisticated dependency analysis
        return dependencies
    
    def _extract_docstring(self, node: Node, content: str) -> Optional[str]:
        """Extract docstring from function or class"""
        # Look for string literals at the beginning of the function/class body
        for child in node.children:
            if child.type == "block" or child.type == "suite":
                for grandchild in child.children:
                    if grandchild.type == "expression_statement":
                        for ggchild in grandchild.children:
                            if ggchild.type == "string":
                                return content[ggchild.start_byte:ggchild.end_byte].strip('"\'')
        return None
    
    def _get_node_text(self, node: Node, content: str) -> str:
        """Get text content of a node"""
        return content[node.start_byte:node.end_byte]


class GraphSitterAdapter:
    """
    Graph-Sitter integration adapter with codemods support
    
    Provides comprehensive code analysis, pattern detection, and
    code manipulation capabilities using Tree-sitter parsers.
    """
    
    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        self.analyzers: Dict[str, LanguageAnalyzer] = {}
        self.analysis_cache: Dict[str, Dict[str, Any]] = {}
        
        # Initialize supported languages
        self._initialize_languages()
        
        logger.info(
            "GraphSitterAdapter initialized",
            supported_languages=list(self.parsers.keys())
        )
    
    def _initialize_languages(self):
        """Initialize Tree-sitter parsers for supported languages"""
        language_configs = {
            "python": "tree_sitter_python",
            "javascript": "tree_sitter_javascript", 
            "typescript": "tree_sitter_typescript",
            "go": "tree_sitter_go",
            "rust": "tree_sitter_rust",
            "java": "tree_sitter_java",
            "cpp": "tree_sitter_cpp",
            "c": "tree_sitter_c"
        }
        
        for lang_name, module_name in language_configs.items():
            if lang_name in settings.graph_sitter.supported_languages:
                try:
                    # This would normally load the actual language library
                    # For now, we'll create a mock parser
                    parser = Parser()
                    # parser.set_language(Language(module_name))
                    
                    self.parsers[lang_name] = parser
                    self.analyzers[lang_name] = LanguageAnalyzer(lang_name, parser)
                    
                    logger.info(f"Initialized {lang_name} parser")
                    
                except Exception as e:
                    logger.warning(f"Failed to initialize {lang_name} parser", error=str(e))
    
    async def analyze_codebase(
        self,
        workspace_path: str,
        languages: Optional[List[str]] = None
    ) -> GraphSitterAnalysisResult:
        """
        Analyze entire codebase using Graph-Sitter
        
        Args:
            workspace_path: Path to the codebase workspace
            languages: List of languages to analyze (None for all supported)
            
        Returns:
            GraphSitterAnalysisResult with comprehensive analysis
        """
        try:
            logger.info("Starting codebase analysis", workspace_path=workspace_path)
            
            workspace_path_obj = Path(workspace_path)
            if not workspace_path_obj.exists():
                raise GraphSitterException(f"Workspace path does not exist: {workspace_path}")
            
            # Determine languages to analyze
            target_languages = languages or list(self.parsers.keys())
            
            # Find files to analyze
            files_to_analyze = self._find_source_files(workspace_path_obj, target_languages)
            
            if not files_to_analyze:
                return GraphSitterAnalysisResult(
                    success=True,
                    files_analyzed=0,
                    complexity_score=0.0,
                    metadata={"message": "No source files found to analyze"}
                )
            
            # Analyze files
            analysis_results = []
            total_complexity = 0.0
            
            for file_path, language in files_to_analyze:
                try:
                    file_analysis = await self._analyze_file(file_path, language)
                    analysis_results.append(file_analysis)
                    
                    # Accumulate complexity
                    total_complexity += file_analysis.get("complexity_score", 0.0)
                    
                except Exception as e:
                    logger.error("File analysis failed", file_path=str(file_path), error=str(e))
            
            # Calculate overall metrics
            avg_complexity = total_complexity / len(analysis_results) if analysis_results else 0.0
            
            # Aggregate results
            all_issues = []
            all_patterns = []
            dependency_graph = {}
            
            for result in analysis_results:
                all_issues.extend(result.get("potential_issues", []))
                all_patterns.extend(result.get("code_patterns", []))
                
                # Build dependency graph
                file_deps = result.get("dependencies", {})
                dependency_graph[result["file_path"]] = file_deps
            
            # Generate refactoring suggestions
            refactoring_suggestions = self._generate_refactoring_suggestions(
                analysis_results, all_issues
            )
            
            # Create final result
            result = GraphSitterAnalysisResult(
                success=True,
                languages_analyzed=target_languages,
                files_analyzed=len(analysis_results),
                complexity_score=min(avg_complexity, 1.0),
                code_patterns=all_patterns,
                potential_issues=all_issues,
                refactoring_suggestions=refactoring_suggestions,
                dependency_analysis=dependency_graph,
                metadata={
                    "workspace_path": workspace_path,
                    "total_lines_analyzed": sum(r.get("lines_of_code", 0) for r in analysis_results),
                    "analysis_timestamp": asyncio.get_event_loop().time(),
                    "file_breakdown": {
                        lang: len([r for r in analysis_results if r.get("language") == lang])
                        for lang in target_languages
                    }
                }
            )
            
            logger.info(
                "Codebase analysis completed",
                files_analyzed=len(analysis_results),
                complexity_score=avg_complexity,
                issues_found=len(all_issues)
            )
            
            return result
            
        except Exception as e:
            logger.error("Codebase analysis failed", error=str(e))
            raise GraphSitterException(f"Codebase analysis failed: {str(e)}")
    
    def _find_source_files(
        self,
        workspace_path: Path,
        languages: List[str]
    ) -> List[Tuple[Path, str]]:
        """Find source files for analysis"""
        
        language_extensions = {
            "python": [".py"],
            "javascript": [".js", ".jsx"],
            "typescript": [".ts", ".tsx"],
            "go": [".go"],
            "rust": [".rs"],
            "java": [".java"],
            "cpp": [".cpp", ".cxx", ".cc"],
            "c": [".c", ".h"]
        }
        
        files_to_analyze = []
        
        for language in languages:
            if language not in language_extensions:
                continue
                
            extensions = language_extensions[language]
            
            for ext in extensions:
                for file_path in workspace_path.rglob(f"*{ext}"):
                    # Skip certain directories
                    if any(part.startswith('.') for part in file_path.parts):
                        continue
                    if any(part in ['node_modules', '__pycache__', 'target', 'build'] for part in file_path.parts):
                        continue
                    
                    # Check file size
                    if file_path.stat().st_size > settings.graph_sitter.max_file_size:
                        logger.warning("Skipping large file", file_path=str(file_path))
                        continue
                    
                    files_to_analyze.append((file_path, language))
        
        return files_to_analyze
    
    async def _analyze_file(self, file_path: Path, language: str) -> Dict[str, Any]:
        """Analyze individual file"""
        
        # Check cache first
        file_hash = self._get_file_hash(file_path)
        cache_key = f"{file_path}:{file_hash}"
        
        if cache_key in self.analysis_cache:
            return self.analysis_cache[cache_key]
        
        # Read file content
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            logger.error("Failed to read file", file_path=str(file_path), error=str(e))
            return {
                "file_path": str(file_path),
                "language": language,
                "error": f"Failed to read file: {str(e)}",
                "analysis_failed": True
            }
        
        # Get analyzer for language
        analyzer = self.analyzers.get(language)
        if not analyzer:
            return {
                "file_path": str(file_path),
                "language": language,
                "error": f"No analyzer available for {language}",
                "analysis_failed": True
            }
        
        # Perform analysis
        result = analyzer.analyze_file(str(file_path), content)
        
        # Cache result
        self.analysis_cache[cache_key] = result
        
        return result
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Get hash of file for caching"""
        try:
            content = file_path.read_bytes()
            return hashlib.md5(content).hexdigest()
        except Exception:
            return str(file_path.stat().st_mtime)
    
    def _generate_refactoring_suggestions(
        self,
        analysis_results: List[Dict[str, Any]],
        all_issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate intelligent refactoring suggestions"""
        
        suggestions = []
        
        # Analyze complexity patterns
        high_complexity_files = [
            r for r in analysis_results 
            if r.get("complexity_score", 0) > 0.7
        ]
        
        for file_result in high_complexity_files:
            suggestions.append({
                "type": "complexity_reduction",
                "priority": "high",
                "file_path": file_result["file_path"],
                "description": f"High complexity detected (score: {file_result.get('complexity_score', 0):.2f})",
                "suggestion": "Consider breaking down complex functions and reducing nesting",
                "estimated_effort": "medium"
            })
        
        # Analyze duplicate patterns
        function_signatures = {}
        for result in analysis_results:
            for func in result.get("functions", []):
                signature = f"{func['name']}:{len(func.get('parameters', []))}"
                if signature not in function_signatures:
                    function_signatures[signature] = []
                function_signatures[signature].append({
                    "file": result["file_path"],
                    "function": func
                })
        
        # Find potential duplicates
        for signature, occurrences in function_signatures.items():
            if len(occurrences) > 1:
                suggestions.append({
                    "type": "duplicate_code",
                    "priority": "medium",
                    "description": f"Similar function signature '{signature}' found in multiple files",
                    "files": [occ["file"] for occ in occurrences],
                    "suggestion": "Consider extracting common functionality into a shared module",
                    "estimated_effort": "low"
                })
        
        # Analyze issue patterns
        issue_types = {}
        for issue in all_issues:
            issue_type = issue.get("type", "unknown")
            if issue_type not in issue_types:
                issue_types[issue_type] = []
            issue_types[issue_type].append(issue)
        
        for issue_type, issues in issue_types.items():
            if len(issues) > 3:  # If same issue type appears frequently
                suggestions.append({
                    "type": "systematic_issue",
                    "priority": "high",
                    "description": f"Systematic issue '{issue_type}' found in {len(issues)} locations",
                    "suggestion": f"Consider implementing coding standards or linting rules to prevent {issue_type}",
                    "estimated_effort": "high",
                    "affected_files": len(set(issue.get("file_path", "") for issue in issues))
                })
        
        return suggestions
    
    async def apply_codemod(
        self,
        workspace_path: str,
        codemod_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply code modifications using codemods
        
        Args:
            workspace_path: Path to the codebase
            codemod_config: Configuration for the codemod to apply
            
        Returns:
            Results of the codemod application
        """
        try:
            logger.info("Applying codemod", config=codemod_config)
            
            # This would implement actual codemod functionality
            # For now, return a placeholder result
            
            return {
                "success": True,
                "files_modified": 0,
                "changes_applied": [],
                "message": "Codemod functionality not yet implemented"
            }
            
        except Exception as e:
            logger.error("Codemod application failed", error=str(e))
            raise GraphSitterException(f"Codemod failed: {str(e)}")
    
    def clear_cache(self):
        """Clear analysis cache"""
        self.analysis_cache.clear()
        logger.info("Analysis cache cleared")

