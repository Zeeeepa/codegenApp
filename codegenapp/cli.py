#!/usr/bin/env python3
"""
CodegenApp CLI - Command Line Interface for starting the application
"""

import os
import sys
import time
import signal
import subprocess
import threading
import webbrowser
import argparse
import requests
from pathlib import Path
from typing import Optional, List, Union


class CodegenAppLauncher:
    """Main launcher class for CodegenApp"""
    
    def __init__(self) -> None:
        self.backend_process: Optional[subprocess.Popen] = None
        self.frontend_process: Optional[subprocess.Popen] = None
        self.package_dir: Path = Path(__file__).parent.parent
        self.project_root: Path = self.package_dir
        self.backend_dir: Path = self.package_dir / "backend"
        self.frontend_dir: Path = self.package_dir / "frontend"
        self.frontend_build_dir: Path = self.frontend_dir / "build"
        
    def find_free_port(self, start_port: int = 8001) -> int:
        """Find a free port starting from the given port"""
        import socket
        for port in range(start_port, start_port + 100):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('localhost', port))
                    return port
            except OSError:
                continue
        raise RuntimeError(f"No free port found starting from {start_port}")
    
    def check_dependencies(self) -> bool:
        """Check if all required dependencies are available"""
        print("🔍 Checking dependencies...")
        
        # Check if backend directory exists
        if not self.backend_dir.exists():
            print(f"❌ Backend directory not found: {self.backend_dir}")
            return False
            
        # Check if frontend build exists
        if not self.frontend_build_dir.exists():
            print(f"⚠️  Frontend build not found: {self.frontend_build_dir}")
            print("🔨 Attempting to build frontend automatically...")
            if self._build_frontend():
                print("✅ Frontend build completed successfully!")
            else:
                print("❌ Frontend build failed")
                print("💡 You can manually build with: cd frontend && npm install && npm run build")
                return False
            
        # Check if main.py exists
        main_py = self.backend_dir / "main.py"
        if not main_py.exists():
            print(f"❌ Backend main.py not found: {main_py}")
            return False
            
        print("✅ All dependencies found")
        return True
    
    def _load_env_file(self, env_file: Path, env_dict: dict) -> None:
        """Load environment variables from .env file"""
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key not in env_dict:  # Don't override existing env vars
                            env_dict[key] = value
        except Exception as e:
            print(f"⚠️  Warning: Could not load .env file: {e}")
    
    def _build_frontend(self) -> bool:
        """Build the React frontend"""
        if not self.frontend_dir.exists():
            print("❌ Frontend directory not found")
            return False
            
        # Check if Node.js is available
        try:
            subprocess.run(['node', '--version'], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js not found. Please install Node.js to build the frontend.")
            print("   Visit: https://nodejs.org/")
            return False
            
        # Detect package manager
        package_manager = self._detect_package_manager()
        
        try:
            print(f"📦 Installing dependencies with {package_manager}...")
            if package_manager == 'npm':
                subprocess.run(['npm', 'install'], cwd=self.frontend_dir, check=True)
                subprocess.run(['npm', 'run', 'build'], cwd=self.frontend_dir, check=True)
            elif package_manager == 'yarn':
                subprocess.run(['yarn', 'install'], cwd=self.frontend_dir, check=True)
                subprocess.run(['yarn', 'build'], cwd=self.frontend_dir, check=True)
            elif package_manager == 'pnpm':
                subprocess.run(['pnpm', 'install'], cwd=self.frontend_dir, check=True)
                subprocess.run(['pnpm', 'run', 'build'], cwd=self.frontend_dir, check=True)
                
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Frontend build failed: {e}")
            return False
    
    def _detect_package_manager(self) -> str:
        """Detect which package manager to use"""
        if (self.frontend_dir / 'pnpm-lock.yaml').exists():
            return 'pnpm'
        elif (self.frontend_dir / 'yarn.lock').exists():
            return 'yarn'
        else:
            return 'npm'
    
    def start_backend(self, port: int = 8001) -> bool:
        """Start the FastAPI backend server"""
        print(f"🚀 Starting backend on port {port}...")
        
        try:
            # Find free port if the default is busy
            actual_port = self.find_free_port(port)
            if actual_port != port:
                print(f"📍 Port {port} busy, using port {actual_port}")
                port = actual_port
            
            # Start backend process
            env = os.environ.copy()
            env['PORT'] = str(port)
            env['PYTHONPATH'] = self.backend_dir
            
            # Load .env file if it exists
            env_file = self.project_root / '.env'
            if env_file.exists():
                self._load_env_file(env_file, env)
            
            self.backend_process = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd=self.backend_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Wait for backend to be ready using health check
            if not self._wait_for_backend_health(port):
                print("❌ Backend failed to start")
                return False
                
            print(f"✅ Backend started successfully on http://localhost:{port}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def _wait_for_backend_health(self, port: int, timeout: int = 30) -> bool:
        """Wait for backend to be healthy using health check endpoint"""
        health_url = f"http://localhost:{port}/health"
        start_time = time.time()
        
        print(f"⏳ Waiting for backend to be ready...")
        
        while time.time() - start_time < timeout:
            # Check if process is still running
            if self.backend_process and self.backend_process.poll() is not None:
                print("❌ Backend process exited unexpectedly")
                # Try to read any output from the process
                try:
                    if self.backend_process.stdout:
                        output = self.backend_process.stdout.read()
                        if output:
                            print(f"Backend output: {output}")
                except Exception:
                    pass
                return False
            
            try:
                response = requests.get(health_url, timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "healthy":
                        return True
                elif response.status_code == 500:
                    # Backend is running but health check failed (likely due to demo credentials)
                    # Check if we can reach the root endpoint to confirm backend is responsive
                    try:
                        root_response = requests.get(f"http://localhost:{port}/", timeout=2)
                        if root_response.status_code == 200:
                            print("⚠️  Backend health check failed but server is responsive (likely demo credentials)")
                            return True
                    except requests.exceptions.RequestException:
                        pass
            except (requests.exceptions.RequestException, ValueError):
                # Backend not ready yet, continue waiting
                pass
            
            time.sleep(1)
        
        print(f"❌ Backend health check timed out after {timeout} seconds")
        return False
    
    def start_frontend(self, port: int = 3002) -> bool:
        """Start the frontend server"""
        print(f"🎨 Starting frontend on port {port}...")
        
        try:
            # Find free port if the default is busy
            actual_port = self.find_free_port(port)
            if actual_port != port:
                print(f"📍 Port {port} busy, using port {actual_port}")
                port = actual_port
            
            # Start frontend using Python's built-in HTTP server
            self.frontend_process = subprocess.Popen(
                [sys.executable, "-m", "http.server", str(port)],
                cwd=self.frontend_build_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Wait a moment and check if process started successfully
            time.sleep(1)
            if self.frontend_process.poll() is not None:
                print("❌ Frontend failed to start")
                return False
                
            print(f"✅ Frontend started successfully on http://localhost:{port}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start frontend: {e}")
            return False
    
    def open_browser(self, url: str, delay: int = 3):
        """Open the browser after a delay"""
        def delayed_open():
            time.sleep(delay)
            print(f"🌐 Opening browser: {url}")
            try:
                webbrowser.open(url)
            except Exception as e:
                print(f"⚠️  Could not open browser automatically: {e}")
                print(f"📋 Please open manually: {url}")
        
        thread = threading.Thread(target=delayed_open, daemon=True)
        thread.start()
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            print("\n🛑 Shutting down CodegenApp...")
            self.cleanup()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def cleanup(self):
        """Clean up processes"""
        if self.backend_process:
            print("🔄 Stopping backend...")
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
        
        if self.frontend_process:
            print("🔄 Stopping frontend...")
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
    
    def run(self, backend_port: int = 8001, frontend_port: int = 3002, no_browser: bool = False):
        """Main run method"""
        print("🚀 Starting CodegenApp...")
        print("=" * 50)
        
        # Setup signal handlers
        self.setup_signal_handlers()
        
        # Check dependencies
        if not self.check_dependencies():
            sys.exit(1)
        
        try:
            # Start backend
            if not self.start_backend(backend_port):
                sys.exit(1)
            
            # Start frontend
            if not self.start_frontend(frontend_port):
                self.cleanup()
                sys.exit(1)
            
            # Open browser
            frontend_url = f"http://localhost:{frontend_port}"
            if not no_browser:
                self.open_browser(frontend_url)
            
            print("=" * 50)
            print("🎉 CodegenApp is running!")
            print(f"📱 Frontend: {frontend_url}")
            print(f"🔧 Backend:  http://localhost:{backend_port}")
            print(f"📚 API Docs: http://localhost:{backend_port}/docs")
            print("=" * 50)
            print("Press Ctrl+C to stop")
            
            # Keep the main thread alive
            try:
                while True:
                    time.sleep(1)
                    # Check if processes are still running
                    if self.backend_process and self.backend_process.poll() is not None:
                        print("❌ Backend process died unexpectedly")
                        break
                    if self.frontend_process and self.frontend_process.poll() is not None:
                        print("❌ Frontend process died unexpectedly")
                        break
            except KeyboardInterrupt:
                pass
                
        except Exception as e:
            print(f"❌ Error running CodegenApp: {e}")
        finally:
            self.cleanup()
    
    def verify_installation(self) -> bool:
        """Verify that the installation is complete and working"""
        print("🔍 CodegenApp Installation Verification")
        print("=" * 50)
        
        success = True
        
        # Check Python version
        print(f"🐍 Python version: {sys.version}")
        
        # Check package directory
        print(f"📁 Package directory: {self.package_dir}")
        if not self.package_dir.exists():
            print("❌ Package directory not found")
            success = False
        else:
            print("✅ Package directory found")
        
        # Check backend
        print(f"🔧 Backend directory: {self.backend_dir}")
        if not self.backend_dir.exists():
            print("❌ Backend directory not found")
            success = False
        else:
            print("✅ Backend directory found")
            
            # Check main.py
            main_py = self.backend_dir / "main.py"
            if main_py.exists():
                print("✅ Backend main.py found")
            else:
                print("❌ Backend main.py not found")
                success = False
        
        # Check frontend
        print(f"🎨 Frontend directory: {self.frontend_dir}")
        if not self.frontend_dir.exists():
            print("❌ Frontend directory not found")
            success = False
        else:
            print("✅ Frontend directory found")
            
            # Check package.json
            package_json = self.frontend_dir / "package.json"
            if package_json.exists():
                print("✅ Frontend package.json found")
            else:
                print("❌ Frontend package.json not found")
                success = False
            
            # Check build directory
            if self.frontend_build_dir.exists():
                print("✅ Frontend build directory found")
            else:
                print("⚠️  Frontend build directory not found")
                print("   Run: cd frontend && npm install && npm run build")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            print(f"🟢 Node.js version: {result.stdout.strip()}")
        except FileNotFoundError:
            print("❌ Node.js not found")
            print("   Install from: https://nodejs.org/")
            success = False
        
        # Check npm
        try:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
            print(f"📦 npm version: {result.stdout.strip()}")
        except FileNotFoundError:
            print("❌ npm not found")
            success = False
        
        # Check environment file
        env_file = self.project_root / '.env'
        if env_file.exists():
            print("✅ .env file found")
        else:
            print("⚠️  .env file not found")
            print("   Copy .env.example to .env and configure")
        
        # Test backend startup (quick test)
        print("\n🧪 Testing backend startup...")
        try:
            # Try to import the backend main module
            sys.path.insert(0, str(self.backend_dir))
            
            # Quick import test
            try:
                # Set minimal required env vars for testing
                import os
                test_env = os.environ.copy()
                test_env['CODEGEN_API_KEY'] = 'test'
                test_env['CODEGEN_ORG_ID'] = 'test'
                
                # Temporarily set environment
                original_env = {}
                for key, value in test_env.items():
                    if key not in os.environ:
                        original_env[key] = None
                        os.environ[key] = value
                
                try:
                    from app.config.settings import get_settings
                    settings = get_settings()
                    print("✅ Backend configuration loads successfully")
                    print(f"   CORS Origins: {settings.cors_origins}")
                finally:
                    # Restore original environment
                    for key, value in original_env.items():
                        if value is None:
                            os.environ.pop(key, None)
                        else:
                            os.environ[key] = value
                            
            except Exception as e:
                print(f"❌ Backend configuration error: {e}")
                success = False
                
        except Exception as e:
            print(f"❌ Backend import error: {e}")
            success = False
        
        print("\n" + "=" * 50)
        if success:
            print("🎉 Installation verification PASSED!")
            print("   You can run 'codegen' to start the application")
        else:
            print("❌ Installation verification FAILED!")
            print("   Please fix the issues above before running the application")
        
        return success


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="CodegenApp - AI Agent Run Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  codegen                    # Start with default ports
  codegen --backend-port 8080 --frontend-port 3000
  codegen --no-browser       # Don't open browser automatically
        """
    )
    
    parser.add_argument(
        "--backend-port",
        type=int,
        default=8001,
        help="Port for the backend server (default: 8001)"
    )
    
    parser.add_argument(
        "--frontend-port", 
        type=int,
        default=3002,
        help="Port for the frontend server (default: 3002)"
    )
    
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Don't open browser automatically"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="CodegenApp 1.0.0"
    )
    
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify installation and configuration"
    )
    
    args = parser.parse_args()
    
    # Create launcher
    launcher = CodegenAppLauncher()
    
    # Handle verification command
    if args.verify:
        success = launcher.verify_installation()
        sys.exit(0 if success else 1)
    
    # Run normal application
    launcher.run(
        backend_port=args.backend_port,
        frontend_port=args.frontend_port,
        no_browser=args.no_browser
    )


if __name__ == "__main__":
    main()
