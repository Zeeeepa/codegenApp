"""
Unit tests for Graph-Sitter Adapter
Tests the core functionality of the graph-sitter integration
"""

import pytest
import asyncio
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any

from backend.app.services.adapters.graph_sitter_adapter import (
    GraphSitterAdapter, AnalysisType, AnalysisResult, SymbolInfo, 
    FileStructure, CodebaseStructure
)


class TestGraphSitterAdapter:
    """Test suite for GraphSitterAdapter"""
    
    @pytest.fixture
    def mock_codebase(self):
        """Create a mock codebase for testing"""
        mock_codebase = Mock()
        mock_file = Mock()
        mock_file.path = "test_file.py"
        mock_file.functions = []
        mock_file.classes = []
        mock_file.imports = []
        mock_codebase.files = [mock_file]
        return mock_codebase
    
    @pytest.fixture
    def adapter(self):
        """Create a GraphSitterAdapter instance for testing"""
        with patch('backend.app.services.adapters.graph_sitter_adapter.GRAPH_SITTER_AVAILABLE', True):
            return GraphSitterAdapter(cache_enabled=True, max_file_size=1024*1024)
    
    @pytest.fixture
    def temp_repo(self):
        """Create a temporary repository for testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create some test files
            test_files = {
                "main.py": """
def main():
    print("Hello, World!")

class TestClass:
    def method(self):
        pass
""",
                "utils.py": """
def helper_function():
    return True

CONSTANT = 42
""",
                "subdir/module.py": """
from utils import helper_function

def process_data():
    return helper_function()
