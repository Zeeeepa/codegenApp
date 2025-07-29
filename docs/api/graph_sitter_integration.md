# Graph-Sitter Integration Documentation

## Overview

This document describes the comprehensive graph-sitter integration in the CodegenApp, providing advanced code analysis and visual repository structure capabilities.

## Features

### Core Analysis Capabilities

- **Full Codebase Analysis**: Complete repository structure analysis with symbol indexing
- **File-Level Analysis**: Detailed analysis of individual source files
- **Symbol Resolution**: Function, class, and variable detection with usage tracking
- **Dependency Graph Generation**: Import/export relationship mapping
- **Multi-Language Support**: Support for Python, JavaScript, TypeScript, and more

### Visual Interface Support

- **Interactive Repository Exploration**: Visual graph representation of code structure
- **Multiple Layout Algorithms**: Hierarchical, force-directed, circular, and tree layouts
- **Real-time Navigation**: Interactive exploration with focus areas and depth control
- **Performance Optimization**: Caching and efficient rendering for large repositories

## API Endpoints

### Core Analysis Endpoints

#### POST `/api/v1/analysis/codebase`
Analyze an entire repository codebase.

**Request Body:**
```json
{
  "repo_path": "/path/to/repository",
  "include_patterns": ["*.py", "*.js"],
  "exclude_patterns": ["node_modules/*", "*.test.js"],
  "use_cache": true
}
```

**Response:**
```json
{
  "success": true,
  "analysis_type": "full_codebase",
  "data": {
    "total_files": 150,
    "total_lines": 12500,
    "languages": {"py": 80, "js": 70},
    "file_structures": [...],
    "dependency_graph": {...},
    "symbol_index": {...},
    "analysis_timestamp": "2024-01-01 00:00:00 UTC",
    "analysis_duration": 2.5
  }
}
```

#### POST `/api/v1/analysis/file`
Analyze a specific file.

**Request Body:**
```json
{
  "file_path": "/path/to/file.py",
  "repo_path": "/path/to/repository",
  "include_symbols": true,
  "include_dependencies": true
}
```

#### POST `/api/v1/analysis/symbol`
Get detailed information about a specific symbol.

**Request Body:**
```json
{
  "symbol_name": "MyClass",
  "repo_path": "/path/to/repository",
  "file_path": "optional/specific/file.py",
  "include_usages": true
}
```

#### POST `/api/v1/analysis/dependency-graph`
Generate dependency graph for the repository.

**Request Body:**
```json
{
  "repo_path": "/path/to/repository",
  "max_depth": 3,
  "include_external": true
}
```

#### GET `/api/v1/analysis/structure-overview`
Get high-level structure overview.

**Query Parameters:**
- `repo_path`: Repository path to analyze

### Visual Interface Endpoints

#### POST `/api/v1/analysis/interactive`
Generate interactive analysis for visual exploration.

**Request Body:**
```json
{
  "repo_path": "/path/to/repository",
  "focus_path": "src/main",
  "analysis_depth": 2,
  "include_dependencies": true,
  "include_symbols": true,
  "layout_type": "hierarchical"
}
```

**Response:**
```json
{
  "graph": {
    "nodes": [...],
    "edges": [...],
    "layout_hints": {...}
  },
  "summary": {...},
  "navigation_hints": {...},
  "performance_metrics": {...}
}
```

### Batch Processing

#### POST `/api/v1/analysis/batch`
Analyze multiple repositories in parallel.

**Request Body:**
```json
{
  "repositories": ["/repo1", "/repo2"],
  "analysis_types": ["structure_overview", "dependency_graph"],
  "parallel_processing": true,
  "max_concurrent": 3
}
```

### Cache Management

#### GET `/api/v1/analysis/cache/stats`
Get cache statistics.

#### DELETE `/api/v1/analysis/cache`
Clear all cached analysis data.

## Architecture

### Components

1. **GraphSitterAdapter**: Core adapter for graph-sitter integration
2. **AnalysisService**: High-level analysis orchestration
3. **VisualizationService**: Visual graph generation and layout
4. **API Routes**: FastAPI endpoints for HTTP access

### Data Models

#### SymbolInfo
```python
@dataclass
class SymbolInfo:
    name: str
    type: str  # function, class, variable, etc.
    file_path: str
    line_number: Optional[int]
    parameters: List[str]
    return_type: Optional[str]
    docstring: Optional[str]
    usages: List[Dict[str, Any]]
```

#### FileStructure
```python
@dataclass
class FileStructure:
    path: str
    language: str
    functions: List[SymbolInfo]
    classes: List[SymbolInfo]
    imports: List[Dict[str, str]]
    dependencies: List[str]
    lines_of_code: int
    complexity_score: float
```

#### CodebaseStructure
```python
@dataclass
class CodebaseStructure:
    total_files: int
    total_lines: int
    languages: Dict[str, int]
    file_structures: List[FileStructure]
    dependency_graph: Dict[str, List[str]]
    symbol_index: Dict[str, SymbolInfo]
    analysis_timestamp: str
    analysis_duration: float
```

