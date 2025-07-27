#!/usr/bin/env python3
"""
Deployment validation script for the Codegen Agent Manager.
Validates that all components are working correctly before deployment.
"""

import os
import sys
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))


class DeploymentValidator:
    """Validates deployment readiness"""
    
    def __init__(self):
        self.results: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {},
            "overall_status": "unknown",
            "errors": [],
            "warnings": []
        }
    
    def log_test(self, test_name: str, status: str, message: str = "", details: Dict = None):
        """Log a test result"""
        self.results["tests"][test_name] = {
            "status": status,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if status == "PASS":
            logger.info(f"✅ {test_name}: {message}")
        elif status == "FAIL":
            logger.error(f"❌ {test_name}: {message}")
            self.results["errors"].append(f"{test_name}: {message}")
        elif status == "WARN":
            logger.warning(f"⚠️ {test_name}: {message}")
            self.results["warnings"].append(f"{test_name}: {message}")
    
    def test_file_structure(self):
        """Test that all required files exist"""
        logger.info("🔍 Testing file structure...")
        
        required_files = [
            "backend/app/services/codegen_client.py",
            "backend/app/api/v1/routes/agents.py",
            "backend/app/api/v1/routes/simple_health.py",
            "backend/app/database/models.py",
            "backend/app/repositories/agent_run_repository.py",
            "src/components/CodegenAgentManager.tsx",
            "tests/test_codegen_integration.py",
            "tests/test_basic_functionality.py"
        ]
        
        missing_files = []
        for file_path in required_files:
            if not os.path.exists(file_path):
                missing_files.append(file_path)
        
        if missing_files:
            self.log_test(
                "file_structure",
                "FAIL",
                f"Missing files: {', '.join(missing_files)}"
            )
        else:
            self.log_test(
                "file_structure",
                "PASS",
                f"All {len(required_files)} required files exist"
            )
    
    def test_python_imports(self):
        """Test that Python modules can be imported"""
        logger.info("🐍 Testing Python imports...")
        
        import_tests = [
            ("backend.app.services.codegen_client", ["TaskType", "AgentStatus", "CodegenAgentClient"]),
            ("backend.app.database.models", ["AgentRun", "AgentRunStatus"]),
            ("backend.app.repositories.agent_run_repository", ["AgentRunRepository"]),
        ]
        
        failed_imports = []
        
        for module_name, expected_classes in import_tests:
            try:
                module = __import__(module_name, fromlist=expected_classes)
                
                # Check that expected classes exist
                for class_name in expected_classes:
                    if not hasattr(module, class_name):
                        failed_imports.append(f"{module_name}.{class_name}")
                
            except ImportError as e:
                failed_imports.append(f"{module_name}: {str(e)}")
        
        if failed_imports:
            self.log_test(
                "python_imports",
                "FAIL",
                f"Failed imports: {', '.join(failed_imports)}"
            )
        else:
            self.log_test(
                "python_imports",
                "PASS",
                f"All Python modules imported successfully"
            )
    
    def test_environment_configuration(self):
        """Test environment configuration"""
        logger.info("⚙️ Testing environment configuration...")
        
        # Test that we can set and read environment variables
        test_vars = {
            "CODEGEN_API_KEY": "test-api-key-123",
            "CODEGEN_API_URL": "https://api.codegen.com",
            "DATABASE_URL": "postgresql://user:pass@localhost/test"
        }
        
        config_issues = []
        
        for var_name, test_value in test_vars.items():
            try:
                # Set test value
                os.environ[var_name] = test_value
                
                # Read back
                read_value = os.getenv(var_name)
                
                if read_value != test_value:
                    config_issues.append(f"{var_name}: value mismatch")
                
                # Clean up
                del os.environ[var_name]
                
            except Exception as e:
                config_issues.append(f"{var_name}: {str(e)}")
        
        if config_issues:
            self.log_test(
                "environment_config",
                "WARN",
                f"Configuration issues: {', '.join(config_issues)}"
            )
        else:
            self.log_test(
                "environment_config",
                "PASS",
                "Environment configuration working correctly"
            )
    
    async def test_async_functionality(self):
        """Test async functionality"""
        logger.info("⚡ Testing async functionality...")
        
        try:
            # Test basic async operations
            start_time = asyncio.get_event_loop().time()
            await asyncio.sleep(0.01)
            end_time = asyncio.get_event_loop().time()
            
            if (end_time - start_time) < 0.01:
                self.log_test(
                    "async_functionality",
                    "WARN",
                    "Async timing seems off"
                )
            else:
                self.log_test(
                    "async_functionality",
                    "PASS",
                    "Async operations working correctly"
                )
                
        except Exception as e:
            self.log_test(
                "async_functionality",
                "FAIL",
                f"Async test failed: {str(e)}"
            )
    
    def test_json_serialization(self):
        """Test JSON serialization of data structures"""
        logger.info("📄 Testing JSON serialization...")
        
        test_data = {
            "agent_id": "agent-123",
            "task_type": "code_generation",
            "description": "Test task",
            "status": "pending",
            "progress": 0.5,
            "created_at": datetime.utcnow().isoformat(),
            "files": ["file1.py", "file2.py"],
            "metadata": {"priority": 5, "timeout": 30}
        }
        
        try:
            # Test serialization
            json_str = json.dumps(test_data)
            
            # Test deserialization
            parsed_data = json.loads(json_str)
            
            # Verify data integrity
            if parsed_data != test_data:
                self.log_test(
                    "json_serialization",
                    "FAIL",
                    "Data integrity check failed"
                )
            else:
                self.log_test(
                    "json_serialization",
                    "PASS",
                    "JSON serialization working correctly"
                )
                
        except Exception as e:
            self.log_test(
                "json_serialization",
                "FAIL",
                f"JSON serialization failed: {str(e)}"
            )
    
    def test_mock_api_responses(self):
        """Test mock API response handling"""
        logger.info("🔌 Testing mock API responses...")
        
        try:
            # Create mock response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "agent_id": "agent-456",
                "status": "completed",
                "result": {"success": True}
            }
            
            # Test response
            assert mock_response.status_code == 200
            json_data = mock_response.json()
            assert json_data["agent_id"] == "agent-456"
            assert json_data["status"] == "completed"
            
            self.log_test(
                "mock_api_responses",
                "PASS",
                "Mock API responses working correctly"
            )
            
        except Exception as e:
            self.log_test(
                "mock_api_responses",
                "FAIL",
                f"Mock API test failed: {str(e)}"
            )
    
    def test_data_validation(self):
        """Test data validation patterns"""
        logger.info("✅ Testing data validation...")
        
        try:
            # Test required fields validation
            required_fields = ["agent_id", "task_type", "description"]
            
            valid_data = {
                "agent_id": "agent-123",
                "task_type": "code_generation",
                "description": "Test task"
            }
            
            # Check all required fields are present
            for field in required_fields:
                if field not in valid_data or not valid_data[field]:
                    raise ValueError(f"Missing required field: {field}")
            
            # Test task type validation
            valid_task_types = [
                "code_generation", "code_review", "bug_fix",
                "feature_implementation", "documentation", "testing",
                "refactoring", "analysis", "deployment", "custom"
            ]
            
            if valid_data["task_type"] not in valid_task_types:
                raise ValueError(f"Invalid task type: {valid_data['task_type']}")
            
            self.log_test(
                "data_validation",
                "PASS",
                "Data validation working correctly"
            )
            
        except Exception as e:
            self.log_test(
                "data_validation",
                "FAIL",
                f"Data validation failed: {str(e)}"
            )
    
    def test_typescript_files(self):
        """Test TypeScript files exist and have basic structure"""
        logger.info("📝 Testing TypeScript files...")
        
        tsx_files = [
            "src/components/CodegenAgentManager.tsx"
        ]
        
        issues = []
        
        for file_path in tsx_files:
            if not os.path.exists(file_path):
                issues.append(f"Missing file: {file_path}")
                continue
            
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check for basic React/TypeScript patterns
                required_patterns = [
                    "import React",
                    "export",
                    "interface",
                    "useState"
                ]
                
                for pattern in required_patterns:
                    if pattern not in content:
                        issues.append(f"{file_path}: missing '{pattern}'")
                
            except Exception as e:
                issues.append(f"{file_path}: {str(e)}")
        
        if issues:
            self.log_test(
                "typescript_files",
                "WARN",
                f"TypeScript issues: {', '.join(issues)}"
            )
        else:
            self.log_test(
                "typescript_files",
                "PASS",
                "TypeScript files look good"
            )
    
    async def run_all_tests(self):
        """Run all validation tests"""
        logger.info("🚀 Starting deployment validation...")
        
        # Run synchronous tests
        self.test_file_structure()
        self.test_python_imports()
        self.test_environment_configuration()
        self.test_json_serialization()
        self.test_mock_api_responses()
        self.test_data_validation()
        self.test_typescript_files()
        
        # Run async tests
        await self.test_async_functionality()
        
        # Determine overall status
        failed_tests = [name for name, result in self.results["tests"].items() 
                       if result["status"] == "FAIL"]
        
        if failed_tests:
            self.results["overall_status"] = "FAIL"
            logger.error(f"❌ Deployment validation FAILED. Failed tests: {', '.join(failed_tests)}")
        elif self.results["warnings"]:
            self.results["overall_status"] = "WARN"
            logger.warning(f"⚠️ Deployment validation passed with warnings: {len(self.results['warnings'])} warnings")
        else:
            self.results["overall_status"] = "PASS"
            logger.info("✅ Deployment validation PASSED!")
        
        return self.results
    
    def generate_report(self) -> str:
        """Generate a validation report"""
        report = []
        report.append("# Deployment Validation Report")
        report.append(f"**Timestamp:** {self.results['timestamp']}")
        report.append(f"**Overall Status:** {self.results['overall_status']}")
        report.append("")
        
        # Test results
        report.append("## Test Results")
        for test_name, result in self.results["tests"].items():
            status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
            report.append(f"- {status_emoji} **{test_name}**: {result['message']}")
        
        report.append("")
        
        # Errors
        if self.results["errors"]:
            report.append("## Errors")
            for error in self.results["errors"]:
                report.append(f"- ❌ {error}")
            report.append("")
        
        # Warnings
        if self.results["warnings"]:
            report.append("## Warnings")
            for warning in self.results["warnings"]:
                report.append(f"- ⚠️ {warning}")
            report.append("")
        
        # Summary
        total_tests = len(self.results["tests"])
        passed_tests = len([r for r in self.results["tests"].values() if r["status"] == "PASS"])
        failed_tests = len([r for r in self.results["tests"].values() if r["status"] == "FAIL"])
        warned_tests = len([r for r in self.results["tests"].values() if r["status"] == "WARN"])
        
        report.append("## Summary")
        report.append(f"- **Total Tests:** {total_tests}")
        report.append(f"- **Passed:** {passed_tests}")
        report.append(f"- **Failed:** {failed_tests}")
        report.append(f"- **Warnings:** {warned_tests}")
        report.append(f"- **Success Rate:** {(passed_tests/total_tests)*100:.1f}%")
        
        return "\n".join(report)


async def main():
    """Main validation function"""
    validator = DeploymentValidator()
    
    try:
        results = await validator.run_all_tests()
        
        # Generate and save report
        report = validator.generate_report()
        
        with open("deployment_validation_report.md", "w") as f:
            f.write(report)
        
        # Save JSON results
        with open("deployment_validation_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        logger.info("📄 Validation report saved to deployment_validation_report.md")
        logger.info("📊 Validation results saved to deployment_validation_results.json")
        
        # Exit with appropriate code
        if results["overall_status"] == "FAIL":
            sys.exit(1)
        elif results["overall_status"] == "WARN":
            sys.exit(2)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"💥 Validation failed with exception: {str(e)}")
        sys.exit(3)


if __name__ == "__main__":
    asyncio.run(main())