"""
            }
            
            for file_path, content in test_files.items():
                full_path = Path(temp_dir) / file_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(content)
            
            yield temp_dir
    
    def test_adapter_initialization(self):
        """Test adapter initialization"""
        with patch('backend.app.services.adapters.graph_sitter_adapter.GRAPH_SITTER_AVAILABLE', True):
            adapter = GraphSitterAdapter(cache_enabled=True, max_file_size=512*1024)
            assert adapter.cache_enabled is True
            assert adapter.max_file_size == 512*1024
            assert adapter._cache == {}
            assert adapter._codebase_cache == {}
    
    def test_adapter_initialization_without_graph_sitter(self):
        """Test adapter initialization when graph-sitter is not available"""
        with patch('backend.app.services.adapters.graph_sitter_adapter.GRAPH_SITTER_AVAILABLE', False):
            with pytest.raises(ImportError, match="Graph-sitter is required but not available"):
                GraphSitterAdapter()
    
    @pytest.mark.asyncio
    async def test_analyze_codebase_success(self, adapter, temp_repo, mock_codebase):
        """Test successful codebase analysis"""
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            with patch.object(adapter, '_analyze_file') as mock_analyze_file:
                # Mock successful file analysis
                mock_file_structure = FileStructure(
                    path="test_file.py",
                    language="py",
                    functions=[],
                    classes=[],
                    imports=[],
                    exports=[],
                    dependencies=[],
                    lines_of_code=10
                )
                mock_analyze_file.return_value = AnalysisResult(
                    success=True,
                    analysis_type=AnalysisType.FILE_ANALYSIS,
                    data=mock_file_structure
                )
                
                result = await adapter.analyze_codebase(temp_repo)
                
                assert result.success is True
                assert result.analysis_type == AnalysisType.FULL_CODEBASE
                assert isinstance(result.data, CodebaseStructure)
                assert result.data.total_files == 1
    
    @pytest.mark.asyncio
    async def test_analyze_codebase_with_patterns(self, adapter, temp_repo, mock_codebase):
        """Test codebase analysis with include/exclude patterns"""
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            with patch.object(adapter, '_should_analyze_file', return_value=True):
                with patch.object(adapter, '_analyze_file') as mock_analyze_file:
                    mock_file_structure = FileStructure(
                        path="test_file.py",
                        language="py",
                        functions=[],
                        classes=[],
                        imports=[],
                        exports=[],
                        dependencies=[],
                        lines_of_code=10
                    )
                    mock_analyze_file.return_value = AnalysisResult(
                        success=True,
                        analysis_type=AnalysisType.FILE_ANALYSIS,
                        data=mock_file_structure
                    )
                    
                    result = await adapter.analyze_codebase(
                        temp_repo,
                        include_patterns=["*.py"],
                        exclude_patterns=["test_*.py"]
                    )
                    
                    assert result.success is True
                    assert result.metadata["include_patterns"] == ["*.py"]
                    assert result.metadata["exclude_patterns"] == ["test_*.py"]
    
    @pytest.mark.asyncio
    async def test_analyze_file_success(self, adapter, temp_repo):
        """Test successful file analysis"""
        test_file = Path(temp_repo) / "main.py"
        
        with patch.object(adapter, '_get_or_create_codebase') as mock_get_codebase:
            mock_codebase = Mock()
            mock_source_file = Mock()
            mock_source_file.path = str(test_file)
            mock_codebase.files = [mock_source_file]
            mock_get_codebase.return_value = mock_codebase
            
            with patch.object(adapter, '_analyze_file') as mock_analyze_file:
                mock_file_structure = FileStructure(
                    path=str(test_file),
                    language="py",
                    functions=[],
                    classes=[],
                    imports=[],
                    exports=[],
                    dependencies=[],
                    lines_of_code=10
                )
                mock_analyze_file.return_value = AnalysisResult(
                    success=True,
                    analysis_type=AnalysisType.FILE_ANALYSIS,
                    data=mock_file_structure
                )
                
                result = await adapter.analyze_file(str(test_file), temp_repo)
                
                assert result.success is True
                assert result.analysis_type == AnalysisType.FILE_ANALYSIS
                assert isinstance(result.data, FileStructure)
    
    @pytest.mark.asyncio
    async def test_analyze_file_not_found(self, adapter, temp_repo):
        """Test file analysis when file is not found"""
        non_existent_file = Path(temp_repo) / "non_existent.py"
        
        result = await adapter.analyze_file(str(non_existent_file), temp_repo)
        
        assert result.success is False
        assert "Could not find or analyze file" in result.error_message
    
    @pytest.mark.asyncio
    async def test_get_symbol_info_success(self, adapter, temp_repo, mock_codebase):
        """Test successful symbol information retrieval"""
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            with patch.object(adapter, '_find_symbol_in_file') as mock_find_symbol:
                mock_symbol = SymbolInfo(
                    name="test_function",
                    type="function",
                    file_path="test_file.py",
                    line_number=1
                )
                mock_find_symbol.return_value = mock_symbol
                
                result = await adapter.get_symbol_info("test_function", temp_repo)
                
                assert result.success is True
                assert result.analysis_type == AnalysisType.SYMBOL_ANALYSIS
                assert isinstance(result.data, SymbolInfo)
                assert result.data.name == "test_function"
    
    @pytest.mark.asyncio
    async def test_get_symbol_info_not_found(self, adapter, temp_repo, mock_codebase):
        """Test symbol information retrieval when symbol is not found"""
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            with patch.object(adapter, '_find_symbol_in_file', return_value=None):
                result = await adapter.get_symbol_info("non_existent_symbol", temp_repo)
                
                assert result.success is False
                assert "not found in codebase" in result.error_message
    
    @pytest.mark.asyncio
    async def test_get_dependency_graph_success(self, adapter, temp_repo, mock_codebase):
        """Test successful dependency graph generation"""
        # Mock file with imports
        mock_file = Mock()
        mock_file.path = "test_file.py"
        mock_import = Mock()
        mock_import.module_name = "os"
        mock_file.imports = [mock_import]
        mock_codebase.files = [mock_file]
        
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            result = await adapter.get_dependency_graph(temp_repo)
            
            assert result.success is True
            assert result.analysis_type == AnalysisType.DEPENDENCY_GRAPH
            assert isinstance(result.data, dict)
            assert "dependency_graph" in result.data
            assert "import_graph" in result.data
    
    @pytest.mark.asyncio
    async def test_get_structure_overview_success(self, adapter, temp_repo, mock_codebase):
        """Test successful structure overview generation"""
        # Mock file with functions and classes
        mock_file = Mock()
        mock_file.path = "test_file.py"
        mock_function = Mock()
        mock_function.name = "test_function"
        mock_class = Mock()
        mock_class.name = "TestClass"
        mock_file.functions = [mock_function]
        mock_file.classes = [mock_class]
        mock_codebase.files = [mock_file]
        
        with patch.object(adapter, '_get_or_create_codebase', return_value=mock_codebase):
            result = await adapter.get_structure_overview(temp_repo)
            
            assert result.success is True
            assert result.analysis_type == AnalysisType.STRUCTURE_OVERVIEW
            assert isinstance(result.data, dict)
            assert "total_files" in result.data
            assert "file_types" in result.data
            assert "top_level_symbols" in result.data
    
    def test_should_analyze_file_include_patterns(self, adapter):
        """Test file filtering with include patterns"""
        mock_file = Mock()
        mock_file.path = "test.py"
        
        with patch.object(Path, 'stat') as mock_stat:
            mock_stat.return_value.st_size = 1000
            
            # Should include .py files
            result = adapter._should_analyze_file(mock_file, ["*.py"], None)
            assert result is True
            
            # Should not include .js files when only .py is included
            mock_file.path = "test.js"
            result = adapter._should_analyze_file(mock_file, ["*.py"], None)
            assert result is False
    
    def test_should_analyze_file_exclude_patterns(self, adapter):
        """Test file filtering with exclude patterns"""
        mock_file = Mock()
        mock_file.path = "test.py"
        
        with patch.object(Path, 'stat') as mock_stat:
            mock_stat.return_value.st_size = 1000
            
            # Should exclude test files
            result = adapter._should_analyze_file(mock_file, None, ["test_*.py"])
            assert result is True
            
            mock_file.path = "test_example.py"
            result = adapter._should_analyze_file(mock_file, None, ["test_*.py"])
            assert result is False
    
    def test_should_analyze_file_size_limit(self, adapter):
        """Test file filtering based on size limit"""
        mock_file = Mock()
        mock_file.path = "large_file.py"
        
        with patch.object(Path, 'stat') as mock_stat:
            # File larger than max_file_size
            mock_stat.return_value.st_size = adapter.max_file_size + 1
            
            result = adapter._should_analyze_file(mock_file, None, None)
            assert result is False
    
    def test_matches_pattern(self, adapter):
        """Test pattern matching functionality"""
        assert adapter._matches_pattern("test.py", "*.py") is True
        assert adapter._matches_pattern("test.js", "*.py") is False
        assert adapter._matches_pattern("src/test.py", "src/*.py") is True
        assert adapter._matches_pattern("test_file.py", "test_*.py") is True
    
    @pytest.mark.asyncio
    async def test_analyze_file_internal(self, adapter):
        """Test internal file analysis method"""
        mock_source_file = Mock()
        mock_source_file.path = "test.py"
        
        # Mock functions
        mock_function = Mock()
        mock_function.name = "test_function"
        mock_source_file.functions = [mock_function]
        
        # Mock classes
        mock_class = Mock()
        mock_class.name = "TestClass"
        mock_source_file.classes = [mock_class]
        
        # Mock imports
        mock_import = Mock()
        mock_import.module_name = "os"
        mock_source_file.imports = [mock_import]
        
        with patch("builtins.open", mock_open_file_content("line1\nline2\nline3")):
            result = await adapter._analyze_file(mock_source_file)
            
            assert result.success is True
            assert isinstance(result.data, FileStructure)
            assert result.data.path == "test.py"
            assert len(result.data.functions) == 1
            assert len(result.data.classes) == 1
            assert len(result.data.imports) == 1
            assert result.data.lines_of_code == 3
    
    def test_cache_functionality(self, adapter):
        """Test cache operations"""
        # Test cache stats
        stats = adapter.get_cache_stats()
        assert "analysis_cache_size" in stats
        assert "codebase_cache_size" in stats
        
        # Test cache clearing
        adapter._cache["test"] = "data"
        adapter._codebase_cache["test"] = "codebase"
        
        adapter.clear_cache()
        
        assert len(adapter._cache) == 0
        assert len(adapter._codebase_cache) == 0
    
    @pytest.mark.asyncio
    async def test_codebase_caching(self, adapter, temp_repo):
        """Test codebase caching functionality"""
        with patch('backend.app.services.adapters.graph_sitter_adapter.Codebase') as mock_codebase_class:
            mock_codebase = Mock()
            mock_codebase_class.return_value = mock_codebase
            
            # First call should create codebase
            result1 = await adapter._get_or_create_codebase(temp_repo)
            assert result1 == mock_codebase
            assert mock_codebase_class.call_count == 1
            
            # Second call should use cached codebase
            result2 = await adapter._get_or_create_codebase(temp_repo)
            assert result2 == mock_codebase
            assert mock_codebase_class.call_count == 1  # Should not be called again
    
    @pytest.mark.asyncio
    async def test_error_handling(self, adapter, temp_repo):
        """Test error handling in various scenarios"""
        # Test codebase analysis error
        with patch.object(adapter, '_get_or_create_codebase', side_effect=Exception("Test error")):
            result = await adapter.analyze_codebase(temp_repo)
            assert result.success is False
            assert "Test error" in result.error_message
        
        # Test file analysis error
        with patch.object(adapter, '_get_or_create_codebase', side_effect=Exception("Test error")):
            result = await adapter.analyze_file("test.py", temp_repo)
            assert result.success is False
            assert "Test error" in result.error_message


def mock_open_file_content(content):
    """Helper function to mock file content"""
    from unittest.mock import mock_open
    return mock_open(read_data=content)


@pytest.mark.asyncio
async def test_integration_with_real_files():
    """Integration test with real file analysis (if graph-sitter is available)"""
    try:
        from backend.app.services.adapters.graph_sitter_adapter import GRAPH_SITTER_AVAILABLE
        if not GRAPH_SITTER_AVAILABLE:
            pytest.skip("Graph-sitter not available for integration test")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a simple Python file
            test_file = Path(temp_dir) / "test.py"
            test_file.write_text("""
def hello_world():
    '''A simple function'''
    print("Hello, World!")

class TestClass:
    def method(self):
        return 42
""")
            
            adapter = GraphSitterAdapter()
            result = await adapter.analyze_file(str(test_file), temp_dir)
            
            # Basic assertions for real analysis
            assert result.success is True
            assert isinstance(result.data, FileStructure)
            assert result.data.language == "py"
            
    except ImportError:
        pytest.skip("Graph-sitter not available for integration test")


if __name__ == "__main__":
    pytest.main([__file__])
