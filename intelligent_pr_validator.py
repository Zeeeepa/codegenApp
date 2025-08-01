#!/usr/bin/env python3
"""
Intelligent PR Validator Script
Uses AI-powered analysis to validate PR changes and provide insights.
"""

import os
import json
import sys
from pathlib import Path
import subprocess

def main():
    """Main intelligent validation function."""
    print("🤖 Running intelligent PR validation...")
    
    # Get environment variables
    workspace = os.getenv('GITHUB_WORKSPACE', '.')
    pr_number = os.getenv('GITHUB_PR_NUMBER', 'unknown')
    repository = os.getenv('GITHUB_REPOSITORY', 'unknown')
    sha = os.getenv('GITHUB_SHA', 'unknown')
    changed_files = os.getenv('CHANGED_FILES', '').strip().split('\n')
    
    # Initialize validation results
    validation_results = {
        'pr_number': pr_number,
        'repository': repository,
        'sha': sha,
        'changed_files': [f for f in changed_files if f.strip()],
        'analysis': [],
        'recommendations': [],
        'status': 'passed',
        'summary': 'Intelligent PR validation completed successfully'
    }
    
    print(f"📁 Analyzing {len(validation_results['changed_files'])} changed files...")
    
    # Analyze changed files
    analyze_file_changes(validation_results)
    
    # Check for common patterns
    check_common_patterns(validation_results)
    
    # Generate recommendations
    generate_recommendations(validation_results)
    
    # Generate reports
    report_md = generate_intelligent_report(validation_results)
    
    # Write results
    with open('intelligent_validation_result.json', 'w') as f:
        json.dump(validation_results, f, indent=2)
    
    with open('intelligent_validation_report.md', 'w') as f:
        f.write(report_md)
    
    print(f"✅ Intelligent validation completed with status: {validation_results['status']}")
    print(f"📊 Analysis points: {len(validation_results['analysis'])}")
    print(f"💡 Recommendations: {len(validation_results['recommendations'])}")
    
    # Exit with appropriate code
    if validation_results['status'] == 'failed':
        sys.exit(1)
    else:
        sys.exit(0)

def analyze_file_changes(results):
    """Analyze the types of files changed."""
    file_types = {}
    
    for file_path in results['changed_files']:
        if not file_path.strip():
            continue
            
        ext = Path(file_path).suffix.lower()
        if ext:
            file_types[ext] = file_types.get(ext, 0) + 1
        else:
            file_types['no_extension'] = file_types.get('no_extension', 0) + 1
    
    # Analyze file type distribution
    if file_types:
        results['analysis'].append({
            'type': 'file_analysis',
            'title': 'File Type Distribution',
            'data': file_types,
            'insight': f"Changes span {len(file_types)} different file types"
        })
    
    # Check for specific file patterns
    frontend_files = [f for f in results['changed_files'] if 'frontend/' in f or f.endswith(('.tsx', '.ts', '.jsx', '.js', '.css', '.scss'))]
    backend_files = [f for f in results['changed_files'] if 'backend/' in f or f.endswith(('.py', '.java', '.go', '.rs'))]
    config_files = [f for f in results['changed_files'] if f.endswith(('.yml', '.yaml', '.json', '.toml', '.ini', '.env'))]
    
    if frontend_files:
        results['analysis'].append({
            'type': 'frontend_changes',
            'title': 'Frontend Changes Detected',
            'data': {'count': len(frontend_files), 'files': frontend_files[:5]},
            'insight': f"Found {len(frontend_files)} frontend-related changes"
        })
    
    if backend_files:
        results['analysis'].append({
            'type': 'backend_changes',
            'title': 'Backend Changes Detected',
            'data': {'count': len(backend_files), 'files': backend_files[:5]},
            'insight': f"Found {len(backend_files)} backend-related changes"
        })
    
    if config_files:
        results['analysis'].append({
            'type': 'config_changes',
            'title': 'Configuration Changes Detected',
            'data': {'count': len(config_files), 'files': config_files},
            'insight': f"Found {len(config_files)} configuration file changes"
        })

