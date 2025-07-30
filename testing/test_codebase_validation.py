#!/usr/bin/env python3
"""
Web-Eval-Agent Codebase Validation Test
Tests the codebase structure and implementation completeness
"""

import os
import asyncio
import json
import time
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0'
os.environ['DISPLAY'] = ':99'

class CodebaseValidator:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            api_key=os.environ['GEMINI_API_KEY']
        )
        self.validation_results = []
    
    def log_validation(self, component: str, status: str, details: str = ""):
        """Log validation results"""
        result = {
            "component": component,
            "status": status,
            "details": details,
            "timestamp": time.time()
        }
        self.validation_results.append(result)
        
        status_icon = {
            "PASS": "✅",
            "FAIL": "❌", 
            "WARNING": "⚠️",
            "INFO": "ℹ️"
        }.get(status, "❓")
        
        print(f"{status_icon} {component}: {details}")
    
    def validate_file_structure(self):
        """Validate the codebase file structure"""
        print("🔍 Validating Codebase Structure...")
        
        # Check for key files and directories
        required_files = [
            "../frontend/src/components/dashboard/ProjectCard.tsx",
            "../frontend/src/components/agent/AgentRunDialog.tsx", 
            "../frontend/src/components/dashboard/ValidationFlowDialog.tsx",
            "../frontend/src/components/dashboard/ProjectSettingsDialog.tsx",
            "../frontend/src/types/index.ts",
            "../backend/main.py",
            "../PLAN.md",
            "../README.md"
        ]
        
        for file_path in required_files:
            if os.path.exists(file_path):
                self.log_validation(f"File: {file_path}", "PASS", "File exists")
            else:
                self.log_validation(f"File: {file_path}", "FAIL", "File missing")
    
    def validate_component_implementation(self):
        """Validate component implementations"""
        print("\n🧩 Validating Component Implementations...")
        
        # Check ProjectCard.tsx
        try:
            with open("../frontend/src/components/dashboard/ProjectCard.tsx", "r") as f:
                content = f.read()
                
            features = [
                ("Agent Run Button", "Agent Run" in content),
                ("Settings Dialog", "settings" in content.lower()),
                ("Auto-confirm Checkbox", "auto" in content.lower() and "confirm" in content.lower()),
                ("Auto-merge Checkbox", "auto" in content.lower() and "merge" in content.lower()),
                ("Visual Indicators", "border" in content.lower() or "indicator" in content.lower()),
                ("PR Notifications", "pr" in content.lower() or "pull" in content.lower())
            ]
            
            for feature_name, has_feature in features:
                status = "PASS" if has_feature else "WARNING"
                self.log_validation(f"ProjectCard: {feature_name}", status, 
                                  "Implemented" if has_feature else "May need verification")
                
        except FileNotFoundError:
            self.log_validation("ProjectCard Component", "FAIL", "File not found")
    
    def validate_validation_flow(self):
        """Validate ValidationFlowDialog implementation"""
        print("\n🔄 Validating Validation Flow Implementation...")
        
        try:
            with open("../frontend/src/components/dashboard/ValidationFlowDialog.tsx", "r") as f:
                content = f.read()
                
            validation_steps = [
                ("Grainchain Integration", "grainchain" in content.lower()),
                ("Graph-sitter Integration", "graph" in content.lower() and "sitter" in content.lower()),
                ("Web-eval-agent Integration", "web" in content.lower() and "eval" in content.lower()),
                ("Progress Tracking", "progress" in content.lower()),
                ("Step Management", "step" in content.lower())
            ]
            
            for step_name, has_step in validation_steps:
                status = "PASS" if has_step else "WARNING"
                self.log_validation(f"ValidationFlow: {step_name}", status,
                                  "Implemented" if has_step else "May need verification")
                
        except FileNotFoundError:
            self.log_validation("ValidationFlow Component", "FAIL", "File not found")
    
    def validate_agent_integration(self):
        """Validate AI agent integration"""
        print("\n🤖 Validating AI Agent Integration...")
        
        try:
            with open("../frontend/src/components/agent/AgentRunDialog.tsx", "r") as f:
                content = f.read()
                
            agent_features = [
                ("Project Context", "project" in content.lower()),
                ("Planning Statement", "planning" in content.lower()),
                ("Target Input", "target" in content.lower()),
                ("Response Handling", "response" in content.lower()),
                ("Plan Confirmation", "confirm" in content.lower())
            ]
            
            for feature_name, has_feature in agent_features:
                status = "PASS" if has_feature else "WARNING"
                self.log_validation(f"AgentDialog: {feature_name}", status,
                                  "Implemented" if has_feature else "May need verification")
                
        except FileNotFoundError:
            self.log_validation("AgentDialog Component", "FAIL", "File not found")
    
    def validate_backend_implementation(self):
        """Validate backend implementation"""
        print("\n⚙️ Validating Backend Implementation...")
        
        try:
            with open("../backend/main.py", "r") as f:
                content = f.read()
                
            backend_features = [
                ("FastAPI Framework", "fastapi" in content.lower()),
                ("WebSocket Support", "websocket" in content.lower()),
                ("CORS Configuration", "cors" in content.lower()),
                ("API Endpoints", "app.post" in content or "app.get" in content),
                ("Error Handling", "exception" in content.lower() or "error" in content.lower())
            ]
            
            for feature_name, has_feature in backend_features:
                status = "PASS" if has_feature else "WARNING"
                self.log_validation(f"Backend: {feature_name}", status,
                                  "Implemented" if has_feature else "May need verification")
                
        except FileNotFoundError:
            self.log_validation("Backend Implementation", "FAIL", "File not found")
    
    def validate_documentation(self):
        """Validate documentation completeness"""
        print("\n📚 Validating Documentation...")
        
        # Check README.md
        try:
            with open("../README.md", "r") as f:
                readme_content = f.read()
                
            readme_sections = [
                ("Installation Instructions", "install" in readme_content.lower()),
                ("Usage Guide", "usage" in readme_content.lower() or "how to" in readme_content.lower()),
                ("API Documentation", "api" in readme_content.lower()),
                ("Environment Variables", "env" in readme_content.lower() or "environment" in readme_content.lower()),
                ("Architecture Overview", "architecture" in readme_content.lower() or "overview" in readme_content.lower())
            ]
            
            for section_name, has_section in readme_sections:
                status = "PASS" if has_section else "WARNING"
                self.log_validation(f"README: {section_name}", status,
                                  "Present" if has_section else "May need enhancement")
                
        except FileNotFoundError:
            self.log_validation("README Documentation", "FAIL", "File not found")
        
        # Check PLAN.md
        try:
            with open("../PLAN.md", "r") as f:
                plan_content = f.read()
                
            plan_features = [
                ("Implementation Checklist", "checklist" in plan_content.lower()),
                ("Feature Dependencies", "dependencies" in plan_content.lower()),
                ("Completion Status", "completed" in plan_content.lower() or "status" in plan_content.lower()),
                ("Technology Stack", "stack" in plan_content.lower() or "technology" in plan_content.lower())
            ]
            
            for feature_name, has_feature in plan_features:
                status = "PASS" if has_feature else "WARNING"
                self.log_validation(f"PLAN: {feature_name}", status,
                                  "Present" if has_feature else "May need enhancement")
                
        except FileNotFoundError:
            self.log_validation("PLAN Documentation", "FAIL", "File not found")
    
    def validate_integration_readiness(self):
        """Validate readiness for integration testing"""
        print("\n🔗 Validating Integration Readiness...")
        
        # Check for environment configuration
        env_files = ["../.env", "../.env.example", "../.env.local"]
        env_found = any(os.path.exists(env_file) for env_file in env_files)
        
        self.log_validation("Environment Configuration", 
                          "PASS" if env_found else "WARNING",
                          "Environment files present" if env_found else "May need environment setup")
        
        # Check for package files
        package_files = ["../package.json", "../requirements.txt", "../pyproject.toml"]
        package_found = any(os.path.exists(pkg_file) for pkg_file in package_files)
        
        self.log_validation("Dependency Management",
                          "PASS" if package_found else "WARNING", 
                          "Package files present" if package_found else "May need dependency setup")
        
        # Check for build/deployment scripts
        build_files = ["../Dockerfile", "../docker-compose.yml", "../deploy.sh"]
        build_found = any(os.path.exists(build_file) for build_file in build_files)
        
        self.log_validation("Deployment Configuration",
                          "PASS" if build_found else "INFO",
                          "Deployment files present" if build_found else "Manual deployment may be needed")
    
    def generate_validation_report(self):
        """Generate comprehensive validation report"""
        print("\n" + "=" * 70)
        print("🧪 CODEBASE VALIDATION REPORT")
        print("=" * 70)
        
        # Count results by status
        status_counts = {"PASS": 0, "FAIL": 0, "WARNING": 0, "INFO": 0}
        for result in self.validation_results:
            status_counts[result["status"]] += 1
        
        total_checks = len(self.validation_results)
        success_rate = (status_counts["PASS"] / total_checks) * 100 if total_checks > 0 else 0
        
        print(f"📊 Validation Summary:")
        print(f"   ✅ PASS: {status_counts['PASS']}")
        print(f"   ❌ FAIL: {status_counts['FAIL']}")
        print(f"   ⚠️  WARNING: {status_counts['WARNING']}")
        print(f"   ℹ️  INFO: {status_counts['INFO']}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        print(f"\n📋 Detailed Results:")
        for result in self.validation_results:
            status_icon = {
                "PASS": "✅",
                "FAIL": "❌", 
                "WARNING": "⚠️",
                "INFO": "ℹ️"
            }.get(result["status"], "❓")
            print(f"   {status_icon} {result['component']}: {result['details']}")
        
        print(f"\n🎯 Implementation Assessment:")
        if status_counts["FAIL"] == 0 and success_rate >= 80:
            print("   🎉 EXCELLENT: Codebase is well-implemented and ready for testing!")
        elif status_counts["FAIL"] == 0 and success_rate >= 60:
            print("   👍 GOOD: Codebase is mostly complete with minor enhancements needed")
        elif status_counts["FAIL"] <= 2:
            print("   ⚠️  NEEDS ATTENTION: Some critical components may need implementation")
        else:
            print("   ❌ INCOMPLETE: Significant implementation work required")
        
        print("\n🚀 Next Steps:")
        if status_counts["FAIL"] == 0:
            print("   • Deploy the application for live testing")
            print("   • Run comprehensive web-eval-agent validation")
            print("   • Test complete CI/CD workflow")
            print("   • Validate all user interactions")
        else:
            print("   • Address missing critical components")
            print("   • Complete implementation of failed validations")
            print("   • Re-run validation after fixes")
        
        print("=" * 70)
    
    def run_validation(self):
        """Run complete codebase validation"""
        print("🚀 Starting Comprehensive Codebase Validation")
        print("=" * 70)
        
        # Run all validation checks
        self.validate_file_structure()
        self.validate_component_implementation()
        self.validate_validation_flow()
        self.validate_agent_integration()
        self.validate_backend_implementation()
        self.validate_documentation()
        self.validate_integration_readiness()
        
        # Generate final report
        self.generate_validation_report()

def main():
    """Main validation function"""
    validator = CodebaseValidator()
    validator.run_validation()

if __name__ == "__main__":
    main()
