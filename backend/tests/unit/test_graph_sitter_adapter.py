"""
Unit tests for Graph-Sitter adapter
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

from app.services.adapters.graph_sitter_adapter import (
    GraphSitterAdapter,
    CodeIssue,
    RefactoringSuggestion
)


@pytest.fixture
def graph_sitter_config():
    """Graph-sitter adapter configuration"""
    return {
        "supported_languages": ["python", "javascript", "typescript"],
        "cache_enabled": True,
        "cache_size": 100,
        "analysis_timeout": 30
    }


@pytest.fixture
def graph_sitter_adapter(graph_sitter_config):
    """Graph-sitter adapter instance"""
    return GraphSitterAdapter(graph_sitter_config)


@pytest.mark.asyncio
class TestGraphSitterAdapter:
    """Test cases for Graph-Sitter adapter"""
    
    async def test_adapter_initialization(self, graph_sitter_adapter):
        """Test adapter initialization"""
        assert graph_sitter_adapter.supported_languages == ["python", "javascript", "typescript"]
        assert graph_sitter_adapter.cache_enabled is True
        assert graph_sitter_adapter.cache_size == 100
        assert graph_sitter_adapter.analysis_timeout == 30
    
    async def test_health_check_mock_mode(self, graph_sitter_adapter):
        """Test health check in mock mode"""
        health_status = await graph_sitter_adapter.health_check()
        assert "degraded" in health_status
        assert "tree-sitter library not available" in health_status
    
    async def test_parse_code_action(self, graph_sitter_adapter):
        """Test parse_code action"""
        context = {
            "parameters": {
                "content": "def hello():\n    print('Hello, World!')",
                "language": "python",
                "file_path": "test.py"
            }
        }
        
        result = await graph_sitter_adapter.execute_action("parse_code", context)
        
        assert "ast" in result
        assert "syntax_errors" in result
        assert "parse_time" in result
        assert result["language"] == "python"
        assert result["file_path"] == "test.py"
    
    async def test_analyze_structure_action(self, graph_sitter_adapter):
        """Test analyze_structure action"""
        context = {
            "parameters": {
                "content": "def hello():\n    print('Hello, World!')\n\nclass Test:\n    pass",
                "language": "python",
                "analysis_types": ["structure", "metrics"]
            }
        }
        
        result = await graph_sitter_adapter.execute_action("analyze_structure", context)
        
        assert "structure" in result
        assert "metrics" in result
        assert "issues" in result
        assert "suggestions" in result
        assert result["language"] == "python"
    
    async def test_extract_functions_action(self, graph_sitter_adapter):
        """Test extract_functions action"""
        context = {
            "parameters": {
                "content": "def func1():\n    pass\n\ndef func2():\n    return 42",
                "language": "python",
                "include_methods": True
            }
        }
        
        result = await graph_sitter_adapter.execute_action("extract_functions", context)
        
        assert "functions" in result
        assert "total_count" in result
        assert result["language"] == "python"
        assert result["include_methods"] is True
    
    async def test_extract_classes_action(self, graph_sitter_adapter):
        """Test extract_classes action"""
        context = {
            "parameters": {
                "content": "class MyClass:\n    def method(self):\n        pass",
                "language": "python",
                "include_inheritance": True
            }
        }
        
        result = await graph_sitter_adapter.execute_action("extract_classes", context)
        
        assert "classes" in result
        assert "total_count" in result
        assert result["language"] == "python"
        assert result["include_inheritance"] is True
    
    async def test_validate_syntax_action(self, graph_sitter_adapter):
        """Test validate_syntax action"""
        context = {
            "parameters": {
                "content": "def valid_function():\n    return True",
                "language": "python"
            }
        }
        
        result = await graph_sitter_adapter.execute_action("validate_syntax", context)
        
        assert "is_valid" in result
        assert "syntax_errors" in result
        assert "error_count" in result
        assert result["language"] == "python"
    
    async def test_get_metrics_action(self, graph_sitter_adapter):
        """Test get_metrics action"""
        context = {
            "parameters": {
                "content": "def complex_function():\n    if True:\n        return 1\n    else:\n        return 0",
                "language": "python",
                "metric_types": ["complexity", "size"]
            }
        }
        
        result = await graph_sitter_adapter.execute_action("get_metrics", context)
        
        assert "metrics" in result
        assert result["language"] == "python"
        assert result["metric_types"] == ["complexity", "size"]
    
    async def test_suggest_refactoring_action(self, graph_sitter_adapter):
        """Test suggest_refactoring action"""
        context = {
            "parameters": {
                "content": "def very_long_function_that_does_too_much():\n" + "    pass\n" * 100,
                "language": "python",
                "suggestion_types": ["complexity", "naming"]
            }
        }
        
        result = await graph_sitter_adapter.execute_action("suggest_refactoring", context)
        
        assert "suggestions" in result
        assert "total_count" in result
        assert result["language"] == "python"
        assert result["suggestion_types"] == ["complexity", "naming"]
    
    async def test_find_dependencies_action(self, graph_sitter_adapter):
        """Test find_dependencies action"""
        context = {
            "parameters": {
                "content": "import os\nfrom typing import List\n\ndef func():\n    os.path.join('a', 'b')",
                "language": "python",
                "dependency_types": ["imports", "calls"]
            }
        }
        
        result = await graph_sitter_adapter.execute_action("find_dependencies", context)
        
        assert "dependencies" in result
        assert result["language"] == "python"
        assert result["dependency_types"] == ["imports", "calls"]
    
    async def test_invalid_action(self, graph_sitter_adapter):
        """Test invalid action handling"""
        context = {"parameters": {}}
        
        with pytest.raises(Exception) as exc_info:
            await graph_sitter_adapter.execute_action("invalid_action", context)
        
        assert "Unknown action" in str(exc_info.value)
    
    async def test_missing_parameters(self, graph_sitter_adapter):
        """Test missing required parameters"""
        context = {"parameters": {}}
        
        with pytest.raises(Exception) as exc_info:
            await graph_sitter_adapter.execute_action("parse_code", context)
        
        assert "content and language parameters required" in str(exc_info.value)
    
    async def test_unsupported_language(self, graph_sitter_adapter):
        """Test unsupported language handling"""
        context = {
            "parameters": {
                "content": "some code",
                "language": "unsupported_language"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await graph_sitter_adapter.execute_action("parse_code", context)
        
        assert "Unsupported language" in str(exc_info.value)
    
    async def test_cleanup(self, graph_sitter_adapter):
        """Test adapter cleanup"""
        # Add some cache entries
        graph_sitter_adapter.analysis_cache["test_key"] = {"result": "test"}
        graph_sitter_adapter.cache_order.append("test_key")
        
        await graph_sitter_adapter.cleanup()
        
        assert len(graph_sitter_adapter.analysis_cache) == 0
        assert len(graph_sitter_adapter.cache_order) == 0


class TestCodeIssue:
    """Test cases for CodeIssue class"""
    
    def test_code_issue_creation(self):
        """Test CodeIssue creation"""
        issue = CodeIssue(
            issue_type="syntax_error",
            severity="error",
            message="Invalid syntax",
            line=10,
            column=5,
            end_line=10,
            end_column=15
        )
        
        assert issue.type == "syntax_error"
        assert issue.severity == "error"
        assert issue.message == "Invalid syntax"
        assert issue.line == 10
        assert issue.column == 5
        assert issue.end_line == 10
        assert issue.end_column == 15
    
    def test_code_issue_to_dict(self):
        """Test CodeIssue to_dict method"""
        issue = CodeIssue(
            issue_type="warning",
            severity="warning",
            message="Unused variable",
            line=5,
            column=1
        )
        
        issue_dict = issue.to_dict()
        
        assert issue_dict["type"] == "warning"
        assert issue_dict["severity"] == "warning"
        assert issue_dict["message"] == "Unused variable"
        assert issue_dict["line"] == 5
        assert issue_dict["column"] == 1


class TestRefactoringSuggestion:
    """Test cases for RefactoringSuggestion class"""
    
    def test_refactoring_suggestion_creation(self):
        """Test RefactoringSuggestion creation"""
        suggestion = RefactoringSuggestion(
            suggestion_type="extract_method",
            description="Extract this code into a separate method",
            line=15,
            column=4,
            confidence=0.8,
            suggested_code="def extracted_method():\n    pass"
        )
        
        assert suggestion.type == "extract_method"
        assert suggestion.description == "Extract this code into a separate method"
        assert suggestion.line == 15
        assert suggestion.column == 4
        assert suggestion.confidence == 0.8
        assert suggestion.suggested_code == "def extracted_method():\n    pass"
    
    def test_refactoring_suggestion_to_dict(self):
        """Test RefactoringSuggestion to_dict method"""
        suggestion = RefactoringSuggestion(
            suggestion_type="rename_variable",
            description="Use more descriptive variable name",
            line=8,
            column=2,
            confidence=0.9
        )
        
        suggestion_dict = suggestion.to_dict()
        
        assert suggestion_dict["type"] == "rename_variable"
        assert suggestion_dict["description"] == "Use more descriptive variable name"
        assert suggestion_dict["line"] == 8
        assert suggestion_dict["column"] == 2
        assert suggestion_dict["confidence"] == 0.9
        assert suggestion_dict["suggested_code"] is None
