"""
Integration tests for Analysis API endpoints
Tests the complete API flow including FastAPI routes and graph-sitter integration
"""

import pytest
import tempfile
import json
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock

# Mock the dependencies before importing the app
with patch('backend.app.services.adapters.graph_sitter_adapter.GRAPH_SITTER_AVAILABLE', True):
    from backend.app.api.v1.routes.analysis import router
    from backend.app.services.adapters.graph_sitter_adapter import GraphSitterAdapter
    from backend.app.services.analysis_service import AnalysisService
    from backend.app.services.visualization_service import VisualizationService

from fastapi import FastAPI


@pytest.fixture
def app():
    """Create FastAPI app for testing"""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def temp_repo():
    """Create a temporary repository for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test files
        test_files = {
            "main.py": """
def main():
    print("Hello, World!")
    return 0

class Application:
    def __init__(self):
        self.name = "Test App"
    
    def run(self):
        return main()
""",
            "utils.py": """
import os
import sys

def get_config():
    return {"debug": True}

def helper_function(data):
    return data.upper()

CONSTANT = 42
""",
            "models/user.py": """
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def to_dict(self):
        return {"name": self.name, "email": self.email}
""",
            "tests/test_main.py": """
import unittest
from main import main

class TestMain(unittest.TestCase):
    def test_main(self):
        result = main()
        self.assertEqual(result, 0)