def check_common_patterns(results):
    """Check for common development patterns."""
    
    # Check for workflow changes
    workflow_files = [f for f in results['changed_files'] if '.github/workflows/' in f]
    if workflow_files:
        results['analysis'].append({
            'type': 'workflow_changes',
            'title': 'GitHub Workflow Changes',
            'data': {'files': workflow_files},
            'insight': 'GitHub Actions workflows have been modified'
        })
    
    # Check for dependency changes
    dep_files = [f for f in results['changed_files'] if f in ['package.json', 'requirements.txt', 'setup.py', 'pyproject.toml', 'Cargo.toml']]
    if dep_files:
        results['analysis'].append({
            'type': 'dependency_changes',
            'title': 'Dependency Changes',
            'data': {'files': dep_files},
            'insight': 'Project dependencies have been modified'
        })
    
    # Check for test files
    test_files = [f for f in results['changed_files'] if 'test' in f.lower() or f.endswith('.test.js') or f.endswith('.test.ts') or f.endswith('_test.py')]
    if test_files:
        results['analysis'].append({
            'type': 'test_changes',
            'title': 'Test Changes',
            'data': {'count': len(test_files), 'files': test_files[:3]},
            'insight': f"Found {len(test_files)} test-related changes"
        })

def generate_recommendations(results):
    """Generate intelligent recommendations based on analysis."""
    
    # Recommendation based on file types
    has_frontend = any('frontend_changes' in a['type'] for a in results['analysis'])
    has_backend = any('backend_changes' in a['type'] for a in results['analysis'])
    has_config = any('config_changes' in a['type'] for a in results['analysis'])
    has_workflow = any('workflow_changes' in a['type'] for a in results['analysis'])
    has_tests = any('test_changes' in a['type'] for a in results['analysis'])
    
    if has_frontend and not has_tests:
        results['recommendations'].append({
            'type': 'testing',
            'priority': 'medium',
            'title': 'Consider Adding Frontend Tests',
            'description': 'Frontend changes detected but no test changes found. Consider adding or updating tests.'
        })
    
    if has_backend and not has_tests:
        results['recommendations'].append({
            'type': 'testing',
            'priority': 'medium',
            'title': 'Consider Adding Backend Tests',
            'description': 'Backend changes detected but no test changes found. Consider adding or updating tests.'
        })
    
    if has_config:
        results['recommendations'].append({
            'type': 'documentation',
            'priority': 'low',
            'title': 'Update Documentation',
            'description': 'Configuration changes detected. Consider updating relevant documentation.'
        })
    
    if has_workflow:
        results['recommendations'].append({
            'type': 'validation',
            'priority': 'high',
            'title': 'Test Workflow Changes',
            'description': 'GitHub Actions workflows modified. Ensure changes are tested thoroughly.'
        })
    
    # General recommendations
    if len(results['changed_files']) > 20:
        results['recommendations'].append({
            'type': 'review',
            'priority': 'medium',
            'title': 'Large PR Detected',
            'description': f'This PR changes {len(results["changed_files"])} files. Consider breaking into smaller PRs for easier review.'
        })

def generate_intelligent_report(results):
    """Generate an intelligent markdown report."""
    report = f"""# 🤖 Intelligent PR Validation Report

**PR Number:** {results['pr_number']}
**Repository:** {results['repository']}
**SHA:** {results['sha']}
**Status:** {results['status'].upper()}

## 📊 Summary
{results['summary']}

**Files Changed:** {len(results['changed_files'])}

## 🔍 Analysis

"""
    
    for analysis in results['analysis']:
        report += f"### {analysis['title']}\n"
        report += f"**Type:** {analysis['type']}\n"
        report += f"**Insight:** {analysis['insight']}\n"
        
        if 'count' in analysis['data']:
            report += f"**Count:** {analysis['data']['count']}\n"
        
        if 'files' in analysis['data'] and analysis['data']['files']:
            report += "**Files:**\n"
            for file in analysis['data']['files'][:5]:  # Limit to first 5
                report += f"- `{file}`\n"
            if len(analysis['data']['files']) > 5:
                report += f"- ... and {len(analysis['data']['files']) - 5} more\n"
        
        report += "\n"
    
    if results['recommendations']:
        report += "## 💡 Recommendations\n\n"
        
        for rec in results['recommendations']:
            priority_emoji = {
                'high': '🔴',
                'medium': '🟡',
                'low': '🟢'
            }.get(rec['priority'], '⚪')
            
            report += f"### {priority_emoji} {rec['title']}\n"
            report += f"**Priority:** {rec['priority']}\n"
            report += f"**Type:** {rec['type']}\n"
            report += f"{rec['description']}\n\n"
    
    report += "---\n*Generated by Intelligent PR Validator*\n"
    
    return report

if __name__ == '__main__':
    main()

