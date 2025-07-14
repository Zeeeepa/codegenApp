# Library Kit Manager CLI

A powerful command-line interface for managing and executing AI-powered development workflows using the Library Kit integration.

## Features

- 🚀 **Workflow Management**: Execute pre-built workflow templates
- 🔧 **Component Integration**: Seamless integration with all library kit components
- ⚙️ **Configuration Management**: Easy setup and configuration
- 📊 **Status Monitoring**: Real-time component health monitoring
- 🎯 **Template System**: Extensible workflow template system

## Installation

### From Source

```bash
cd cli
pip install -e .
```

### Using pip (when published)

```bash
pip install library-kit-manager
```

## Quick Start

### 1. Initialize Configuration

```bash
kit-manager init config --environment development
```

This creates a `library-kit-config.yaml` file with default settings.

### 2. Set Environment Variables

```bash
export CODEGEN_API_TOKEN=your_token_here
```

### 3. Initialize Components

```bash
kit-manager init components
```

### 4. Check Status

```bash
kit-manager status --verbose
```

### 5. Run a Workflow

```bash
kit-manager workflow run code_analysis \
  --repository-url https://github.com/user/repo \
  --target-files src/main.py src/utils.py \
  --output analysis_report.json
```

## Commands

### Initialization

```bash
# Initialize configuration file
kit-manager init config [OPTIONS]

# Initialize and verify components
kit-manager init components
```

### Status & Health

```bash
# Check component status
kit-manager status [--verbose]

# Show version information
kit-manager version
```

### Workflow Management

```bash
# List available workflow templates
kit-manager workflow list

# Run a workflow template
kit-manager workflow run TEMPLATE_ID [OPTIONS]
```

### Configuration

```bash
# Show current configuration
kit-manager config show [--format yaml|json]

# Validate configuration
kit-manager config validate
```

## Workflow Templates

### Code Analysis Workflow

Comprehensive code analysis using AI agents and graph-sitter integration.

```bash
kit-manager workflow run code_analysis \
  --repository-url https://github.com/user/repo \
  --target-files src/main.py src/utils.py \
  --include-refactoring \
  --include-metrics \
  --output results.json
```

**Features:**
- Repository structure analysis
- Detailed code parsing with graph-sitter
- Refactoring recommendations
- Code quality metrics
- Comprehensive reporting

**Components Used:** codegen, graph-sitter

**Duration:** 10-30 minutes

## Configuration

The configuration file (`library-kit-config.yaml`) contains settings for all components:

```yaml
environment: development
debug: true
log_level: DEBUG
version: 1.0.0

max_concurrent_workflows: 5
default_timeout: 300
retry_attempts: 3
retry_delay: 1.0

components:
  codegen:
    name: codegen
    enabled: true
    config:
      api_base_url: ${CODEGEN_API_URL:https://api.codegen.com}
      api_token: ${CODEGEN_API_TOKEN}
      timeout: 30
      max_retries: 3
      rate_limit: 100

  grainchain:
    name: grainchain
    enabled: true
    config:
      default_provider: local
      default_timeout: 300
      max_concurrent_sandboxes: 5
      working_directory: /tmp

  graph_sitter:
    name: graph_sitter
    enabled: true
    config:
      supported_languages: [python, javascript, typescript, java, go]
      cache_enabled: true
      cache_size: 1000
      analysis_timeout: 30

  web_eval_agent:
    name: web_eval_agent
    enabled: true
    config:
      default_timeout: 60
      max_concurrent_evaluations: 5
      evaluation_types: [performance, accessibility, seo]
      device_types: [desktop, mobile]
```

### Environment Variables

- `CODEGEN_API_TOKEN`: Required for codegen API access
- `CODEGEN_API_URL`: Optional, defaults to https://api.codegen.com

## Development

### Setup Development Environment

```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp/cli
pip install -e ".[dev]"
```

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black kit_manager.py
flake8 kit_manager.py
mypy kit_manager.py
```

## Examples

### Basic Code Analysis

```bash
# Quick analysis without refactoring suggestions
kit-manager workflow run code_analysis \
  --repository-url https://github.com/user/repo \
  --target-files src/main.py \
  --no-refactoring \
  --no-metrics
```

### Comprehensive Analysis

```bash
# Full analysis with all features
kit-manager workflow run code_analysis \
  --repository-url https://github.com/user/repo \
  --target-files src/main.py src/utils.py src/models.py \
  --include-refactoring \
  --include-metrics \
  --output comprehensive_analysis.json
```

### Configuration Management

```bash
# Create production configuration
kit-manager init config --environment production

# Validate configuration
kit-manager config validate

# Show configuration in JSON format
kit-manager config show --format json
```

## Troubleshooting

### Common Issues

1. **Configuration not found**
   ```bash
   kit-manager init config
   ```

2. **Component initialization failed**
   ```bash
   kit-manager status --verbose
   ```

3. **API token not set**
   ```bash
   export CODEGEN_API_TOKEN=your_token_here
   ```

### Debug Mode

Enable verbose output for debugging:

```bash
kit-manager --verbose status
kit-manager --verbose workflow run code_analysis ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/Zeeeepa/codegenApp/issues
- Documentation: https://docs.librarykit.dev
- Community: https://discord.gg/librarykit
