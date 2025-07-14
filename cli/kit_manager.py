#!/usr/bin/env python3
"""
Library Kit Manager CLI

Command-line interface for managing and using the library kit integration.
"""

import asyncio
import click
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.integration.integration_manager import IntegrationManager
from app.core.integration.config_manager import ConfigManager
from app.workflows.templates.code_analysis_workflow import CodeAnalysisWorkflow


@click.group()
@click.option('--config', '-c', type=click.Path(exists=True), help='Configuration file path')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
@click.pass_context
def cli(ctx, config, verbose):
    """Library Kit Manager - Manage and execute AI-powered development workflows"""
    ctx.ensure_object(dict)
    ctx.obj['config_file'] = Path(config) if config else None
    ctx.obj['verbose'] = verbose
    
    if verbose:
        click.echo("🚀 Library Kit Manager initialized")


@cli.group()
def init():
    """Initialize library kit components"""
    pass


@init.command()
@click.option('--config-file', '-c', type=click.Path(), default='library-kit-config.yaml', 
              help='Configuration file to create')
@click.option('--environment', '-e', default='development', 
              type=click.Choice(['development', 'staging', 'production']),
              help='Environment to configure for')
@click.pass_context
def config(ctx, config_file, environment):
    """Initialize library kit configuration"""
    config_path = Path(config_file)
    
    if config_path.exists():
        if not click.confirm(f"Configuration file {config_path} already exists. Overwrite?"):
            return
    
    # Create default configuration
    default_config = {
        'environment': environment,
        'debug': environment == 'development',
        'log_level': 'DEBUG' if environment == 'development' else 'INFO',
        'version': '1.0.0',
        
        # Core settings
        'max_concurrent_workflows': 10 if environment == 'production' else 5,
        'default_timeout': 300,
        'retry_attempts': 3,
        'retry_delay': 1.0,
        
        # Component configurations
        'components': {
            'codegen': {
                'name': 'codegen',
                'enabled': True,
                'config': {
                    'api_base_url': '${CODEGEN_API_URL:https://api.codegen.com}',
                    'api_token': '${CODEGEN_API_TOKEN}',
                    'timeout': 30,
                    'max_retries': 3,
                    'rate_limit': 100 if environment == 'development' else 1000
                }
            },
            'grainchain': {
                'name': 'grainchain',
                'enabled': True,
                'config': {
                    'default_provider': 'local' if environment == 'development' else 'docker',
                    'default_timeout': 300,
                    'max_concurrent_sandboxes': 5 if environment == 'development' else 50,
                    'working_directory': '/tmp',
                    'environment_vars': {}
                }
            },
            'graph_sitter': {
                'name': 'graph_sitter',
                'enabled': True,
                'config': {
                    'supported_languages': ['python', 'javascript', 'typescript', 'java', 'go'],
                    'cache_enabled': True,
                    'cache_size': 1000,
                    'analysis_timeout': 30
                }
            },
            'web_eval_agent': {
                'name': 'web_eval_agent',
                'enabled': True,
                'config': {
                    'default_timeout': 60,
                    'max_concurrent_evaluations': 5,
                    'evaluation_types': ['performance', 'accessibility', 'seo'],
                    'device_types': ['desktop', 'mobile']
                }
            }
        }
    }
    
    # Write configuration file
    with open(config_path, 'w') as f:
        yaml.dump(default_config, f, default_flow_style=False, indent=2)
    
    click.echo(f"✅ Created configuration file: {config_path}")
    click.echo(f"📝 Environment: {environment}")
    click.echo("\n🔧 Next steps:")
    click.echo("1. Set required environment variables:")
    click.echo("   export CODEGEN_API_TOKEN=your_token_here")
    click.echo("2. Review and customize the configuration")
    click.echo("3. Run 'kit-manager status' to verify setup")


