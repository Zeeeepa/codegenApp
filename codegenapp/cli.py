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
from pathlib import Path
from typing import Optional, List


class CodegenAppLauncher:
    """Main launcher class for CodegenApp"""
    
    def __init__(self):
        self.backend_process: Optional[subprocess.Popen] = None
        self.frontend_process: Optional[subprocess.Popen] = None
        self.package_dir = Path(__file__).parent.parent
        self.backend_dir = self.package_dir / "backend"
        self.frontend_dir = self.package_dir / "frontend"
        self.frontend_build_dir = self.frontend_dir / "build"
        
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
            print(f"❌ Frontend build not found: {self.frontend_build_dir}")
            print("💡 Run 'npm run build' in the frontend directory first")
            return False
            
        # Check if main.py exists
        main_py = self.backend_dir / "main.py"
        if not main_py.exists():
            print(f"❌ Backend main.py not found: {main_py}")
            return False
            
        print("✅ All dependencies found")
        return True
    
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
            
            self.backend_process = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd=self.backend_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Wait a moment and check if process started successfully
            time.sleep(2)
            if self.backend_process.poll() is not None:
                print("❌ Backend failed to start")
                return False
                
            print(f"✅ Backend started successfully on http://localhost:{port}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
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
    
    args = parser.parse_args()
    
    # Create and run launcher
    launcher = CodegenAppLauncher()
    launcher.run(
        backend_port=args.backend_port,
        frontend_port=args.frontend_port,
        no_browser=args.no_browser
    )


if __name__ == "__main__":
    main()
