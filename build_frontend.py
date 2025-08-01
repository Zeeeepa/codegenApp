#!/usr/bin/env python3
"""
Frontend build script for CodegenApp
This script builds the React frontend and prepares it for packaging.
"""

import os
import subprocess
import sys
import shutil
from pathlib import Path


def detect_package_manager(frontend_dir):
    """Detect which package manager to use."""
    if (frontend_dir / 'pnpm-lock.yaml').exists():
        return 'pnpm'
    elif (frontend_dir / 'yarn.lock').exists():
        return 'yarn'
    else:
        return 'npm'


def check_node_available():
    """Check if Node.js is available."""
    try:
        result = subprocess.run(['node', '--version'], check=True, capture_output=True, text=True)
        print(f"✅ Node.js found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found. Please install Node.js to build the frontend.")
        print("   Visit: https://nodejs.org/")
        return False


def build_frontend():
    """Build the React frontend."""
    frontend_dir = Path(__file__).parent / 'frontend'
    
    if not frontend_dir.exists():
        print("⚠️  Frontend directory not found, skipping frontend build")
        return True
        
    print("🔨 Building React frontend...")
    
    # Check if Node.js is available
    if not check_node_available():
        print("⚠️  Skipping frontend build due to missing Node.js")
        return False
        
    # Detect package manager
    package_manager = detect_package_manager(frontend_dir)
    print(f"📦 Using package manager: {package_manager}")
    
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
        
        # Verify build directory exists
        build_dir = frontend_dir / 'build'
        if build_dir.exists():
            print(f"✅ Build directory created: {build_dir}")
            # List some files to confirm build worked
            build_files = list(build_dir.rglob('*'))[:10]  # First 10 files
            print(f"📁 Build contains {len(list(build_dir.rglob('*')))} files")
        else:
            print("⚠️  Build directory not found after build")
            return False
            
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend build failed: {e}")
        print("   You can manually build the frontend later with:")
        print(f"   cd frontend && {package_manager} install && {package_manager} run build")
        return False


def main():
    """Main entry point."""
    print("🚀 CodegenApp Frontend Build Script")
    print("=" * 50)
    
    success = build_frontend()
    
    if success:
        print("\n✅ Frontend build completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Frontend build failed!")
        print("   The package will still install, but frontend assets may not be available.")
        sys.exit(1)


if __name__ == "__main__":
    main()