@init.command()
@click.pass_context
def components(ctx):
    """Initialize and verify all library kit components"""
    config_file = ctx.obj.get('config_file')
    
    async def init_components():
        try:
            click.echo("🔧 Initializing library kit components...")
            
            # Initialize integration manager
            integration_manager = IntegrationManager(config_file)
            await integration_manager.initialize()
            
            # Get component status
            health_status = await integration_manager.get_health_status()
            
            click.echo("\n📊 Component Status:")
            for component, status in health_status.get('components', {}).items():
                status_icon = "✅" if status.get('status') == 'healthy' else "⚠️"
                click.echo(f"  {status_icon} {component}: {status.get('status', 'unknown')}")
            
            overall_status = health_status.get('overall_status', 'unknown')
            status_icon = "✅" if overall_status == 'healthy' else "⚠️"
            click.echo(f"\n{status_icon} Overall Status: {overall_status}")
            
            await integration_manager.shutdown()
            
        except Exception as e:
            click.echo(f"❌ Initialization failed: {e}")
            sys.exit(1)
    
    asyncio.run(init_components())


@cli.command()
@click.pass_context
def status(ctx):
    """Check status of library kit components"""
    config_file = ctx.obj.get('config_file')
    verbose = ctx.obj.get('verbose', False)
    
    async def check_status():
        try:
            integration_manager = IntegrationManager(config_file)
            await integration_manager.initialize()
            
            health_status = await integration_manager.get_health_status()
            component_info = integration_manager.get_component_info()
            
            # Display overall status
            overall_status = health_status.get('overall_status', 'unknown')
            status_icon = "✅" if overall_status == 'healthy' else "⚠️"
            click.echo(f"{status_icon} Library Kit Status: {overall_status}")
            
            if verbose:
                startup_time = health_status.get('startup_time')
                if startup_time:
                    click.echo(f"⏱️  Startup Time: {startup_time:.2f}s")
            
            # Display component status
            click.echo("\n📊 Components:")
            for component, status in health_status.get('components', {}).items():
                component_status = status.get('status', 'unknown')
                status_icon = "✅" if component_status == 'healthy' else "⚠️"
                click.echo(f"  {status_icon} {component}: {component_status}")
                
                if verbose and 'message' in status:
                    click.echo(f"      {status['message']}")
            
            # Display metrics if verbose
            if verbose and 'metrics' in health_status:
                click.echo("\n📈 Metrics:")
                for metric_name, metric_data in health_status['metrics'].items():
                    if isinstance(metric_data, dict):
                        click.echo(f"  {metric_name}:")
                        for key, value in metric_data.items():
                            click.echo(f"    {key}: {value}")
                    else:
                        click.echo(f"  {metric_name}: {metric_data}")
            
            await integration_manager.shutdown()
            
        except Exception as e:
            click.echo(f"❌ Status check failed: {e}")
            sys.exit(1)
    
    asyncio.run(check_status())


@cli.group()
def workflow():
    """Workflow management commands"""
    pass


@workflow.command()
def list():
    """List available workflow templates"""
    templates = [
        {
            'name': 'Code Analysis Workflow',
            'id': 'code_analysis',
            'description': 'Comprehensive code analysis using AI agents and graph-sitter',
            'components': ['codegen', 'graph_sitter'],
            'duration': '10-30 minutes'
        },
        # Add more templates as they're implemented
    ]
    
    click.echo("📋 Available Workflow Templates:\n")
    for template in templates:
        click.echo(f"🔧 {template['name']} ({template['id']})")
        click.echo(f"   {template['description']}")
        click.echo(f"   Components: {', '.join(template['components'])}")
        click.echo(f"   Duration: {template['duration']}\n")


@workflow.command()
@click.argument('template_id')
@click.option('--repository-url', '-r', required=True, help='Repository URL to analyze')
@click.option('--target-files', '-f', multiple=True, required=True, help='Files to analyze')
@click.option('--output', '-o', type=click.Path(), help='Output file for results')
@click.option('--include-refactoring/--no-refactoring', default=True, 
              help='Include refactoring recommendations')
@click.option('--include-metrics/--no-metrics', default=True,
              help='Include detailed code metrics')
