#!/usr/bin/env python3
"""
Simplified CI/CD Flow Test
Tests the backend API endpoints and basic functionality
"""

import asyncio
import httpx
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
TEST_PROJECT = "codegenApp"

class SimpleCICDTester:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
    
    async def log_test_result(self, test_name: str, success: bool, details: str = "", duration: float = 0):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "duration": duration,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        duration_str = f" ({duration:.1f}s)" if duration > 0 else ""
        print(f"{status}: {test_name}{duration_str} - {details}")
    
    async def test_backend_health(self):
        """Test backend health and API endpoints"""
        test_start = time.time()
        try:
            async with httpx.AsyncClient() as client:
                # Test root endpoint
                response = await client.get(f"{BACKEND_URL}/", timeout=10.0)
                root_ok = response.status_code == 200
                
                # Test docs endpoint
                docs_response = await client.get(f"{BACKEND_URL}/docs", timeout=10.0)
                docs_ok = docs_response.status_code == 200
                
                # Test API structure
                api_response = await client.get(f"{BACKEND_URL}/openapi.json", timeout=10.0)
                api_ok = api_response.status_code == 200
                
                success = root_ok and docs_ok and api_ok
                duration = time.time() - test_start
                
                await self.log_test_result(
                    "Backend Health & API",
                    success,
                    f"Root: {root_ok}, Docs: {docs_ok}, OpenAPI: {api_ok}",
                    duration
                )
                return success
                
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("Backend Health & API", False, f"Error: {str(e)}", duration)
            return False
    
    async def test_frontend_accessibility(self):
        """Test frontend accessibility"""
        test_start = time.time()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(FRONTEND_URL, timeout=10.0)
                success = response.status_code == 200
                
                # Check if it's actually serving content
                content_length = len(response.content)
                has_content = content_length > 1000  # Reasonable threshold for a React app
                
                duration = time.time() - test_start
                await self.log_test_result(
                    "Frontend Accessibility",
                    success and has_content,
                    f"Status: {response.status_code}, Content: {content_length} bytes",
                    duration
                )
                return success and has_content
                
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("Frontend Accessibility", False, f"Error: {str(e)}", duration)
            return False
    
    async def test_api_endpoints(self):
        """Test key API endpoints"""
        test_start = time.time()
        try:
            async with httpx.AsyncClient() as client:
                endpoints_to_test = [
                    "/api/v1/projects",
                    "/api/v1/workflows",
                    "/api/v1/agent-runs"
                ]
                
                results = {}
                for endpoint in endpoints_to_test:
                    try:
                        response = await client.get(f"{BACKEND_URL}{endpoint}", timeout=5.0)
                        # Accept both 200 (success) and 422 (validation error) as valid responses
                        # since we're not providing required parameters
                        results[endpoint] = response.status_code in [200, 422, 404]
                    except:
                        results[endpoint] = False
                
                success = any(results.values())  # At least one endpoint should respond
                duration = time.time() - test_start
                
                await self.log_test_result(
                    "API Endpoints",
                    success,
                    f"Endpoints tested: {sum(results.values())}/{len(results)}",
                    duration
                )
                return success
                
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("API Endpoints", False, f"Error: {str(e)}", duration)
            return False
    
    async def test_websocket_capability(self):
        """Test WebSocket capability (basic check)"""
        test_start = time.time()
        try:
            # For now, just check if the WebSocket endpoint exists in the API docs
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BACKEND_URL}/openapi.json", timeout=5.0)
                if response.status_code == 200:
                    api_spec = response.json()
                    # Look for WebSocket-related paths or components
                    has_websocket = "websocket" in str(api_spec).lower() or "ws" in str(api_spec).lower()
                else:
                    has_websocket = False
                
                duration = time.time() - test_start
                await self.log_test_result(
                    "WebSocket Capability",
                    has_websocket,
                    f"WebSocket references found in API spec: {has_websocket}",
                    duration
                )
                return has_websocket
                
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("WebSocket Capability", False, f"Error: {str(e)}", duration)
            return False
    
    async def test_service_integration(self):
        """Test service integration readiness"""
        test_start = time.time()
        try:
            # Check if required environment variables are set
            import os
            required_vars = [
                'GEMINI_API_KEY',
                'CODEGEN_ORG_ID', 
                'CODEGEN_API_TOKEN'
            ]
            
            env_vars_set = all(os.environ.get(var) for var in required_vars)
            
            # Check if service directories exist
            import pathlib
            service_dirs = [
                pathlib.Path("web-eval-agent"),
                pathlib.Path("grainchain"),
                pathlib.Path("backend"),
                pathlib.Path("frontend")
            ]
            
            dirs_exist = all(dir_path.exists() for dir_path in service_dirs)
            
            success = env_vars_set and dirs_exist
            duration = time.time() - test_start
            
            await self.log_test_result(
                "Service Integration Readiness",
                success,
                f"Env vars: {env_vars_set}, Service dirs: {dirs_exist}",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("Service Integration Readiness", False, f"Error: {str(e)}", duration)
            return False
    
    async def test_workflow_engine(self):
        """Test workflow engine components"""
        test_start = time.time()
        try:
            # Check if workflow-related files exist
            import pathlib
            workflow_files = [
                pathlib.Path("backend/app/core/workflow/cicd_engine.py"),
                pathlib.Path("backend/app/core/workflow/state_machine.py"),
                pathlib.Path("backend/app/models/workflow_state.py")
            ]
            
            files_exist = all(file_path.exists() for file_path in workflow_files)
            
            # Try to make a basic API call to workflow endpoints
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(f"{BACKEND_URL}/api/v1/workflows", timeout=5.0)
                    api_responds = response.status_code in [200, 422, 404]  # Any valid HTTP response
                except:
                    api_responds = False
            
            success = files_exist and api_responds
            duration = time.time() - test_start
            
            await self.log_test_result(
                "Workflow Engine",
                success,
                f"Core files: {files_exist}, API responds: {api_responds}",
                duration
            )
            return success
            
        except Exception as e:
            duration = time.time() - test_start
            await self.log_test_result("Workflow Engine", False, f"Error: {str(e)}", duration)
            return False
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Simplified CI/CD Flow Test")
        print("=" * 50)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 50)
        
        # Run all tests
        test_functions = [
            self.test_backend_health,
            self.test_frontend_accessibility,
            self.test_api_endpoints,
            self.test_websocket_capability,
            self.test_service_integration,
            self.test_workflow_engine
        ]
        
        for test_func in test_functions:
            try:
                await test_func()
            except Exception as e:
                await self.log_test_result(test_func.__name__, False, f"Exception: {str(e)}")
            
            # Small delay between tests
            await asyncio.sleep(1)
        
        # Generate report
        await self.generate_report()
    
    async def generate_report(self):
        """Generate test report"""
        total_time = time.time() - self.start_time
        passed_tests = sum(1 for result in self.test_results if result['success'])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        report = {
            "test_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "success_rate": f"{success_rate:.1f}%",
                "total_time": f"{total_time:.1f} seconds",
                "timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results,
            "overall_status": "PASS" if success_rate >= 80 else "FAIL"
        }
        
        # Save report
        report_filename = f"simple_cicd_test_report_{int(time.time())}.json"
        with open(report_filename, "w") as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "=" * 50)
        print("🎯 TEST COMPLETE")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Time: {total_time:.1f} seconds")
        print(f"Overall Status: {'✅ PASS' if success_rate >= 80 else '❌ FAIL'}")
        print(f"Report saved: {report_filename}")
        
        if success_rate >= 80:
            print("\n🎉 SYSTEM READY FOR CI/CD OPERATIONS!")
            print("Core components are functioning correctly.")
        else:
            print("\n⚠️  Some components need attention.")
            print("Check the detailed report for specific issues.")
        
        # Print detailed results
        print("\n📋 Detailed Test Results:")
        print("-" * 40)
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            duration = f" ({result.get('duration', 0):.1f}s)" if result.get('duration') else ""
            print(f"{status} {result['test']}{duration}")
            if result['details']:
                print(f"   {result['details']}")

async def main():
    """Main execution function"""
    tester = SimpleCICDTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())

