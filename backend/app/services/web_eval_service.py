"""
CodegenApp Web-Eval Service
Comprehensive web application testing and evaluation using Playwright and AI analysis
"""

import asyncio
import json
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, AsyncGenerator
import base64

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.models.validation import WebEvalResult
from app.utils.exceptions import WebEvalException
from app.services.adapters.gemini_adapter import GeminiAdapter

logger = get_logger(__name__)
settings = get_settings()


class WebTestRunner:
    """
    Individual web test execution
    
    Handles single test case execution with screenshot capture,
    performance monitoring, and error handling.
    """
    
    def __init__(self, browser: Browser, test_config: Dict[str, Any]):
        self.browser = browser
        self.test_config = test_config
        self.screenshots: List[str] = []
        self.performance_metrics: Dict[str, float] = {}
        self.errors: List[str] = []
    
    async def run_test(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run individual test case
        
        Args:
            test_case: Test case configuration
            
        Returns:
            Test result dictionary
        """
        test_name = test_case.get("name", "unnamed_test")
        test_url = test_case.get("url", "")
        test_actions = test_case.get("actions", [])
        
        logger.info("Running web test", test_name=test_name, url=test_url)
        
        context = None
        page = None
        
        try:
            # Create browser context
            context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="CodegenApp-WebEval/1.0"
            )
            
            # Create page
            page = await context.new_page()
            
            # Enable performance monitoring
            await self._setup_performance_monitoring(page)
            
            # Navigate to URL
            start_time = time.time()
            await page.goto(test_url, wait_until="networkidle", timeout=30000)
            load_time = time.time() - start_time
            
            self.performance_metrics[f"{test_name}_load_time"] = load_time
            
            # Take initial screenshot
            screenshot_path = await self._take_screenshot(page, f"{test_name}_initial")
            
            # Execute test actions
            action_results = []
            for i, action in enumerate(test_actions):
                try:
                    action_result = await self._execute_action(page, action, f"{test_name}_action_{i}")
                    action_results.append(action_result)
                except Exception as e:
                    error_msg = f"Action {i} failed: {str(e)}"
                    self.errors.append(error_msg)
                    action_results.append({"success": False, "error": error_msg})
            
            # Take final screenshot
            await self._take_screenshot(page, f"{test_name}_final")
            
            # Collect performance metrics
            await self._collect_performance_metrics(page, test_name)
            
            # Run accessibility checks
            accessibility_score = await self._check_accessibility(page)
            
            return {
                "name": test_name,
                "success": all(result.get("success", False) for result in action_results),
                "load_time": load_time,
                "action_results": action_results,
                "accessibility_score": accessibility_score,
                "screenshots": self.screenshots,
                "errors": self.errors
            }
            
        except Exception as e:
            error_msg = f"Test {test_name} failed: {str(e)}"
            logger.error("Web test failed", test_name=test_name, error=str(e))
            self.errors.append(error_msg)
            
            return {
                "name": test_name,
                "success": False,
                "error": error_msg,
                "screenshots": self.screenshots,
                "errors": self.errors
            }
            
        finally:
            if page:
                await page.close()
            if context:
                await context.close()
    
    async def _setup_performance_monitoring(self, page: Page):
        """Setup performance monitoring on page"""
        await page.add_init_script("""
            window.performanceMetrics = {
                navigationStart: performance.timing.navigationStart,
                loadEventEnd: 0,
                domContentLoaded: 0,
                firstPaint: 0,
                firstContentfulPaint: 0
            };
            
            window.addEventListener('load', () => {
                window.performanceMetrics.loadEventEnd = performance.timing.loadEventEnd;
            });
            
            document.addEventListener('DOMContentLoaded', () => {
                window.performanceMetrics.domContentLoaded = performance.timing.domContentLoadedEventEnd;
            });
            
            // Capture paint metrics
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-paint') {
                            window.performanceMetrics.firstPaint = entry.startTime;
                        }
                        if (entry.name === 'first-contentful-paint') {
                            window.performanceMetrics.firstContentfulPaint = entry.startTime;
                        }
                    }
                });
                observer.observe({entryTypes: ['paint']});
            }
        """)
    
    async def _execute_action(self, page: Page, action: Dict[str, Any], screenshot_name: str) -> Dict[str, Any]:
        """Execute individual test action"""
        action_type = action.get("type", "")
        
        try:
            if action_type == "click":
                selector = action.get("selector", "")
                await page.click(selector, timeout=10000)
                
            elif action_type == "fill":
                selector = action.get("selector", "")
                value = action.get("value", "")
                await page.fill(selector, value, timeout=10000)
                
            elif action_type == "wait":
                selector = action.get("selector")
                timeout = action.get("timeout", 5000)
                if selector:
                    await page.wait_for_selector(selector, timeout=timeout)
                else:
                    await page.wait_for_timeout(timeout)
                    
            elif action_type == "assert_text":
                selector = action.get("selector", "")
                expected_text = action.get("text", "")
                element = await page.wait_for_selector(selector, timeout=10000)
                actual_text = await element.text_content()
                
                if expected_text not in actual_text:
                    raise AssertionError(f"Expected '{expected_text}' not found in '{actual_text}'")
                    
            elif action_type == "assert_visible":
                selector = action.get("selector", "")
                await page.wait_for_selector(selector, state="visible", timeout=10000)
                
            elif action_type == "screenshot":
                await self._take_screenshot(page, screenshot_name)
                
            else:
                raise ValueError(f"Unknown action type: {action_type}")
            
            # Take screenshot after action
            await self._take_screenshot(page, screenshot_name)
            
            return {"success": True, "action": action}
            
        except Exception as e:
            await self._take_screenshot(page, f"{screenshot_name}_error")
            return {"success": False, "action": action, "error": str(e)}
    
    async def _take_screenshot(self, page: Page, name: str) -> str:
        """Take and save screenshot"""
        try:
            screenshot_dir = Path(tempfile.gettempdir()) / "codegenapp_screenshots"
            screenshot_dir.mkdir(exist_ok=True)
            
            timestamp = int(time.time())
            screenshot_path = screenshot_dir / f"{name}_{timestamp}.png"
            
            await page.screenshot(path=str(screenshot_path), full_page=True)
            
            # Convert to base64 for storage
            with open(screenshot_path, "rb") as f:
                screenshot_data = base64.b64encode(f.read()).decode()
            
            screenshot_info = {
                "name": name,
                "path": str(screenshot_path),
                "data": screenshot_data,
                "timestamp": timestamp
            }
            
            self.screenshots.append(screenshot_info)
            return str(screenshot_path)
            
        except Exception as e:
            logger.error("Failed to take screenshot", name=name, error=str(e))
            return ""
    
    async def _collect_performance_metrics(self, page: Page, test_name: str):
        """Collect performance metrics from page"""
        try:
            metrics = await page.evaluate("window.performanceMetrics")
            
            if metrics:
                self.performance_metrics.update({
                    f"{test_name}_dom_content_loaded": metrics.get("domContentLoaded", 0),
                    f"{test_name}_first_paint": metrics.get("firstPaint", 0),
                    f"{test_name}_first_contentful_paint": metrics.get("firstContentfulPaint", 0)
                })
                
        except Exception as e:
            logger.warning("Failed to collect performance metrics", error=str(e))
    
    async def _check_accessibility(self, page: Page) -> float:
        """Run basic accessibility checks"""
        try:
            # Inject axe-core for accessibility testing
            await page.add_script_tag(url="https://unpkg.com/axe-core@4.7.0/axe.min.js")
            
            # Run accessibility scan
            results = await page.evaluate("""
                new Promise((resolve) => {
                    axe.run((err, results) => {
                        if (err) {
                            resolve({violations: [], passes: []});
                        } else {
                            resolve(results);
                        }
                    });
                });
            """)
            
            violations = results.get("violations", [])
            passes = results.get("passes", [])
            
            # Calculate accessibility score
            total_checks = len(violations) + len(passes)
            if total_checks > 0:
                score = len(passes) / total_checks
            else:
                score = 1.0
            
            return score
            
        except Exception as e:
            logger.warning("Accessibility check failed", error=str(e))
            return 0.5  # Default score when check fails


class WebEvalService:
    """
    Web evaluation service with comprehensive testing capabilities
    
    Provides automated web application testing using Playwright with
    AI-powered analysis and comprehensive reporting.
    """
    
    def __init__(self):
        self.gemini_adapter = GeminiAdapter()
        logger.info("WebEvalService initialized")
    
    async def run_comprehensive_tests(
        self,
        project_name: str,
        deployment_url: Optional[str],
        test_config: Dict[str, Any]
    ) -> WebEvalResult:
        """
        Run comprehensive web application tests
        
        Args:
            project_name: Name of the project being tested
            deployment_url: URL of deployed application
            test_config: Test configuration and scenarios
            
        Returns:
            WebEvalResult with comprehensive test results
        """
        if not deployment_url:
            return WebEvalResult(
                success=False,
                tests_passed=0,
                tests_failed=1,
                total_tests=1,
                ui_issues=[{"severity": "high", "description": "No deployment URL provided"}]
            )
        
        logger.info(
            "Starting comprehensive web evaluation",
            project=project_name,
            url=deployment_url
        )
        
        async with async_playwright() as playwright:
            # Launch browser
            browser = await playwright.chromium.launch(
                headless=settings.web_eval.headless,
                args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            
            try:
                # Create test runner
                test_runner = WebTestRunner(browser, test_config)
                
                # Get test scenarios
                test_scenarios = self._get_test_scenarios(deployment_url, test_config)
                
                # Run all tests
                test_results = []
                for scenario in test_scenarios:
                    result = await test_runner.run_test(scenario)
                    test_results.append(result)
                
                # Analyze results
                analysis_result = await self._analyze_test_results(
                    test_results,
                    test_runner.performance_metrics,
                    test_runner.screenshots
                )
                
                # Calculate summary metrics
                total_tests = len(test_results)
                passed_tests = sum(1 for result in test_results if result.get("success", False))
                failed_tests = total_tests - passed_tests
                
                # Calculate coverage percentage
                coverage_percentage = (passed_tests / total_tests * 100) if total_tests > 0 else 0
                
                # Extract performance metrics
                avg_load_time = sum(
                    result.get("load_time", 0) for result in test_results
                ) / len(test_results) if test_results else 0
                
                performance_metrics = {
                    "average_load_time": avg_load_time,
                    "total_requests": len(test_results),
                    **test_runner.performance_metrics
                }
                
                # Calculate accessibility score
                accessibility_scores = [
                    result.get("accessibility_score", 0) for result in test_results
                ]
                avg_accessibility_score = sum(accessibility_scores) / len(accessibility_scores) if accessibility_scores else 0
                
                # Collect UI issues
                ui_issues = []
                for result in test_results:
                    for error in result.get("errors", []):
                        ui_issues.append({
                            "severity": "medium",
                            "description": error,
                            "test_name": result.get("name", "unknown")
                        })
                
                # Create final result
                web_eval_result = WebEvalResult(
                    success=failed_tests == 0,
                    tests_passed=passed_tests,
                    tests_failed=failed_tests,
                    total_tests=total_tests,
                    coverage_percentage=coverage_percentage,
                    performance_metrics=performance_metrics,
                    accessibility_score=avg_accessibility_score,
                    ui_issues=ui_issues,
                    screenshots=[screenshot["name"] for screenshot in test_runner.screenshots],
                    test_reports=test_results,
                    metadata={
                        "deployment_url": deployment_url,
                        "test_duration": sum(result.get("load_time", 0) for result in test_results),
                        "browser_used": "chromium",
                        "ai_analysis": analysis_result
                    }
                )
                
                logger.info(
                    "Web evaluation completed",
                    project=project_name,
                    success=web_eval_result.success,
                    tests_passed=passed_tests,
                    tests_failed=failed_tests
                )
                
                return web_eval_result
                
            finally:
                await browser.close()
    
    def _get_test_scenarios(self, deployment_url: str, test_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate test scenarios based on configuration"""
        
        # Default test scenarios
        default_scenarios = [
            {
                "name": "homepage_load",
                "url": deployment_url,
                "actions": [
                    {"type": "wait", "timeout": 3000},
                    {"type": "screenshot"},
                    {"type": "assert_visible", "selector": "body"}
                ]
            },
            {
                "name": "navigation_test",
                "url": deployment_url,
                "actions": [
                    {"type": "wait", "timeout": 2000},
                    {"type": "screenshot"},
                    # Add more navigation tests based on common patterns
                ]
            }
        ]
        
        # Merge with custom test scenarios from config
        custom_scenarios = test_config.get("test_scenarios", [])
        
        # Ensure all scenarios have the base URL
        for scenario in custom_scenarios:
            if not scenario.get("url"):
                scenario["url"] = deployment_url
        
        return default_scenarios + custom_scenarios
    
    async def _analyze_test_results(
        self,
        test_results: List[Dict[str, Any]],
        performance_metrics: Dict[str, float],
        screenshots: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze test results using AI"""
        
        try:
            # Use Gemini to analyze test results
            analysis = await self.gemini_adapter.analyze_web_evaluation(
                test_results=test_results,
                performance_metrics=performance_metrics,
                screenshots=[s["name"] for s in screenshots]
            )
            
            return {
                "ai_analysis": analysis.analysis,
                "recommendations": analysis.recommendations,
                "confidence_score": analysis.confidence_score
            }
            
        except Exception as e:
            logger.error("AI analysis of test results failed", error=str(e))
            return {
                "ai_analysis": "AI analysis unavailable",
                "recommendations": [],
                "confidence_score": 0.5
            }
    
    async def run_performance_tests(
        self,
        deployment_url: str,
        performance_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run focused performance tests"""
        
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            
            try:
                context = await browser.new_context()
                page = await context.new_page()
                
                # Enable performance monitoring
                await page.route("**/*", self._track_network_requests)
                
                # Load page and measure performance
                start_time = time.time()
                await page.goto(deployment_url, wait_until="networkidle")
                load_time = time.time() - start_time
                
                # Collect performance metrics
                metrics = await page.evaluate("""
                    JSON.stringify({
                        timing: performance.timing,
                        navigation: performance.navigation,
                        memory: performance.memory || {}
                    })
                """)
                
                performance_data = json.loads(metrics)
                
                return {
                    "load_time": load_time,
                    "performance_timing": performance_data["timing"],
                    "memory_usage": performance_data["memory"],
                    "navigation_type": performance_data["navigation"]["type"]
                }
                
            finally:
                await browser.close()
    
    async def _track_network_requests(self, route):
        """Track network requests for performance analysis"""
        # Log request details
        request = route.request
        logger.debug(
            "Network request",
            url=request.url,
            method=request.method,
            resource_type=request.resource_type
        )
        
        # Continue with the request
        await route.continue_()
    
    async def run_accessibility_audit(self, deployment_url: str) -> Dict[str, Any]:
        """Run comprehensive accessibility audit"""
        
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            
            try:
                context = await browser.new_context()
                page = await context.new_page()
                
                await page.goto(deployment_url)
                
                # Inject axe-core
                await page.add_script_tag(url="https://unpkg.com/axe-core@4.7.0/axe.min.js")
                
                # Run comprehensive accessibility scan
                results = await page.evaluate("""
                    new Promise((resolve) => {
                        axe.run({
                            tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
                        }, (err, results) => {
                            if (err) {
                                resolve({violations: [], passes: [], incomplete: []});
                            } else {
                                resolve(results);
                            }
                        });
                    });
                """)
                
                return {
                    "violations": results.get("violations", []),
                    "passes": results.get("passes", []),
                    "incomplete": results.get("incomplete", []),
                    "score": self._calculate_accessibility_score(results)
                }
                
            finally:
                await browser.close()
    
    def _calculate_accessibility_score(self, axe_results: Dict[str, Any]) -> float:
        """Calculate accessibility score from axe results"""
        violations = len(axe_results.get("violations", []))
        passes = len(axe_results.get("passes", []))
        
        total = violations + passes
        if total == 0:
            return 1.0
        
        return passes / total

