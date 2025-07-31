#!/usr/bin/env python3
"""
CodegenApp - AI Agent Run Manager
A comprehensive application for managing AI agent runs with a React frontend and FastAPI backend.
"""

from setuptools import setup, find_packages, Command
import os
import subprocess
import sys
import shutil
from pathlib import Path

# Read the contents of README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

# Read requirements from requirements.txt
def read_requirements():
    requirements = []
    if os.path.exists('requirements.txt'):
        with open('requirements.txt', 'r') as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    return requirements


class BuildFrontendCommand(Command):
    """Custom command to build the React frontend during installation."""
    
    description = 'Build the React frontend'
    user_options = []
    
    def initialize_options(self):
        pass
    
    def finalize_options(self):
        pass
    
    def run(self):
        """Build the frontend using npm."""
        frontend_dir = Path(__file__).parent / 'frontend'
        
        if not frontend_dir.exists():
            print("⚠️  Frontend directory not found, skipping frontend build")
            return
            
        print("🔨 Building React frontend...")
        
        # Check if Node.js is available
        try:
            subprocess.run(['node', '--version'], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js not found. Please install Node.js to build the frontend.")
            print("   Visit: https://nodejs.org/")
            return
            
        # Detect package manager
        package_manager = self._detect_package_manager(frontend_dir)
        
        try:
            # Install dependencies
            print(f"📦 Installing dependencies with {package_manager}...")
            if package_manager == 'npm':
                subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
                subprocess.run(['npm', 'run', 'build'], cwd=frontend_dir, check=True)
            elif package_manager == 'yarn':
                subprocess.run(['yarn', 'install'], cwd=frontend_dir, check=True)
                subprocess.run(['yarn', 'build'], cwd=frontend_dir, check=True)
            elif package_manager == 'pnpm':
                subprocess.run(['pnpm', 'install'], cwd=frontend_dir, check=True)
                subprocess.run(['pnpm', 'run', 'build'], cwd=frontend_dir, check=True)
                
            print("✅ Frontend build completed successfully!")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Frontend build failed: {e}")
            print("   You can manually build the frontend later with:")
            print(f"   cd frontend && {package_manager} install && {package_manager} run build")
    
    def _detect_package_manager(self, frontend_dir):
        """Detect which package manager to use."""
        if (frontend_dir / 'pnpm-lock.yaml').exists():
            return 'pnpm'
        elif (frontend_dir / 'yarn.lock').exists():
            return 'yarn'
        else:
            return 'npm'


class CustomInstallCommand(Command):
    """Custom install command that builds frontend first."""
    
    description = 'Install with frontend build'
    user_options = []
    
    def initialize_options(self):
        pass
    
    def finalize_options(self):
        pass
    
    def run(self):
        """Run frontend build then normal installation."""
        # Build frontend first
        self.run_command('build_frontend')
        
        # Run normal installation
        from setuptools.command.install import install
        install_cmd = install(self.distribution)
        install_cmd.ensure_finalized()
        install_cmd.run()

setup(
    name="codegenapp",
    version="1.0.0",
    author="Zeeeepa",
    author_email="your-email@example.com",
    description="AI Agent Run Manager - Create and manage AI agent runs",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Zeeeepa/codegenApp",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        'dev': [
            'pytest>=6.0',
            'pytest-asyncio>=0.18.0',
            'black>=22.0',
            'flake8>=4.0',
            'mypy>=0.950',
        ],
    },
    entry_points={
        'console_scripts': [
            'codegen=codegenapp.cli:main',
        ],
    },
    cmdclass={
        'build_frontend': BuildFrontendCommand,
        'install': CustomInstallCommand,
    },
    include_package_data=True,
    package_data={
        'codegenapp': [
            'frontend/build/**/*',
            'backend/**/*',
        ],
    },
    zip_safe=False,
)
