"""
Example usage of the upgraded Graph-Sitter integration
Demonstrates how to use the new analysis capabilities
"""

import asyncio
import json
from pathlib import Path

# Import the new graph-sitter adapter
from backend.app.services.adapters.graph_sitter_adapter import (
    GraphSitterAdapter, AnalysisType
)
from backend.app.services.analysis_service import AnalysisService
from backend.app.services.visualization_service import VisualizationService


async def analyze_repository_example():
    """Example of comprehensive repository analysis"""
    
    # Initialize the adapter
    adapter = GraphSitterAdapter(cache_enabled=True)
    
    # Example repository path (replace with actual path)
    repo_path = "/path/to/your/repository"
    
    print("🔍 Starting repository analysis...")
    
    # 1. Get structure overview
    print("\n📊 Getting structure overview...")
    overview_result = await adapter.get_structure_overview(repo_path)
    
    if overview_result.success:
        overview = overview_result.data
        print(f"✅ Found {overview['total_files']} files")
        print(f"📁 File types: {overview['file_types']}")
        print(f"🔧 Top symbols: {len(overview['top_level_symbols'])}")
    else:
        print(f"❌ Overview failed: {overview_result.error_message}")
        return
    
    # 2. Analyze specific file
    print("\n📄 Analyzing specific file...")
    # Find a Python file to analyze
    python_files = [f for f in overview['top_level_symbols'] 
                   if f.get('file', '').endswith('.py')]
    
    if python_files:
        file_to_analyze = python_files[0]['file']
        file_result = await adapter.analyze_file(file_to_analyze, repo_path)
        
        if file_result.success:
            file_data = file_result.data
            print(f"✅ Analyzed {file_data.path}")
            print(f"🔧 Functions: {len(file_data.functions)}")
            print(f"📦 Classes: {len(file_data.classes)}")
            print(f"📥 Imports: {len(file_data.imports)}")
            print(f"📏 Lines of code: {file_data.lines_of_code}")
        else:
            print(f"❌ File analysis failed: {file_result.error_message}")
    
    # 3. Generate dependency graph
    print("\n🕸️ Generating dependency graph...")
    deps_result = await adapter.get_dependency_graph(repo_path)
    
    if deps_result.success:
        deps_data = deps_result.data
        dep_graph = deps_data['dependency_graph']
        print(f"✅ Generated dependency graph with {len(dep_graph)} files")
        
        # Show some dependencies
        for file_path, dependencies in list(dep_graph.items())[:3]:
            if dependencies:
                print(f"📄 {file_path} depends on: {', '.join(dependencies[:3])}")
    else:
        print(f"❌ Dependency analysis failed: {deps_result.error_message}")
    
    # 4. Search for specific symbol
    print("\n🔍 Searching for symbols...")
    symbol_result = await adapter.get_symbol_info("main", repo_path)
    
    if symbol_result.success:
        symbol_data = symbol_result.data
        print(f"✅ Found symbol '{symbol_data.name}' in {symbol_data.file_path}")
        print(f"📍 Type: {symbol_data.type}")
        if symbol_data.line_number:
            print(f"📏 Line: {symbol_data.line_number}")
    else:
        print(f"❌ Symbol search failed: {symbol_result.error_message}")
    
    # 5. Full codebase analysis
    print("\n🏗️ Performing full codebase analysis...")
    full_result = await adapter.analyze_codebase(
        repo_path,
        include_patterns=["*.py", "*.js", "*.ts"],
        exclude_patterns=["node_modules/*", "__pycache__/*", "*.test.*"]
    )
    
    if full_result.success:
        codebase_data = full_result.data
        print(f"✅ Full analysis completed in {codebase_data.analysis_duration:.2f}s")
        print(f"📊 Total files: {codebase_data.total_files}")
        print(f"📏 Total lines: {codebase_data.total_lines}")
        print(f"🌐 Languages: {codebase_data.languages}")
        print(f"🔧 Symbols indexed: {len(codebase_data.symbol_index)}")
    else:
        print(f"❌ Full analysis failed: {full_result.error_message}")
    
    print("\n✨ Analysis complete!")