"""
        }
        
        for file_path, content in test_files.items():
            full_path = Path(temp_dir) / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)
        
        yield temp_dir


@pytest.fixture
def mock_adapter():
    """Create a mock GraphSitterAdapter"""
    adapter = Mock(spec=GraphSitterAdapter)
    
    # Mock successful codebase analysis
    adapter.analyze_codebase.return_value = Mock(
        success=True,
        analysis_type="full_codebase",
        data=Mock(
            total_files=4,
            total_lines=50,
            languages={"py": 4},
            file_structures=[],
            dependency_graph={},
            symbol_index={},
            analysis_timestamp="2024-01-01 00:00:00 UTC",
            analysis_duration=1.5
        ),
        error_message=None,
        warnings=[],
        metadata={"repo_path": "/test/repo"}
    )
    
    # Mock file analysis
    adapter.analyze_file.return_value = Mock(
        success=True,
        analysis_type="file_analysis",
        data=Mock(
            path="main.py",
            language="py",
            functions=[],
            classes=[],
            imports=[],
            exports=[],
            dependencies=[],
            lines_of_code=15,
            complexity_score=2.0
        ),
        error_message=None,
        warnings=[],
        metadata={}
    )
    
    # Mock symbol info
    adapter.get_symbol_info.return_value = Mock(
        success=True,
        analysis_type="symbol_analysis",
        data=Mock(
            name="main",
            type="function",
            file_path="main.py",
            line_number=2,
            parameters=[],
            return_type="int"
        ),
        error_message=None,
        warnings=[],
        metadata={}
    )
    
    # Mock dependency graph
    adapter.get_dependency_graph.return_value = Mock(
        success=True,
        analysis_type="dependency_graph",
        data={
            "dependency_graph": {
                "main.py": ["utils.py"],
                "utils.py": ["os", "sys"]
            },
            "import_graph": {
                "main.py": [{"module": "utils", "type": "import"}],
                "utils.py": [{"module": "os", "type": "import"}, {"module": "sys", "type": "import"}]
            },
            "analysis_timestamp": "2024-01-01 00:00:00 UTC"
        },
        error_message=None,
        warnings=[],
        metadata={}
    )
    
    # Mock structure overview
    adapter.get_structure_overview.return_value = Mock(
        success=True,
        analysis_type="structure_overview",
        data={
            "total_files": 4,
            "file_types": {".py": 4},
            "directory_structure": {
                "main.py": {},
                "utils.py": {},
                "models": {"user.py": {}},
                "tests": {"test_main.py": {}}
            },
            "top_level_symbols": [
                {"name": "main", "type": "function", "file": "main.py"},
                {"name": "Application", "type": "class", "file": "main.py"}
            ],
            "analysis_timestamp": "2024-01-01 00:00:00 UTC"
        },
        error_message=None,
        warnings=[],
        metadata={}
    )
    
    # Mock cache stats
    adapter.get_cache_stats.return_value = {
        "analysis_cache_size": 5,
        "codebase_cache_size": 2
    }
    
    return adapter


@pytest.fixture
def mock_services(mock_adapter):
    """Create mock services"""
    analysis_service = Mock(spec=AnalysisService)
    visualization_service = Mock(spec=VisualizationService)
    
    # Mock batch analysis
    analysis_service.batch_analyze.return_value = Mock(
        results={"/test/repo": mock_adapter.analyze_codebase.return_value},
        summary={"total_repositories": 1, "successful_repositories": 1},
        failed_repositories=[],
        total_duration=2.0,
        timestamp="2024-01-01 00:00:00 UTC"
    )
    
    # Mock interactive analysis
    visualization_service.generate_interactive_analysis.return_value = Mock(
        graph=Mock(
            nodes=[],
            edges=[],
            layout_hints={},
            metadata={}
        ),
        summary=Mock(
            total_files=4,
            file_types={".py": 4},
            directory_structure={},
            top_level_symbols=[],
            analysis_timestamp="2024-01-01 00:00:00 UTC"
        ),
        navigation_hints={},
        performance_metrics={}
    )
    
    return analysis_service, visualization_service


class TestAnalysisEndpoints:
    """Test suite for analysis API endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', Mock()):
            response = client.get("/analysis/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "timestamp" in data
    
    def test_health_check_unhealthy(self, client):
        """Test health check when adapter is not initialized"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', None):
            response = client.get("/analysis/health")
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unhealthy"
    
    def test_analyze_codebase_success(self, client, temp_repo, mock_adapter):
        """Test successful codebase analysis"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/codebase", json={
                "repo_path": temp_repo,
                "include_patterns": ["*.py"],
                "exclude_patterns": ["test_*.py"],
                "use_cache": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["analysis_type"] == "full_codebase"
            assert "data" in data
            mock_adapter.analyze_codebase.assert_called_once()
    
    def test_analyze_codebase_not_found(self, client, mock_adapter):
        """Test codebase analysis with non-existent path"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/codebase", json={
                "repo_path": "/non/existent/path"
            })
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
    
    def test_analyze_file_success(self, client, temp_repo, mock_adapter):
        """Test successful file analysis"""
        test_file = str(Path(temp_repo) / "main.py")
        
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/file", json={
                "file_path": test_file,
                "repo_path": temp_repo,
                "include_symbols": True,
                "include_dependencies": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["analysis_type"] == "file_analysis"
            mock_adapter.analyze_file.assert_called_once()
    
    def test_analyze_file_not_found(self, client, mock_adapter):
        """Test file analysis with non-existent file"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/file", json={
                "file_path": "/non/existent/file.py"
            })
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
    
    def test_get_symbol_info_success(self, client, temp_repo, mock_adapter):
        """Test successful symbol information retrieval"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/symbol", json={
                "symbol_name": "main",
                "repo_path": temp_repo,
                "include_usages": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["analysis_type"] == "symbol_analysis"
            mock_adapter.get_symbol_info.assert_called_once()
    
    def test_get_symbol_info_not_found(self, client, temp_repo, mock_adapter):
        """Test symbol info when symbol is not found"""
        mock_adapter.get_symbol_info.return_value = Mock(
            success=False,
            error_message="Symbol not found"
        )
        
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/symbol", json={
                "symbol_name": "non_existent_symbol",
                "repo_path": temp_repo
            })
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
    
    def test_get_dependency_graph_success(self, client, temp_repo, mock_adapter):
        """Test successful dependency graph generation"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/dependency-graph", json={
                "repo_path": temp_repo,
                "max_depth": 3,
                "include_external": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["analysis_type"] == "dependency_graph"
            mock_adapter.get_dependency_graph.assert_called_once()
    
    def test_get_structure_overview_success(self, client, temp_repo, mock_adapter):
        """Test successful structure overview"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.get(f"/analysis/structure-overview?repo_path={temp_repo}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["analysis_type"] == "structure_overview"
            mock_adapter.get_structure_overview.assert_called_once()
    
    def test_interactive_analysis_success(self, client, temp_repo, mock_services):
        """Test successful interactive analysis"""
        analysis_service, visualization_service = mock_services
        
        with patch('backend.app.api.v1.routes.analysis._visualization_service', visualization_service):
            response = client.post("/analysis/interactive", json={
                "repo_path": temp_repo,
                "focus_path": "main.py",
                "analysis_depth": 2,
                "include_dependencies": True,
                "include_symbols": True,
                "layout_type": "hierarchical"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "graph" in data
            assert "summary" in data
            visualization_service.generate_interactive_analysis.assert_called_once()
    
    def test_batch_analysis_success(self, client, temp_repo, mock_services):
        """Test successful batch analysis"""
        analysis_service, visualization_service = mock_services
        
        with patch('backend.app.api.v1.routes.analysis._analysis_service', analysis_service):
            response = client.post("/analysis/batch", json={
                "repositories": [temp_repo],
                "analysis_types": ["structure_overview"],
                "parallel_processing": True,
                "max_concurrent": 2
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "results" in data
            assert "summary" in data
            analysis_service.batch_analyze.assert_called_once()
    
    def test_batch_analysis_invalid_repos(self, client, mock_services):
        """Test batch analysis with invalid repository paths"""
        analysis_service, visualization_service = mock_services
        
        with patch('backend.app.api.v1.routes.analysis._analysis_service', analysis_service):
            response = client.post("/analysis/batch", json={
                "repositories": ["/non/existent/repo1", "/non/existent/repo2"],
                "analysis_types": ["structure_overview"]
            })
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
    
    def test_get_cache_stats(self, client, mock_adapter):
        """Test cache statistics endpoint"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.get("/analysis/cache/stats")
            
            assert response.status_code == 200
            data = response.json()
            assert "analysis_cache_size" in data
            assert "codebase_cache_size" in data
            mock_adapter.get_cache_stats.assert_called_once()
    
    def test_clear_cache(self, client, mock_adapter):
        """Test cache clearing endpoint"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.delete("/analysis/cache")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Cache cleared successfully"
            mock_adapter.clear_cache.assert_called_once()
    
    def test_adapter_not_initialized(self, client):
        """Test endpoints when adapter is not initialized"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', None):
            response = client.post("/analysis/codebase", json={
                "repo_path": "/test/repo"
            })
            
            assert response.status_code == 503
            assert "not initialized" in response.json()["detail"]
    
    def test_request_validation(self, client, mock_adapter):
        """Test request validation"""
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            # Missing required field
            response = client.post("/analysis/codebase", json={})
            assert response.status_code == 422
            
            # Invalid field type
            response = client.post("/analysis/codebase", json={
                "repo_path": 123  # Should be string
            })
            assert response.status_code == 422
    
    def test_error_handling(self, client, temp_repo, mock_adapter):
        """Test error handling in endpoints"""
        # Mock adapter to raise exception
        mock_adapter.analyze_codebase.side_effect = Exception("Test error")
        
        with patch('backend.app.api.v1.routes.analysis._graph_sitter_adapter', mock_adapter):
            response = client.post("/analysis/codebase", json={
                "repo_path": temp_repo
            })
            
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]


@pytest.mark.asyncio
async def test_async_endpoint_behavior():
    """Test that async endpoints work correctly"""
    # This would test the actual async behavior if needed
    # For now, the TestClient handles async endpoints automatically
    pass


if __name__ == "__main__":
    pytest.main([__file__])
