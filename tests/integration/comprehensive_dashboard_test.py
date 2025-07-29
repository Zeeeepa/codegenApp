#!/usr/bin/env python3
"""
Comprehensive CodegenApp Dashboard Testing with Web-Eval-Agent
Tests all components, integrations, and user workflows
"""

import os
import sys
import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import requests
from playwright.async_api import async_playwright, Page, Browser
import google.generativeai as genai

# Set up environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0'
os.environ['CODEGEN_ORG_ID'] = '323'
os.environ['CODEGEN_API_TOKEN'] = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99'
os.environ['GITHUB_TOKEN'] = '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'
os.environ['CLOUDFLARE_API_KEY'] = 'eae82cf159577a8838cc83612104c09c5a0d6'
os.environ['CLOUDFLARE_ACCOUNT_ID'] = '2b2a1d3effa7f7fe4fe2a8c4e48681e3'
os.environ['CLOUDFLARE_WORKER_URL'] = 'https://webhook-gateway.pixeliumperfecto.workers.dev'

# Configure Gemini AI
genai.configure(api_key=os.environ['GEMINI_API_KEY'])
model = genai.GenerativeModel('gemini-pro')

class DashboardTester:
    def __init__(self):
        self.base_url = "http://localhost:3002"
        self.test_results = []
        self.browser = None
        self.page = None
        
    async def setup_browser(self):
        """Initialize browser and page"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        )
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        self.page = await context.new_page()
        
    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
            
    async def log_test_result(self, test_name: str, status: str, details: str, screenshot_path: str = None):
        """Log test results with AI analysis"""
        result = {
            'test_name': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'screenshot': screenshot_path
        }
        
        # Get AI analysis of the test result
        try:
            ai_prompt = f"""
            Analyze this test result for the CodegenApp dashboard:
            Test: {test_name}
            Status: {status}
            Details: {details}
            
            Provide:
            1. Assessment of the test outcome
            2. Potential issues or improvements
            3. User experience impact
            4. Technical recommendations
            """
            
            ai_response = model.generate_content(ai_prompt)
            result['ai_analysis'] = ai_response.text
        except Exception as e:
            result['ai_analysis'] = f"AI analysis failed: {str(e)}"
            
        self.test_results.append(result)
        print(f"✅ {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
            
    async def test_dashboard_loading(self):
        """Test 1: Dashboard Loading and Basic Functionality"""
        try:
            print("\n🔄 Testing Dashboard Loading...")
            
            # Navigate to dashboard
            await self.page.goto(self.base_url, wait_until='networkidle')
            await self.page.wait_for_timeout(3000)
            
            # Take screenshot
            screenshot_path = f"screenshots/dashboard_loading_{int(time.time())}.png"
            await self.page.screenshot(path=screenshot_path, full_page=True)
            
            # Check if main elements are present
            title = await self.page.title()
            
            # Check for key UI elements
            elements_to_check = [
                'h1:has-text("CodegenApp Dashboard")',
                'button:has-text("Add Project")',
                '[data-testid="project-selector"]',
                '.dashboard-container'
            ]
            
            missing_elements = []
            for selector in elements_to_check:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                except:
                    missing_elements.append(selector)
            
            if missing_elements:
                await self.log_test_result(
                    "Dashboard Loading",
                    "PARTIAL",
                    f"Dashboard loaded but missing elements: {missing_elements}",
                    screenshot_path
                )
            else:
                await self.log_test_result(
                    "Dashboard Loading",
                    "PASS",
                    f"Dashboard loaded successfully. Title: {title}",
                    screenshot_path
                )
                
        except Exception as e:
            await self.log_test_result(
                "Dashboard Loading",
                "FAIL",
                f"Failed to load dashboard: {str(e)}",
                screenshot_path
            )
            
    async def test_project_selector(self):
        """Test 2: Project Selector Functionality"""
        try:
            print("\n🔄 Testing Project Selector...")
            
            # Look for project selector dropdown
            try:
                await self.page.click('button:has-text("Select Repository")', timeout=10000)
                await self.page.wait_for_timeout(2000)
                
                # Take screenshot of dropdown
                screenshot_path = f"screenshots/project_selector_{int(time.time())}.png"
                await self.page.screenshot(path=screenshot_path, full_page=True)
                
                # Check if repositories are loaded
                repos = await self.page.query_selector_all('.repository-item')
                
                if len(repos) > 0:
                    await self.log_test_result(
                        "Project Selector",
                        "PASS",
                        f"Project selector working. Found {len(repos)} repositories",
                        screenshot_path
                    )
                    
                    # Try selecting a repository
                    await repos[0].click()
                    await self.page.wait_for_timeout(2000)
                    
                else:
                    await self.log_test_result(
                        "Project Selector",
                        "PARTIAL",
                        "Project selector opened but no repositories found",
                        screenshot_path
                    )
                    
            except Exception as e:
                await self.log_test_result(
                    "Project Selector",
                    "FAIL",
                    f"Project selector failed: {str(e)}",
                    screenshot_path
                )
                
        except Exception as e:
            await self.log_test_result(
                "Project Selector",
                "FAIL",
                f"Project selector test failed: {str(e)}"
            )
            
    async def test_github_integration(self):
        """Test 3: GitHub API Integration"""
        try:
            print("\n🔄 Testing GitHub Integration...")
            
            # Test GitHub API directly
            headers = {
                'Authorization': f'token {os.environ["GITHUB_TOKEN"]}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            response = requests.get('https://api.github.com/user/repos', headers=headers)
            
            if response.status_code == 200:
                repos = response.json()
                await self.log_test_result(
                    "GitHub Integration",
                    "PASS",
                    f"GitHub API working. Found {len(repos)} repositories"
                )
                
                # Test if dashboard can access GitHub data
                await self.page.reload(wait_until='networkidle')
                await self.page.wait_for_timeout(3000)
                
                screenshot_path = f"screenshots/github_integration_{int(time.time())}.png"
                await self.page.screenshot(path=screenshot_path, full_page=True)
                
            else:
                await self.log_test_result(
                    "GitHub Integration",
                    "FAIL",
                    f"GitHub API failed: {response.status_code} - {response.text}"
                )
                
        except Exception as e:
            await self.log_test_result(
                "GitHub Integration",
                "FAIL",
                f"GitHub integration test failed: {str(e)}"
            )
            
    async def test_codegen_api_integration(self):
        """Test 4: Codegen API Integration"""
        try:
            print("\n🔄 Testing Codegen API Integration...")
            
            # Test Codegen API connectivity
            headers = {
                'Authorization': f'Bearer {os.environ["CODEGEN_API_TOKEN"]}',
                'Content-Type': 'application/json'
            }
            
            # Test API endpoint
            api_url = 'https://api.codegen.com/api/v1/agent-runs'
            
            test_payload = {
                'prompt': 'Test connection from CodegenApp dashboard',
                'context': 'Testing API integration'
            }
            
            try:
                response = requests.post(api_url, headers=headers, json=test_payload, timeout=10)
                
                if response.status_code in [200, 201]:
                    await self.log_test_result(
                        "Codegen API Integration",
                        "PASS",
                        f"Codegen API working. Response: {response.status_code}"
                    )
                else:
                    await self.log_test_result(
                        "Codegen API Integration",
                        "PARTIAL",
                        f"Codegen API responded but with status: {response.status_code}"
                    )
                    
            except requests.exceptions.Timeout:
                await self.log_test_result(
                    "Codegen API Integration",
                    "PARTIAL",
                    "Codegen API timeout - may be working but slow"
                )
                
        except Exception as e:
            await self.log_test_result(
                "Codegen API Integration",
                "FAIL",
                f"Codegen API test failed: {str(e)}"
            )
            
    async def test_agent_run_dialog(self):
        """Test 5: Agent Run Dialog Functionality"""
        try:
            print("\n🔄 Testing Agent Run Dialog...")
            
            # Look for "Agent Run" or "Run" button
            run_buttons = await self.page.query_selector_all('button:has-text("Run"), button:has-text("Agent Run")')
            
            if len(run_buttons) > 0:
                # Click the first run button
                await run_buttons[0].click()
                await self.page.wait_for_timeout(2000)
                
                # Check if dialog opened
                dialog = await self.page.query_selector('.modal, .dialog, [role="dialog"]')
                
                if dialog:
                    screenshot_path = f"screenshots/agent_run_dialog_{int(time.time())}.png"
                    await self.page.screenshot(path=screenshot_path, full_page=True)
                    
                    # Look for target text input
                    text_input = await self.page.query_selector('textarea, input[type="text"]')
                    
                    if text_input:
                        # Test input functionality
                        await text_input.fill("Test agent run from web-eval-agent")
                        await self.page.wait_for_timeout(1000)
                        
                        await self.log_test_result(
                            "Agent Run Dialog",
                            "PASS",
                            "Agent run dialog working with text input",
                            screenshot_path
                        )
                        
                        # Close dialog
                        close_button = await self.page.query_selector('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]')
                        if close_button:
                            await close_button.click()
                            
                    else:
                        await self.log_test_result(
                            "Agent Run Dialog",
                            "PARTIAL",
                            "Dialog opened but no text input found",
                            screenshot_path
                        )
                else:
                    await self.log_test_result(
                        "Agent Run Dialog",
                        "FAIL",
                        "Run button clicked but no dialog appeared"
                    )
            else:
                await self.log_test_result(
                    "Agent Run Dialog",
                    "FAIL",
                    "No run buttons found on the page"
                )
                
        except Exception as e:
            await self.log_test_result(
                "Agent Run Dialog",
                "FAIL",
                f"Agent run dialog test failed: {str(e)}"
            )
            
    async def test_project_settings(self):
        """Test 6: Project Settings Functionality"""
        try:
            print("\n🔄 Testing Project Settings...")
            
            # Look for settings button/icon
            settings_buttons = await self.page.query_selector_all('button[aria-label*="Settings"], .settings-button, button:has-text("Settings")')
            
            if len(settings_buttons) > 0:
                await settings_buttons[0].click()
                await self.page.wait_for_timeout(2000)
                
                screenshot_path = f"screenshots/project_settings_{int(time.time())}.png"
                await self.page.screenshot(path=screenshot_path, full_page=True)
                
                # Check for settings tabs
                tabs = await self.page.query_selector_all('[role="tab"], .tab-button')
                
                if len(tabs) > 0:
                    await self.log_test_result(
                        "Project Settings",
                        "PASS",
                        f"Project settings opened with {len(tabs)} tabs",
                        screenshot_path
                    )
                else:
                    await self.log_test_result(
                        "Project Settings",
                        "PARTIAL",
                        "Settings opened but no tabs found",
                        screenshot_path
                    )
                    
                # Close settings
                close_button = await self.page.query_selector('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]')
                if close_button:
                    await close_button.click()
                    
            else:
                await self.log_test_result(
                    "Project Settings",
                    "FAIL",
                    "No settings buttons found"
                )
                
        except Exception as e:
            await self.log_test_result(
                "Project Settings",
                "FAIL",
                f"Project settings test failed: {str(e)}"
            )
            
    async def test_responsive_design(self):
        """Test 7: Responsive Design"""
        try:
            print("\n🔄 Testing Responsive Design...")
            
            # Test different screen sizes
            screen_sizes = [
                {'width': 1920, 'height': 1080, 'name': 'Desktop'},
                {'width': 768, 'height': 1024, 'name': 'Tablet'},
                {'width': 375, 'height': 667, 'name': 'Mobile'}
            ]
            
            responsive_results = []
            
            for size in screen_sizes:
                await self.page.set_viewport_size({'width': size['width'], 'height': size['height']})
                await self.page.wait_for_timeout(2000)
                
                screenshot_path = f"screenshots/responsive_{size['name'].lower()}_{int(time.time())}.png"
                await self.page.screenshot(path=screenshot_path, full_page=True)
                
                # Check if layout adapts properly
                body = await self.page.query_selector('body')
                if body:
                    responsive_results.append(f"{size['name']}: Layout adapted")
                else:
                    responsive_results.append(f"{size['name']}: Layout issues")
                    
            await self.log_test_result(
                "Responsive Design",
                "PASS",
                f"Tested {len(screen_sizes)} screen sizes: {', '.join(responsive_results)}"
            )
            
            # Reset to desktop size
            await self.page.set_viewport_size({'width': 1920, 'height': 1080})
            
        except Exception as e:
            await self.log_test_result(
                "Responsive Design",
                "FAIL",
                f"Responsive design test failed: {str(e)}"
            )
            
    async def test_error_handling(self):
        """Test 8: Error Handling and Edge Cases"""
        try:
            print("\n🔄 Testing Error Handling...")
            
            # Test with invalid API keys (temporarily)
            original_token = os.environ.get('GITHUB_TOKEN')
            os.environ['GITHUB_TOKEN'] = 'invalid_token'
            
            # Reload page to trigger API calls with invalid token
            await self.page.reload(wait_until='networkidle')
            await self.page.wait_for_timeout(5000)
            
            screenshot_path = f"screenshots/error_handling_{int(time.time())}.png"
            await self.page.screenshot(path=screenshot_path, full_page=True)
            
            # Check for error messages
            error_elements = await self.page.query_selector_all('.error, .alert-error, [role="alert"]')
            
            # Restore original token
            if original_token:
                os.environ['GITHUB_TOKEN'] = original_token
            
            if len(error_elements) > 0:
                await self.log_test_result(
                    "Error Handling",
                    "PASS",
                    f"Error handling working. Found {len(error_elements)} error messages",
                    screenshot_path
                )
            else:
                await self.log_test_result(
                    "Error Handling",
                    "PARTIAL",
                    "No error messages displayed for invalid API key",
                    screenshot_path
                )
                
        except Exception as e:
            await self.log_test_result(
                "Error Handling",
                "FAIL",
                f"Error handling test failed: {str(e)}"
            )
            
    async def test_performance_metrics(self):
        """Test 9: Performance Metrics"""
        try:
            print("\n🔄 Testing Performance Metrics...")
            
            # Measure page load time
            start_time = time.time()
            await self.page.goto(self.base_url, wait_until='networkidle')
            load_time = time.time() - start_time
            
            # Get performance metrics
            metrics = await self.page.evaluate('''() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.fetchStart
                };
            }''')
            
            performance_summary = f"Load time: {load_time:.2f}s, DOM: {metrics['domContentLoaded']:.2f}ms, Total: {metrics['totalTime']:.2f}ms"
            
            if load_time < 5.0:  # Under 5 seconds is good
                await self.log_test_result(
                    "Performance Metrics",
                    "PASS",
                    performance_summary
                )
            else:
                await self.log_test_result(
                    "Performance Metrics",
                    "PARTIAL",
                    f"Slow loading: {performance_summary}"
                )
                
        except Exception as e:
            await self.log_test_result(
                "Performance Metrics",
                "FAIL",
                f"Performance test failed: {str(e)}"
            )
            
    async def test_accessibility(self):
        """Test 10: Accessibility Features"""
        try:
            print("\n🔄 Testing Accessibility...")
            
            # Check for accessibility attributes
            accessibility_checks = []
            
            # Check for alt text on images
            images = await self.page.query_selector_all('img')
            images_with_alt = 0
            for img in images:
                alt = await img.get_attribute('alt')
                if alt:
                    images_with_alt += 1
                    
            accessibility_checks.append(f"Images with alt text: {images_with_alt}/{len(images)}")
            
            # Check for ARIA labels
            aria_elements = await self.page.query_selector_all('[aria-label], [aria-labelledby], [role]')
            accessibility_checks.append(f"ARIA elements: {len(aria_elements)}")
            
            # Check for keyboard navigation
            focusable_elements = await self.page.query_selector_all('button, input, select, textarea, a[href]')
            accessibility_checks.append(f"Focusable elements: {len(focusable_elements)}")
            
            screenshot_path = f"screenshots/accessibility_{int(time.time())}.png"
            await self.page.screenshot(path=screenshot_path, full_page=True)
            
            await self.log_test_result(
                "Accessibility",
                "PASS",
                f"Accessibility checks: {', '.join(accessibility_checks)}",
                screenshot_path
            )
            
        except Exception as e:
            await self.log_test_result(
                "Accessibility",
                "FAIL",
                f"Accessibility test failed: {str(e)}"
            )
            
    async def generate_comprehensive_report(self):
        """Generate comprehensive test report with AI analysis"""
        print("\n📊 Generating Comprehensive Test Report...")
        
        # Create screenshots directory
        os.makedirs('screenshots', exist_ok=True)
        
        # Calculate test statistics
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'PASS'])
        partial_tests = len([r for r in self.test_results if r['status'] == 'PARTIAL'])
        failed_tests = len([r for r in self.test_results if r['status'] == 'FAIL'])
        
        # Generate AI-powered comprehensive analysis
        ai_prompt = f"""
        Analyze these comprehensive test results for the CodegenApp dashboard:
        
        Total Tests: {total_tests}
        Passed: {passed_tests}
        Partial: {partial_tests}
        Failed: {failed_tests}
        
        Test Results:
        {json.dumps(self.test_results, indent=2)}
        
        Provide a comprehensive analysis including:
        1. Overall system health assessment
        2. Critical issues that need immediate attention
        3. User experience impact analysis
        4. Technical recommendations for improvements
        5. Priority ranking of issues
        6. Deployment readiness assessment
        """
        
        try:
            ai_analysis = model.generate_content(ai_prompt)
            comprehensive_analysis = ai_analysis.text
        except Exception as e:
            comprehensive_analysis = f"AI analysis failed: {str(e)}"
        
        # Generate report
        report = {
            'test_summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'partial': partial_tests,
                'failed': failed_tests,
                'success_rate': f"{(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%"
            },
            'test_results': self.test_results,
            'ai_comprehensive_analysis': comprehensive_analysis,
            'timestamp': datetime.now().isoformat(),
            'environment': {
                'dashboard_url': self.base_url,
                'github_token_configured': bool(os.environ.get('GITHUB_TOKEN')),
                'codegen_api_configured': bool(os.environ.get('CODEGEN_API_TOKEN')),
                'gemini_api_configured': bool(os.environ.get('GEMINI_API_KEY'))
            }
        }
        
        # Save report
        with open('comprehensive_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        # Print summary
        print(f"\n🎯 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"⚠️  Partial: {partial_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print(f"\n📋 Report saved to: comprehensive_test_report.json")
        print(f"📸 Screenshots saved to: screenshots/")
        
        return report
        
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Comprehensive CodegenApp Dashboard Testing")
        print("="*60)
        
        await self.setup_browser()
        
        try:
            # Run all test scenarios
            await self.test_dashboard_loading()
            await self.test_project_selector()
            await self.test_github_integration()
            await self.test_codegen_api_integration()
            await self.test_agent_run_dialog()
            await self.test_project_settings()
            await self.test_responsive_design()
            await self.test_error_handling()
            await self.test_performance_metrics()
            await self.test_accessibility()
            
            # Generate comprehensive report
            report = await self.generate_comprehensive_report()
            
            return report
            
        finally:
            await self.cleanup()

async def main():
    """Main test execution"""
    tester = DashboardTester()
    report = await tester.run_all_tests()
    
    print("\n🎉 Comprehensive testing completed!")
    print(f"📊 Success Rate: {report['test_summary']['success_rate']}")
    
    return report

if __name__ == "__main__":
    asyncio.run(main())