@click.pass_context
def run(ctx, template_id, repository_url, target_files, output, include_refactoring, include_metrics):
    """Run a workflow template"""
    config_file = ctx.obj.get('config_file')
    verbose = ctx.obj.get('verbose', False)
    
    if template_id == 'code_analysis':
        async def run_code_analysis():
            try:
                click.echo(f"🚀 Starting Code Analysis Workflow")
                click.echo(f"📁 Repository: {repository_url}")
                click.echo(f"📄 Target Files: {', '.join(target_files)}")
                
                # Initialize integration manager
                integration_manager = IntegrationManager(config_file)
                await integration_manager.initialize()
                
                # Create workflow configuration
                from app.workflows.templates.code_analysis_workflow import CodeAnalysisWorkflowConfig
                
                config = CodeAnalysisWorkflowConfig(
                    repository_url=repository_url,
                    target_files=list(target_files),
                    include_refactoring=include_refactoring,
                    include_metrics=include_metrics
                )
                
                # Create and execute workflow
                workflow = CodeAnalysisWorkflow.create_workflow(config)
                
                # This would integrate with the enhanced codegen adapter
                # For now, show what would happen
                click.echo(f"\n📋 Workflow Steps:")
                for i, step in enumerate(workflow.steps, 1):
                    click.echo(f"  {i}. {step.step_name}")
                    if verbose:
                        click.echo(f"     Dependencies: {', '.join(step.dependencies) if step.dependencies else 'None'}")
                        click.echo(f"     Timeout: {step.timeout}s")
                
                click.echo(f"\n⏱️  Estimated Duration: 10-30 minutes")
                click.echo(f"🔧 Components Used: codegen, graph_sitter")
                
                if output:
                    click.echo(f"💾 Results will be saved to: {output}")
                
                # In a real implementation, this would execute the workflow
                click.echo("\n✅ Workflow configuration created successfully")
                click.echo("🔄 Workflow execution would start here...")
                
                await integration_manager.shutdown()
                
            except Exception as e:
                click.echo(f"❌ Workflow execution failed: {e}")
                sys.exit(1)
        
        asyncio.run(run_code_analysis())
    else:
        click.echo(f"❌ Unknown workflow template: {template_id}")
        click.echo("Run 'kit-manager workflow list' to see available templates")
        sys.exit(1)


@cli.group()
def config_cmd():
    """Configuration management commands"""
    pass


@config_cmd.command()
@click.option('--format', '-f', type=click.Choice(['yaml', 'json']), default='yaml',
              help='Output format')
@click.pass_context
def show(ctx, format):
    """Show current configuration"""
    config_file = ctx.obj.get('config_file')
    
    if not config_file or not config_file.exists():
        click.echo("❌ No configuration file found")
        click.echo("Run 'kit-manager init config' to create one")
        sys.exit(1)
    
    try:
        config_manager = ConfigManager(config_file)
        config_manager.load_config()
        
        config_data = config_manager.export_config(format)
        click.echo(config_data)
        
    except Exception as e:
        click.echo(f"❌ Failed to load configuration: {e}")
        sys.exit(1)


@config_cmd.command()
@click.pass_context
def validate(ctx):
    """Validate configuration file"""
    config_file = ctx.obj.get('config_file')
    
    if not config_file or not config_file.exists():
        click.echo("❌ No configuration file found")
        sys.exit(1)
    
    try:
        config_manager = ConfigManager(config_file)
        config_manager.load_config()
        
        errors = config_manager.validate_config()
        
        if not errors:
            click.echo("✅ Configuration is valid")
        else:
            click.echo("⚠️  Configuration validation warnings:")
            for error in errors:
                click.echo(f"  - {error}")
        
    except Exception as e:
        click.echo(f"❌ Configuration validation failed: {e}")
        sys.exit(1)


@cli.command()
def version():
    """Show library kit version information"""
    click.echo("📦 Library Kit Manager")
    click.echo("Version: 1.0.0")
    click.echo("Components:")
    click.echo("  - strands-agents: Workflow orchestration")
    click.echo("  - grainchain: Sandbox management")
    click.echo("  - graph-sitter: Code analysis")
    click.echo("  - web-eval-agent: Web evaluation")
    click.echo("  - codegen SDK: AI agent communication")


if __name__ == '__main__':
    cli()
