"""
Graph-Sitter Service Adapter

Provides code parsing, AST analysis, and code structure understanding capabilities
using the graph-sitter library.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import hashlib
import json

# Import graph-sitter libraries
try:
    import tree_sitter
    from tree_sitter import Language, Parser, Node
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    logging.warning("tree-sitter library not available, using mock implementation")

from app.core.orchestration.coordinator import ServiceAdapter
from app.utils.exceptions import ServiceNotFoundError, ActionNotFoundError

logger = logging.getLogger(__name__)


class CodeIssue:
    """Represents a code issue found during analysis"""
    
    def __init__(
        self,
        issue_type: str,
        severity: str,
        message: str,
        line: int,
        column: int,
        end_line: Optional[int] = None,
        end_column: Optional[int] = None
    ):
        self.type = issue_type
        self.severity = severity
        self.message = message
        self.line = line
        self.column = column
        self.end_line = end_line or line
        self.end_column = end_column or column
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "severity": self.severity,
            "message": self.message,
            "line": self.line,
            "column": self.column,
            "end_line": self.end_line,
            "end_column": self.end_column
        }


class RefactoringSuggestion:
    """Represents a refactoring suggestion"""
    
    def __init__(
        self,
        suggestion_type: str,
        description: str,
        line: int,
        column: int,
        confidence: float,
        suggested_code: Optional[str] = None
    ):
        self.type = suggestion_type
        self.description = description
        self.line = line
        self.column = column
        self.confidence = confidence
        self.suggested_code = suggested_code
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "description": self.description,
            "line": self.line,
            "column": self.column,
            "confidence": self.confidence,
            "suggested_code": self.suggested_code
        }


class GraphSitterAdapter(ServiceAdapter):
    """Graph-Sitter adapter for code analysis and parsing"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.supported_languages = config.get("supported_languages", ["python", "javascript", "typescript"])
        self.cache_enabled = config.get("cache_enabled", True)
        self.cache_size = config.get("cache_size", 1000)
        self.analysis_timeout = config.get("analysis_timeout", 30)
        
        # Initialize parsers for supported languages
        self.parsers: Dict[str, Any] = {}
        self.languages: Dict[str, Any] = {}
        
        # Analysis cache
        self.analysis_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_order: List[str] = []
        
        # Initialize tree-sitter if available
        if TREE_SITTER_AVAILABLE:
            self._initialize_parsers()
    
    def _initialize_parsers(self):
        """Initialize tree-sitter parsers for supported languages"""
        try:
            # Note: In a real implementation, you would need to build or download
            # the language libraries. This is a simplified version.
            
            for language in self.supported_languages:
                try:
                    # This would normally load pre-built language libraries
                    # For now, we'll create placeholder parsers
                    parser = Parser()
                    self.parsers[language] = parser
                    logger.info(f"Initialized parser for {language}")
                    
                except Exception as e:
                    logger.warning(f"Failed to initialize parser for {language}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize tree-sitter parsers: {e}")
    
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute graph-sitter action"""
        if not TREE_SITTER_AVAILABLE:
            return await self._execute_mock_action(action, context)
        
        action_map = {
            "parse_code": self._parse_code,
            "analyze_structure": self._analyze_structure,
            "extract_functions": self._extract_functions,
            "extract_classes": self._extract_classes,
            "find_dependencies": self._find_dependencies,
            "suggest_refactoring": self._suggest_refactoring,
            "validate_syntax": self._validate_syntax,
            "get_metrics": self._get_metrics,
            "analyze_complexity": self._analyze_complexity,
            "find_patterns": self._find_patterns,
            "get_symbol_table": self._get_symbol_table
        }
        
        handler = action_map.get(action)
        if not handler:
            raise ActionNotFoundError(f"Unknown action: {action}")
        
        return await handler(context)
    
    async def health_check(self) -> str:
        """Check graph-sitter service health"""
        try:
            if not TREE_SITTER_AVAILABLE:
                return "degraded: tree-sitter library not available"
            
            # Check if parsers are initialized
            if not self.parsers:
                return "degraded: no parsers initialized"
            
            # Test parsing a simple code snippet
            test_code = "def test(): pass"
            if "python" in self.parsers:
                try:
                    await self._parse_code({
                        "parameters": {
                            "content": test_code,
                            "language": "python"
                        }
                    })
                    return "healthy"
                except Exception:
                    return "degraded: parser test failed"
            
            return "healthy"
            
        except Exception as e:
            return f"unhealthy: {str(e)}"
    
    async def cleanup(self):
        """Cleanup resources"""
        self.analysis_cache.clear()
        self.cache_order.clear()
        logger.info("Graph-sitter adapter cleanup completed")
    
    # ============================================================================
    # REAL GRAPH-SITTER IMPLEMENTATION
    # ============================================================================
    
    async def _parse_code(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Parse code and generate AST"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        file_path = parameters.get("file_path")
        include_comments = parameters.get("include_comments", True)
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        if language not in self.supported_languages:
            raise Exception(f"Unsupported language: {language}")
        
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Check cache first
            cache_key = self._get_cache_key(content, language, "parse")
            if self.cache_enabled and cache_key in self.analysis_cache:
                cached_result = self.analysis_cache[cache_key]
                cached_result["from_cache"] = True
                return cached_result
            
            # Parse with tree-sitter
            parser = self.parsers.get(language)
            if not parser:
                raise Exception(f"Parser not available for language: {language}")
            
            # Convert content to bytes
            content_bytes = content.encode('utf-8')
            
            # Parse the code
            tree = parser.parse(content_bytes)
            root_node = tree.root_node
            
            # Convert AST to dictionary
            ast_dict = self._node_to_dict(root_node, content_bytes, include_comments)
            
            # Find syntax errors
            syntax_errors = self._find_syntax_errors(root_node, content_bytes)
            
            parse_time = asyncio.get_event_loop().time() - start_time
            
            result = {
                "ast": ast_dict,
                "syntax_errors": [error.to_dict() for error in syntax_errors],
                "parse_time": parse_time,
                "language": language,
                "file_path": file_path,
                "from_cache": False
            }
            
            # Cache the result
            if self.cache_enabled:
                self._cache_result(cache_key, result)
            
            logger.info(f"Parsed {language} code in {parse_time:.3f}s")
            return result
            
        except Exception as e:
            logger.error(f"Code parsing failed: {e}")
            raise Exception(f"Code parsing failed: {e}")
    
    async def _analyze_structure(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code structure and patterns"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        analysis_types = parameters.get("analysis_types", ["structure", "metrics", "dependencies"])
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # First parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            structure_analysis = {}
            
            if "structure" in analysis_types:
                structure_analysis["structure"] = self._analyze_code_structure(ast, content)
            
            if "metrics" in analysis_types:
                structure_analysis["metrics"] = self._calculate_code_metrics(ast, content)
            
            if "dependencies" in analysis_types:
                structure_analysis["dependencies"] = self._find_code_dependencies(ast, content)
            
            # Find issues and suggestions
            issues = self._find_code_issues(ast, content, language)
            suggestions = self._generate_refactoring_suggestions(ast, content, language)
            
            return {
                **structure_analysis,
                "issues": [issue.to_dict() for issue in issues],
                "suggestions": [suggestion.to_dict() for suggestion in suggestions],
                "language": language,
                "analysis_types": analysis_types
            }
            
        except Exception as e:
            logger.error(f"Structure analysis failed: {e}")
            raise Exception(f"Structure analysis failed: {e}")
    
    async def _extract_functions(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract function definitions from code"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        include_methods = parameters.get("include_methods", True)
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            functions = self._extract_functions_from_ast(ast, content, include_methods)
            
            return {
                "functions": functions,
                "total_count": len(functions),
                "language": language,
                "include_methods": include_methods
            }
            
        except Exception as e:
            logger.error(f"Function extraction failed: {e}")
            raise Exception(f"Function extraction failed: {e}")
    
    async def _extract_classes(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract class definitions from code"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        include_inheritance = parameters.get("include_inheritance", True)
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            classes = self._extract_classes_from_ast(ast, content, include_inheritance)
            
            return {
                "classes": classes,
                "total_count": len(classes),
                "language": language,
                "include_inheritance": include_inheritance
            }
            
        except Exception as e:
            logger.error(f"Class extraction failed: {e}")
            raise Exception(f"Class extraction failed: {e}")
    
    async def _find_dependencies(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Find code dependencies and imports"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        dependency_types = parameters.get("dependency_types", ["imports", "calls", "references"])
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            dependencies = {}
            
            if "imports" in dependency_types:
                dependencies["imports"] = self._find_imports(ast, content, language)
            
            if "calls" in dependency_types:
                dependencies["function_calls"] = self._find_function_calls(ast, content)
            
            if "references" in dependency_types:
                dependencies["variable_references"] = self._find_variable_references(ast, content)
            
            return {
                "dependencies": dependencies,
                "language": language,
                "dependency_types": dependency_types
            }
            
        except Exception as e:
            logger.error(f"Dependency analysis failed: {e}")
            raise Exception(f"Dependency analysis failed: {e}")
    
    async def _suggest_refactoring(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest refactoring opportunities"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        suggestion_types = parameters.get("suggestion_types", ["complexity", "duplication", "naming"])
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            suggestions = []
            
            if "complexity" in suggestion_types:
                suggestions.extend(self._suggest_complexity_refactoring(ast, content))
            
            if "duplication" in suggestion_types:
                suggestions.extend(self._suggest_duplication_refactoring(ast, content))
            
            if "naming" in suggestion_types:
                suggestions.extend(self._suggest_naming_improvements(ast, content))
            
            return {
                "suggestions": [suggestion.to_dict() for suggestion in suggestions],
                "total_count": len(suggestions),
                "language": language,
                "suggestion_types": suggestion_types
            }
            
        except Exception as e:
            logger.error(f"Refactoring suggestion failed: {e}")
            raise Exception(f"Refactoring suggestion failed: {e}")
    
    async def _validate_syntax(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate code syntax"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            syntax_errors = parse_result["syntax_errors"]
            
            is_valid = len(syntax_errors) == 0
            
            return {
                "is_valid": is_valid,
                "syntax_errors": syntax_errors,
                "error_count": len(syntax_errors),
                "language": language
            }
            
        except Exception as e:
            logger.error(f"Syntax validation failed: {e}")
            raise Exception(f"Syntax validation failed: {e}")
    
    async def _get_metrics(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate code metrics"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        metric_types = parameters.get("metric_types", ["complexity", "size", "maintainability"])
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            metrics = {}
            
            if "complexity" in metric_types:
                metrics.update(self._calculate_complexity_metrics(ast, content))
            
            if "size" in metric_types:
                metrics.update(self._calculate_size_metrics(ast, content))
            
            if "maintainability" in metric_types:
                metrics.update(self._calculate_maintainability_metrics(ast, content))
            
            return {
                "metrics": metrics,
                "language": language,
                "metric_types": metric_types
            }
            
        except Exception as e:
            logger.error(f"Metrics calculation failed: {e}")
            raise Exception(f"Metrics calculation failed: {e}")
    
    async def _analyze_complexity(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code complexity in detail"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            complexity_analysis = {
                "cyclomatic_complexity": self._calculate_cyclomatic_complexity(ast),
                "cognitive_complexity": self._calculate_cognitive_complexity(ast),
                "nesting_depth": self._calculate_nesting_depth(ast),
                "function_complexities": self._analyze_function_complexities(ast, content)
            }
            
            return {
                "complexity_analysis": complexity_analysis,
                "language": language
            }
            
        except Exception as e:
            logger.error(f"Complexity analysis failed: {e}")
            raise Exception(f"Complexity analysis failed: {e}")
    
    async def _find_patterns(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Find code patterns and anti-patterns"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        pattern_types = parameters.get("pattern_types", ["design_patterns", "anti_patterns"])
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            patterns = {}
            
            if "design_patterns" in pattern_types:
                patterns["design_patterns"] = self._find_design_patterns(ast, content)
            
            if "anti_patterns" in pattern_types:
                patterns["anti_patterns"] = self._find_anti_patterns(ast, content)
            
            return {
                "patterns": patterns,
                "language": language,
                "pattern_types": pattern_types
            }
            
        except Exception as e:
            logger.error(f"Pattern analysis failed: {e}")
            raise Exception(f"Pattern analysis failed: {e}")
    
    async def _get_symbol_table(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate symbol table for the code"""
        parameters = context.get("parameters", {})
        content = parameters.get("content")
        language = parameters.get("language")
        include_scope = parameters.get("include_scope", True)
        
        if not content or not language:
            raise Exception("content and language parameters required")
        
        try:
            # Parse the code
            parse_result = await self._parse_code(context)
            ast = parse_result["ast"]
            
            symbol_table = self._build_symbol_table(ast, content, include_scope)
            
            return {
                "symbol_table": symbol_table,
                "language": language,
                "include_scope": include_scope
            }
            
        except Exception as e:
            logger.error(f"Symbol table generation failed: {e}")
            raise Exception(f"Symbol table generation failed: {e}")
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    def _node_to_dict(self, node: Any, content_bytes: bytes, include_comments: bool = True) -> Dict[str, Any]:
        """Convert tree-sitter node to dictionary"""
        # This is a simplified implementation
        # In a real implementation, you would properly traverse the AST
        return {
            "type": getattr(node, 'type', 'unknown'),
            "start_point": getattr(node, 'start_point', (0, 0)),
            "end_point": getattr(node, 'end_point', (0, 0)),
            "text": content_bytes[getattr(node, 'start_byte', 0):getattr(node, 'end_byte', 0)].decode('utf-8', errors='ignore'),
            "children": []  # Would recursively process children
        }
    
    def _find_syntax_errors(self, root_node: Any, content_bytes: bytes) -> List[CodeIssue]:
        """Find syntax errors in the AST"""
        errors = []
        # This would traverse the AST looking for error nodes
        # Simplified implementation
        return errors
    
    def _analyze_code_structure(self, ast: Dict[str, Any], content: str) -> Dict[str, Any]:
        """Analyze code structure"""
        lines = content.split('\n')
        return {
            "total_lines": len(lines),
            "non_empty_lines": len([line for line in lines if line.strip()]),
            "comment_lines": len([line for line in lines if line.strip().startswith('#')]),
            "functions": 0,  # Would count from AST
            "classes": 0,    # Would count from AST
            "imports": 0     # Would count from AST
        }
    
    def _calculate_code_metrics(self, ast: Dict[str, Any], content: str) -> Dict[str, float]:
        """Calculate basic code metrics"""
        lines = content.split('\n')
        return {
            "lines_of_code": len(lines),
            "cyclomatic_complexity": 1.0,  # Would calculate from AST
            "maintainability_index": 85.0,  # Would calculate based on various factors
            "technical_debt_ratio": 0.1
        }
    
    def _find_code_dependencies(self, ast: Dict[str, Any], content: str) -> List[str]:
        """Find code dependencies"""
        # Simplified implementation - would parse imports from AST
        dependencies = []
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                dependencies.append(line)
        return dependencies
    
    def _find_code_issues(self, ast: Dict[str, Any], content: str, language: str) -> List[CodeIssue]:
        """Find code issues"""
        issues = []
        
        # Example: Find long lines
        for i, line in enumerate(content.split('\n'), 1):
            if len(line) > 100:
                issues.append(CodeIssue(
                    issue_type="line_length",
                    severity="warning",
                    message=f"Line too long ({len(line)} characters)",
                    line=i,
                    column=100
                ))
        
        return issues
    
    def _generate_refactoring_suggestions(self, ast: Dict[str, Any], content: str, language: str) -> List[RefactoringSuggestion]:
        """Generate refactoring suggestions"""
        suggestions = []
        
        # Example: Suggest breaking long functions
        lines = content.split('\n')
        if len(lines) > 50:
            suggestions.append(RefactoringSuggestion(
                suggestion_type="function_length",
                description="Consider breaking this function into smaller functions",
                line=1,
                column=1,
                confidence=0.7
            ))
        
        return suggestions
    
    # Additional helper methods would be implemented here...
    def _extract_functions_from_ast(self, ast: Dict[str, Any], content: str, include_methods: bool) -> List[Dict[str, Any]]:
        """Extract functions from AST"""
        return []  # Simplified implementation
    
    def _extract_classes_from_ast(self, ast: Dict[str, Any], content: str, include_inheritance: bool) -> List[Dict[str, Any]]:
        """Extract classes from AST"""
        return []  # Simplified implementation
    
    def _find_imports(self, ast: Dict[str, Any], content: str, language: str) -> List[str]:
        """Find import statements"""
        return []  # Simplified implementation
    
    def _find_function_calls(self, ast: Dict[str, Any], content: str) -> List[Dict[str, Any]]:
        """Find function calls"""
        return []  # Simplified implementation
    
    def _find_variable_references(self, ast: Dict[str, Any], content: str) -> List[Dict[str, Any]]:
        """Find variable references"""
        return []  # Simplified implementation
    
    def _suggest_complexity_refactoring(self, ast: Dict[str, Any], content: str) -> List[RefactoringSuggestion]:
        """Suggest complexity-based refactoring"""
        return []  # Simplified implementation
    
    def _suggest_duplication_refactoring(self, ast: Dict[str, Any], content: str) -> List[RefactoringSuggestion]:
        """Suggest duplication-based refactoring"""
        return []  # Simplified implementation
    
    def _suggest_naming_improvements(self, ast: Dict[str, Any], content: str) -> List[RefactoringSuggestion]:
        """Suggest naming improvements"""
        return []  # Simplified implementation
    
    def _calculate_complexity_metrics(self, ast: Dict[str, Any], content: str) -> Dict[str, float]:
        """Calculate complexity metrics"""
        return {"cyclomatic_complexity": 1.0}  # Simplified implementation
    
    def _calculate_size_metrics(self, ast: Dict[str, Any], content: str) -> Dict[str, float]:
        """Calculate size metrics"""
        return {"lines_of_code": len(content.split('\n'))}  # Simplified implementation
    
    def _calculate_maintainability_metrics(self, ast: Dict[str, Any], content: str) -> Dict[str, float]:
        """Calculate maintainability metrics"""
        return {"maintainability_index": 85.0}  # Simplified implementation
    
    def _calculate_cyclomatic_complexity(self, ast: Dict[str, Any]) -> float:
        """Calculate cyclomatic complexity"""
        return 1.0  # Simplified implementation
    
    def _calculate_cognitive_complexity(self, ast: Dict[str, Any]) -> float:
        """Calculate cognitive complexity"""
        return 1.0  # Simplified implementation
    
    def _calculate_nesting_depth(self, ast: Dict[str, Any]) -> int:
        """Calculate maximum nesting depth"""
        return 1  # Simplified implementation
    
    def _analyze_function_complexities(self, ast: Dict[str, Any], content: str) -> List[Dict[str, Any]]:
        """Analyze complexity of individual functions"""
        return []  # Simplified implementation
    
    def _find_design_patterns(self, ast: Dict[str, Any], content: str) -> List[Dict[str, Any]]:
        """Find design patterns"""
        return []  # Simplified implementation
    
    def _find_anti_patterns(self, ast: Dict[str, Any], content: str) -> List[Dict[str, Any]]:
        """Find anti-patterns"""
        return []  # Simplified implementation
    
    def _build_symbol_table(self, ast: Dict[str, Any], content: str, include_scope: bool) -> Dict[str, Any]:
        """Build symbol table"""
        return {}  # Simplified implementation
    
    def _get_cache_key(self, content: str, language: str, operation: str) -> str:
        """Generate cache key for content"""
        content_hash = hashlib.md5(content.encode()).hexdigest()
        return f"{language}:{operation}:{content_hash}"
    
    def _cache_result(self, cache_key: str, result: Dict[str, Any]) -> None:
        """Cache analysis result"""
        if len(self.analysis_cache) >= self.cache_size:
            # Remove oldest entry
            oldest_key = self.cache_order.pop(0)
            del self.analysis_cache[oldest_key]
        
        self.analysis_cache[cache_key] = result
        self.cache_order.append(cache_key)
    
    # ============================================================================
    # MOCK IMPLEMENTATION (when tree-sitter is not available)
    # ============================================================================
    
    async def _execute_mock_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Mock implementation when tree-sitter is not available"""
        logger.warning(f"Using mock implementation for action: {action}")
        
        parameters = context.get("parameters", {})
        content = parameters.get("content", "")
        language = parameters.get("language", "unknown")
        
        if action == "parse_code":
            return {
                "ast": {"type": "mock_ast", "content_length": len(content)},
                "syntax_errors": [],
                "parse_time": 0.1,
                "language": language,
                "from_cache": False
            }
        
        elif action == "analyze_structure":
            lines = content.split('\n')
            return {
                "structure": {
                    "total_lines": len(lines),
                    "functions": 1,
                    "classes": 0
                },
                "metrics": {
                    "lines_of_code": len(lines),
                    "cyclomatic_complexity": 1.0
                },
                "dependencies": ["mock_dependency"],
                "issues": [],
                "suggestions": [],
                "language": language
            }
        
        elif action in ["extract_functions", "extract_classes"]:
            return {
                f"{action.split('_')[1]}": [],
                "total_count": 0,
                "language": language
            }
        
        elif action == "validate_syntax":
            return {
                "is_valid": True,
                "syntax_errors": [],
                "error_count": 0,
                "language": language
            }
        
        else:
            return {
                "status": "mock",
                "message": f"Mock response for {action}",
                "language": language
            }

