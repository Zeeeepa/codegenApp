#!/usr/bin/env python3
"""
Installation script for CodegenApp
This script handles building the frontend and setting up the package
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path


def run_command(cmd, cwd=None, check=True):
    """Run a command and handle errors"""
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            check=check,
            capture_output=True,
            text=True,
            shell=isinstance(cmd, str)
        )
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        if check:
            sys.exit(1)
        return e


def check_node_npm():
    """Check if Node.js and npm are available"""
    print("🔍 Checking Node.js and npm...")
    
    try:
        node_result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        npm_result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        
        if node_result.returncode == 0 and npm_result.returncode == 0:
            print(f"✅ Node.js: {node_result.stdout.strip()}")
            print(f"✅ npm: {npm_result.stdout.strip()}")
            return True
        else:
            print("❌ Node.js or npm not found")
            return False
    except FileNotFoundError:
        print("❌ Node.js or npm not found")
        return False


def build_frontend():
    """Build the React frontend"""
    frontend_dir = Path("frontend")
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    print("🎨 Building frontend...")
    
    # Check if node_modules exists, if not run npm install
    if not (frontend_dir / "node_modules").exists():
        print("📦 Installing frontend dependencies...")
        run_command(['npm', 'install'], cwd=frontend_dir)
    
    # Build the frontend
    print("🔨 Building frontend for production...")
    run_command(['npm', 'run', 'build'], cwd=frontend_dir)
    
    # Check if build was successful
    build_dir = frontend_dir / "build"
    if build_dir.exists() and (build_dir / "index.html").exists():
        print("✅ Frontend build successful")
        return True
    else:
        print("❌ Frontend build failed")
        return False


def main():
    """Main installation function"""
    print("🚀 CodegenApp Installation")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("setup.py").exists():
        print("❌ setup.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    # Check Node.js and npm
    if not check_node_npm():
        print("❌ Node.js and npm are required to build the frontend")
        print("💡 Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    
    # Build frontend
    if not build_frontend():
        print("❌ Frontend build failed")
        sys.exit(1)
    
    print("=" * 40)
    print("✅ Installation preparation complete!")
    print("💡 Now you can run: pip install -e .")
    print("🎉 Then start the app with: codegen")


if __name__ == "__main__":
    main()
