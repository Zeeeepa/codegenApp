#!/usr/bin/env python3
"""
Enhanced Settings Dialog Test Suite
Tests the new AI Services and Cloudflare configuration tabs
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Environment variables for testing - Configure these with your actual values
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your_gemini_api_key_here")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "your_github_token_here")
CODEGEN_API_TOKEN = os.getenv("CODEGEN_API_TOKEN", "your_codegen_api_token_here")
CLOUDFLARE_API_KEY = os.getenv("CLOUDFLARE_API_KEY", "your_cloudflare_api_key_here")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "your_cloudflare_account_id_here")

class EnhancedSettingsTest:
    def __init__(self):
        self.results = []
        self.screenshots_dir = "screenshots"
        os.makedirs(self.screenshots_dir, exist_ok=True)
        
    async def run_tests(self):
        """Run all enhanced settings dialog tests"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
            page = await context.new_page()
            
            try:
                # Navigate to the application
                await page.goto('http://localhost:3000')
                await page.wait_for_load_state('networkidle')
                
                # Run test suite
                await self.test_settings_dialog_access(page)
                await self.test_ai_services_tab(page)
                await self.test_cloudflare_tab(page)
                await self.test_token_visibility_toggles(page)
                await self.test_connection_testing(page)
                await self.test_settings_persistence(page)
                
            except Exception as e:
                print(f"Test execution error: {e}")
                await page.screenshot(path=f"{self.screenshots_dir}/error_{int(datetime.now().timestamp())}.png")
                
            finally:
                await browser.close()
                
        # Generate test report
        self.generate_report()
        
    async def test_settings_dialog_access(self, page):
        """Test accessing the enhanced settings dialog"""
        test_name = "Settings Dialog Access"
        try:
            # Look for settings button/icon
            settings_button = page.locator('[data-testid="settings-button"], .settings-icon, [aria-label*="settings" i]').first
            
            if await settings_button.count() > 0:
                await settings_button.click()
                await page.wait_for_timeout(1000)
                
                # Check if settings dialog opened
                settings_dialog = page.locator('[data-testid="settings-dialog"]')
                if await settings_dialog.count() > 0:
                    await page.screenshot(path=f"{self.screenshots_dir}/settings_dialog_opened_{int(datetime.now().timestamp())}.png")
                    self.results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "message": "Settings dialog opened successfully"
                    })
                else:
                    self.results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "message": "Settings dialog did not open"
                    })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "Settings button not found"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    async def test_ai_services_tab(self, page):
        """Test the AI Services tab functionality"""
        test_name = "AI Services Tab"
        try:
            # Click on AI Services tab
            ai_tab = page.locator('button:has-text("AI Services"), button:has-text("🤖")')
            
            if await ai_tab.count() > 0:
                await ai_tab.click()
                await page.wait_for_timeout(500)
                
                # Check for Gemini API key field
                gemini_field = page.locator('[data-testid="settings-gemini-api-key"], #gemini_api_key')
                
                if await gemini_field.count() > 0:
                    # Test input functionality
                    await gemini_field.fill("test-api-key")
                    
                    # Check for test button
                    test_button = page.locator('[data-testid="test-gemini-api-key"]')
                    
                    await page.screenshot(path=f"{self.screenshots_dir}/ai_services_tab_{int(datetime.now().timestamp())}.png")
                    
                    self.results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "message": f"AI Services tab functional with Gemini field and test button: {await test_button.count() > 0}"
                    })
                else:
                    self.results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "message": "Gemini API key field not found"
                    })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "AI Services tab not found"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    async def test_cloudflare_tab(self, page):
        """Test the Cloudflare tab functionality"""
        test_name = "Cloudflare Tab"
        try:
            # Click on Cloudflare tab
            cloudflare_tab = page.locator('button:has-text("Cloudflare"), button:has-text("☁️")')
            
            if await cloudflare_tab.count() > 0:
                await cloudflare_tab.click()
                await page.wait_for_timeout(500)
                
                # Check for required fields
                api_key_field = page.locator('[data-testid="settings-cloudflare-api-key"], #cloudflare_api_key')
                account_id_field = page.locator('[data-testid="settings-cloudflare-account-id"], #cloudflare_account_id')
                worker_name_field = page.locator('[data-testid="settings-cloudflare-worker-name"], #cloudflare_worker_name')
                worker_url_field = page.locator('[data-testid="settings-cloudflare-worker-url"], #cloudflare_worker_url')
                
                fields_found = {
                    "api_key": await api_key_field.count() > 0,
                    "account_id": await account_id_field.count() > 0,
                    "worker_name": await worker_name_field.count() > 0,
                    "worker_url": await worker_url_field.count() > 0
                }
                
                # Test input functionality
                if fields_found["api_key"]:
                    await api_key_field.fill("test-cloudflare-key")
                if fields_found["account_id"]:
                    await account_id_field.fill("test-account-id")
                    
                await page.screenshot(path=f"{self.screenshots_dir}/cloudflare_tab_{int(datetime.now().timestamp())}.png")
                
                all_fields_present = all(fields_found.values())
                
                self.results.append({
                    "test": test_name,
                    "status": "PASSED" if all_fields_present else "PARTIAL",
                    "message": f"Cloudflare tab fields: {fields_found}"
                })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "Cloudflare tab not found"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    async def test_token_visibility_toggles(self, page):
        """Test token visibility toggle functionality"""
        test_name = "Token Visibility Toggles"
        try:
            # Go to AI Services tab first
            ai_tab = page.locator('button:has-text("AI Services"), button:has-text("🤖")')
            if await ai_tab.count() > 0:
                await ai_tab.click()
                await page.wait_for_timeout(500)
                
                # Find Gemini API key field and its toggle
                gemini_field = page.locator('[data-testid="settings-gemini-api-key"], #gemini_api_key')
                
                if await gemini_field.count() > 0:
                    # Fill with test data
                    await gemini_field.fill("test-secret-key")
                    
                    # Check initial type (should be password)
                    initial_type = await gemini_field.get_attribute('type')
                    
                    # Look for eye toggle button
                    eye_toggle = gemini_field.locator('..').locator('button:has([data-lucide="eye"]), button:has([data-lucide="eye-off"])')
                    
                    if await eye_toggle.count() > 0:
                        # Click toggle
                        await eye_toggle.click()
                        await page.wait_for_timeout(200)
                        
                        # Check if type changed
                        new_type = await gemini_field.get_attribute('type')
                        
                        toggle_works = initial_type != new_type
                        
                        await page.screenshot(path=f"{self.screenshots_dir}/token_visibility_{int(datetime.now().timestamp())}.png")
                        
                        self.results.append({
                            "test": test_name,
                            "status": "PASSED" if toggle_works else "FAILED",
                            "message": f"Toggle functionality: {initial_type} -> {new_type}"
                        })
                    else:
                        self.results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "message": "Eye toggle button not found"
                        })
                else:
                    self.results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "message": "Gemini API field not found for toggle test"
                    })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "Could not access AI Services tab"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    async def test_connection_testing(self, page):
        """Test API connection testing functionality"""
        test_name = "Connection Testing"
        try:
            # Test Gemini API connection
            ai_tab = page.locator('button:has-text("AI Services"), button:has-text("🤖")')
            if await ai_tab.count() > 0:
                await ai_tab.click()
                await page.wait_for_timeout(500)
                
                # Fill in a test API key
                gemini_field = page.locator('[data-testid="settings-gemini-api-key"], #gemini_api_key')
                if await gemini_field.count() > 0:
                    await gemini_field.fill(GEMINI_API_KEY)
                    
                    # Look for test button
                    test_button = page.locator('[data-testid="test-gemini-api-key"]')
                    
                    if await test_button.count() > 0:
                        # Click test button
                        await test_button.click()
                        
                        # Wait for test to complete (look for loading state change)
                        await page.wait_for_timeout(3000)
                        
                        # Check for success/error indicators
                        success_indicator = page.locator('text="connection successful", text="✅", [data-lucide="check-circle"]')
                        error_indicator = page.locator('text="connection failed", text="❌", [data-lucide="alert-circle"]')
                        
                        has_result = await success_indicator.count() > 0 or await error_indicator.count() > 0
                        
                        await page.screenshot(path=f"{self.screenshots_dir}/connection_test_{int(datetime.now().timestamp())}.png")
                        
                        self.results.append({
                            "test": test_name,
                            "status": "PASSED" if has_result else "PARTIAL",
                            "message": f"Connection test executed, result indicator present: {has_result}"
                        })
                    else:
                        self.results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "message": "Test button not found"
                        })
                else:
                    self.results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "message": "Gemini API field not found"
                    })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "AI Services tab not accessible"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    async def test_settings_persistence(self, page):
        """Test settings persistence functionality"""
        test_name = "Settings Persistence"
        try:
            # Fill in some test data
            ai_tab = page.locator('button:has-text("AI Services"), button:has-text("🤖")')
            if await ai_tab.count() > 0:
                await ai_tab.click()
                await page.wait_for_timeout(500)
                
                gemini_field = page.locator('[data-testid="settings-gemini-api-key"], #gemini_api_key')
                if await gemini_field.count() > 0:
                    test_value = "test-persistence-key"
                    await gemini_field.fill(test_value)
                    
                    # Look for save button
                    save_button = page.locator('[data-testid="settings-save"], button:has-text("Save")')
                    
                    if await save_button.count() > 0:
                        await save_button.click()
                        await page.wait_for_timeout(1000)
                        
                        # Close and reopen settings
                        close_button = page.locator('[data-testid="settings-close"], button:has([data-lucide="x"])')
                        if await close_button.count() > 0:
                            await close_button.click()
                            await page.wait_for_timeout(500)
                            
                            # Reopen settings
                            settings_button = page.locator('[data-testid="settings-button"], .settings-icon, [aria-label*="settings" i]').first
                            if await settings_button.count() > 0:
                                await settings_button.click()
                                await page.wait_for_timeout(1000)
                                
                                # Go back to AI Services tab
                                await ai_tab.click()
                                await page.wait_for_timeout(500)
                                
                                # Check if value persisted
                                current_value = await gemini_field.input_value()
                                
                                persistence_works = current_value == test_value
                                
                                await page.screenshot(path=f"{self.screenshots_dir}/settings_persistence_{int(datetime.now().timestamp())}.png")
                                
                                self.results.append({
                                    "test": test_name,
                                    "status": "PASSED" if persistence_works else "FAILED",
                                    "message": f"Settings persistence: {persistence_works} (expected: {test_value}, got: {current_value})"
                                })
                            else:
                                self.results.append({
                                    "test": test_name,
                                    "status": "FAILED",
                                    "message": "Could not reopen settings dialog"
                                })
                        else:
                            self.results.append({
                                "test": test_name,
                                "status": "FAILED",
                                "message": "Close button not found"
                            })
                    else:
                        self.results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "message": "Save button not found"
                        })
                else:
                    self.results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "message": "Gemini API field not found for persistence test"
                    })
            else:
                self.results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "message": "AI Services tab not accessible"
                })
                
        except Exception as e:
            self.results.append({
                "test": test_name,
                "status": "ERROR",
                "message": f"Error: {str(e)}"
            })
            
    def generate_report(self):
        """Generate comprehensive test report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Calculate statistics
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r["status"] == "PASSED"])
        failed_tests = len([r for r in self.results if r["status"] == "FAILED"])
        error_tests = len([r for r in self.results if r["status"] == "ERROR"])
        partial_tests = len([r for r in self.results if r["status"] == "PARTIAL"])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            "test_suite": "Enhanced Settings Dialog Test Suite",
            "timestamp": timestamp,
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "partial": partial_tests,
                "success_rate": f"{success_rate:.1f}%"
            },
            "test_results": self.results,
            "environment": {
                "gemini_api_configured": bool(GEMINI_API_KEY),
                "github_token_configured": bool(GITHUB_TOKEN),
                "cloudflare_configured": bool(CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID)
            }
        }
        
        # Save report
        report_file = f"enhanced_settings_test_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
            
        # Print summary
        print(f"\n🧪 Enhanced Settings Dialog Test Results")
        print(f"=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Errors: {error_tests}")
        print(f"🔄 Partial: {partial_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        # Print individual test results
        print(f"\n📋 Test Details:")
        for result in self.results:
            status_emoji = {
                "PASSED": "✅",
                "FAILED": "❌", 
                "ERROR": "⚠️",
                "PARTIAL": "🔄"
            }.get(result["status"], "❓")
            
            print(f"{status_emoji} {result['test']}: {result['message']}")

async def main():
    """Main test execution"""
    print("🚀 Starting Enhanced Settings Dialog Test Suite...")
    print("📋 Testing new AI Services and Cloudflare configuration tabs")
    print("🔧 Verifying token visibility toggles and connection testing")
    print("-" * 60)
    
    tester = EnhancedSettingsTest()
    await tester.run_tests()

if __name__ == "__main__":
    asyncio.run(main())