## Usage Examples

### Basic Repository Analysis

```python
import httpx

# Analyze a repository
response = httpx.post("http://localhost:8001/api/v1/analysis/codebase", json={
    "repo_path": "/path/to/my/project",
    "include_patterns": ["*.py"],
    "exclude_patterns": ["tests/*", "__pycache__/*"]
})

analysis_result = response.json()
print(f"Analyzed {analysis_result['data']['total_files']} files")
print(f"Found {len(analysis_result['data']['symbol_index'])} symbols")
```

### Interactive Visualization

```python
# Generate interactive visualization
response = httpx.post("http://localhost:8001/api/v1/analysis/interactive", json={
    "repo_path": "/path/to/my/project",
    "focus_path": "src/core",
    "analysis_depth": 3,
    "layout_type": "hierarchical"
})

visualization = response.json()
nodes = visualization["graph"]["nodes"]
edges = visualization["graph"]["edges"]

# Use nodes and edges to render interactive graph in frontend
```

### Symbol Navigation

```python
# Find a specific function
response = httpx.post("http://localhost:8001/api/v1/analysis/symbol", json={
    "symbol_name": "process_data",
    "repo_path": "/path/to/my/project",
    "include_usages": True
})

symbol_info = response.json()
print(f"Function found at {symbol_info['data']['file_path']}:{symbol_info['data']['line_number']}")
print(f"Used in {len(symbol_info['data']['usages'])} places")
```

## Configuration

### Environment Variables

- `GRAPH_SITTER_CACHE_ENABLED`: Enable/disable caching (default: true)
- `GRAPH_SITTER_MAX_FILE_SIZE`: Maximum file size to analyze in bytes (default: 1MB)
- `GRAPH_SITTER_ANALYSIS_TIMEOUT`: Analysis timeout in seconds (default: 30)

### Settings

```python
# In backend/app/config/settings.py
graph_sitter_config = {
    "supported_languages": ["python", "javascript", "typescript", "go", "rust"],
    "cache_parsed_trees": True,
    "max_file_size": 1024 * 1024,  # 1MB
    "analysis_timeout": 30,
    "max_concurrent_analyses": 5
}
```

## Performance Considerations

### Caching Strategy

- **Analysis Cache**: Results of expensive analysis operations
- **Codebase Cache**: Parsed codebase objects for reuse
- **Symbol Index Cache**: Pre-built symbol indexes for fast lookup

### Optimization Tips

1. **Use Include/Exclude Patterns**: Filter files to reduce analysis time
2. **Enable Caching**: Reuse analysis results for unchanged repositories
3. **Limit Analysis Depth**: Use appropriate depth levels for interactive analysis
4. **Batch Processing**: Analyze multiple repositories efficiently

### Memory Management

- Large repositories are processed in chunks
- Configurable file size limits prevent memory issues
- Automatic cleanup of old cache entries

## Error Handling

### Common Error Scenarios

1. **Repository Not Found**: 404 error with clear message
2. **Graph-Sitter Not Available**: 503 error with installation instructions
3. **Analysis Timeout**: 408 error with timeout information
4. **Memory Limit Exceeded**: 413 error with size recommendations

### Error Response Format

```json
{
  "success": false,
  "error_message": "Repository path not found: /invalid/path",
  "error_type": "FileNotFoundError",
  "suggestions": [
    "Verify the repository path exists",
    "Check file permissions"
  ]
}
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run only unit tests
pytest tests/unit/

# Run integration tests
pytest tests/integration/

# Run with coverage
pytest --cov=backend/app --cov-report=html
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Large repository analysis
- **Mock Tests**: Testing without graph-sitter dependency

## Troubleshooting

### Common Issues

1. **Graph-sitter Installation**
   ```bash
   pip install graph-sitter
   ```

2. **Language Parser Missing**
   - Install specific language parsers as needed
   - Check supported languages in configuration

3. **Performance Issues**
   - Reduce analysis depth
   - Use more restrictive file patterns
   - Enable caching
   - Increase timeout values

4. **Memory Issues**
   - Reduce max_file_size setting
   - Use exclude patterns for large files
   - Process repositories in smaller batches

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger("backend.app.services.adapters.graph_sitter_adapter").setLevel(logging.DEBUG)
```

## Future Enhancements

### Planned Features

1. **Real-time Analysis**: WebSocket support for live updates
2. **Advanced Metrics**: Code quality and complexity analysis
3. **Custom Parsers**: Support for additional languages
4. **Export Formats**: JSON, GraphML, DOT format exports
5. **Integration APIs**: Webhooks for CI/CD integration

### Contributing

See the main project README for contribution guidelines. When working on graph-sitter integration:

1. Add tests for new analysis features
2. Update documentation for API changes
3. Consider performance impact of new features
4. Maintain backward compatibility where possible

## Support

For issues related to graph-sitter integration:

1. Check this documentation first
2. Review test cases for usage examples
3. Check GitHub issues for known problems
4. Create detailed bug reports with repository examples