async def visualization_example():
    """Example of visualization service usage"""
    
    # Initialize services
    adapter = GraphSitterAdapter(cache_enabled=True)
    visualization_service = VisualizationService(adapter)
    
    repo_path = "/path/to/your/repository"
    
    print("🎨 Generating interactive visualization...")
    
    # Generate interactive analysis
    interactive_result = await visualization_service.generate_interactive_analysis(
        repo_path=repo_path,
        focus_path="src",  # Focus on src directory
        analysis_depth=2,
        include_dependencies=True,
        include_symbols=True,
        layout_type="hierarchical"
    )
    
    print(f"✅ Generated visualization with:")
    print(f"🔵 Nodes: {len(interactive_result.graph.nodes)}")
    print(f"🔗 Edges: {len(interactive_result.graph.edges)}")
    print(f"⚡ Layout: {interactive_result.graph.layout_hints.get('algorithm', 'unknown')}")
    
    # Show some navigation hints
    hints = interactive_result.navigation_hints
    if hints.get('entry_points'):
        print(f"🚪 Entry points found: {len(hints['entry_points'])}")
    
    if hints.get('complexity_hotspots'):
        print(f"🔥 Complexity hotspots: {len(hints['complexity_hotspots'])}")
    
    # Performance metrics
    metrics = interactive_result.performance_metrics
    print(f"⏱️ Analysis duration: {metrics.get('analysis_duration', 0):.2f}s")
    print(f"💾 Cache efficiency: {metrics.get('cache_efficiency', 0):.2f}")


async def batch_analysis_example():
    """Example of batch analysis for multiple repositories"""
    
    adapter = GraphSitterAdapter(cache_enabled=True)
    analysis_service = AnalysisService(adapter)
    
    # Example repository paths
    repositories = [
        "/path/to/repo1",
        "/path/to/repo2",
        "/path/to/repo3"
    ]
    
    print("📦 Starting batch analysis...")
    
    # Perform batch analysis
    batch_result = await analysis_service.batch_analyze(
        repositories=repositories,
        analysis_types=["structure_overview", "dependency_graph"],
        parallel_processing=True,
        max_concurrent=2
    )
    
    print(f"✅ Batch analysis completed in {batch_result.total_duration:.2f}s")
    print(f"📊 Successful: {len(batch_result.results)}")
    print(f"❌ Failed: {len(batch_result.failed_repositories)}")
    
    # Show summary
    summary = batch_result.summary
    print(f"📈 Success rate: {summary['success_rate']:.2%}")
    print(f"🌐 Languages found: {summary.get('language_distribution', {})}")


def api_usage_example():
    """Example of using the API endpoints"""
    
    import httpx
    
    base_url = "http://localhost:8001/api/v1/analysis"
    
    # Example API calls
    examples = [
        {
            "name": "Structure Overview",
            "method": "GET",
            "url": f"{base_url}/structure-overview",
            "params": {"repo_path": "/path/to/repository"}
        },
        {
            "name": "File Analysis",
            "method": "POST",
            "url": f"{base_url}/file",
            "json": {
                "file_path": "/path/to/file.py",
                "repo_path": "/path/to/repository",
                "include_symbols": True
            }
        },
        {
            "name": "Symbol Search",
            "method": "POST",
            "url": f"{base_url}/symbol",
            "json": {
                "symbol_name": "MyClass",
                "repo_path": "/path/to/repository"
            }
        },
        {
            "name": "Interactive Analysis",
            "method": "POST",
            "url": f"{base_url}/interactive",
            "json": {
                "repo_path": "/path/to/repository",
                "analysis_depth": 2,
                "layout_type": "hierarchical"
            }
        }
    ]
    
    print("🌐 API Usage Examples:")
    print("=" * 50)
    
    for example in examples:
        print(f"\n📡 {example['name']}")
        print(f"Method: {example['method']}")
        print(f"URL: {example['url']}")
        
        if 'params' in example:
            print(f"Params: {example['params']}")
        
        if 'json' in example:
            print(f"JSON: {json.dumps(example['json'], indent=2)}")
        
        print(f"Example curl:")
        if example['method'] == 'GET':
            params = "&".join([f"{k}={v}" for k, v in example.get('params', {}).items()])
            print(f"curl '{example['url']}?{params}'")
        else:
            json_data = json.dumps(example.get('json', {}))
            print(f"curl -X {example['method']} '{example['url']}' \\")
            print(f"  -H 'Content-Type: application/json' \\")
            print(f"  -d '{json_data}'")


async def main():
    """Main example runner"""
    
    print("🚀 Graph-Sitter Integration Examples")
    print("=" * 50)
    
    try:
        # Run examples
        await analyze_repository_example()
        print("\n" + "=" * 50)
        
        await visualization_example()
        print("\n" + "=" * 50)
        
        await batch_analysis_example()
        print("\n" + "=" * 50)
        
        api_usage_example()
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")
        print("💡 Make sure to:")
        print("   1. Install graph-sitter: pip install graph-sitter")
        print("   2. Update repository paths in examples")
        print("   3. Start the FastAPI server for API examples")


if __name__ == "__main__":
    asyncio.run(main())
