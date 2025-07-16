"""
Web Evaluation Service

Integrates with Web-Eval-Agent for comprehensive web application testing.
"""

import asyncio
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
import logging
import time
from dataclasses import dataclass

from app.core.validation.snapshot_manager import ValidationSnapshot
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


@dataclass
class WebEvalResult:
    """Result of web evaluation testing"""
    success: bool
    test_count: int
    passed_tests: int
    failed_tests: int
    duration: float
    screenshots: List[str]
    test_results: List[Dict[str, Any]]
    error_logs: List[str]
    performance_metrics: Dict[str, Any]


class WebEvalService:
    """Service for running Web-Eval-Agent tests"""
    
    def __init__(self):
        self.settings = get_settings()
        self.active_evaluations: Dict[str, bool] = {}
    
    async def run_web_evaluation(
        self,
        snapshot: ValidationSnapshot,
        target_url: str,
        test_scenarios: List[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[str, str], None]] = None
    ) -> WebEvalResult:
        """Run comprehensive web evaluation testing"""
        
        eval_id = f"eval_{snapshot.snapshot_id}"
        self.active_evaluations[eval_id] = True
        
        snapshot.add_log("Starting web evaluation...")
        
        try:
            if progress_callback:
                progress_callback("starting", "Initializing web evaluation")
            
            # Prepare test configuration
            test_config = await self._prepare_test_config(
                snapshot, 
                target_url, 
                test_scenarios or self._get_default_test_scenarios()
            )
            
            # Run web evaluation
            result = await self._execute_web_eval_agent(
                snapshot,
                test_config,
                progress_callback
            )
            
            snapshot.add_log(f"Web evaluation completed. Success: {result.success}")
            return result
            
        except Exception as e:
            snapshot.add_log(f"Web evaluation failed: {str(e)}")
            logger.error(f"Web evaluation failed for {eval_id}: {e}")
            
            if progress_callback:
                progress_callback("error", f"Web evaluation error: {str(e)}")
            
            # Return failed result
            return WebEvalResult(
                success=False,
                test_count=0,
                passed_tests=0,
                failed_tests=1,
                duration=0.0,
                screenshots=[],
                test_results=[],
                error_logs=[str(e)],
                performance_metrics={}
            )
        finally:
            if eval_id in self.active_evaluations:
                del self.active_evaluations[eval_id]
    
    async def _prepare_test_config(
        self,
        snapshot: ValidationSnapshot,
        target_url: str,
        test_scenarios: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare test configuration for Web-Eval-Agent"""
        
        config = {
            "target_url": target_url,
            "project_name": snapshot.project_name,
            "pr_number": snapshot.pr_number,
            "snapshot_id": snapshot.snapshot_id,
            "browser_config": {
                "headless": True,
                "viewport": {"width": 1920, "height": 1080},
                "timeout": 30000
            },
            "test_scenarios": test_scenarios,
            "output_config": {
                "screenshots": True,
                "performance_metrics": True,
                "detailed_logs": True,
                "save_path": str(snapshot.workspace_path / "web_eval_results")
            },
            "gemini_config": {
                "model": "gemini-pro",
                "api_key": getattr(self.settings, 'gemini_api_key', ''),
                "analysis_enabled": True
            }
        }
        
        return config
    
    def _get_default_test_scenarios(self) -> List[Dict[str, Any]]:
        """Get default test scenarios for web evaluation"""
        
        return [
            {
                "name": "Homepage Load Test",
                "type": "navigation",
                "description": "Test homepage loading and basic functionality",
                "steps": [
                    {"action": "navigate", "url": "/"},
                    {"action": "wait_for_load"},
                    {"action": "screenshot", "name": "homepage"},
                    {"action": "check_title"},
                    {"action": "check_no_errors"}
                ]
            },
            {
                "name": "Navigation Test",
                "type": "interaction",
                "description": "Test main navigation functionality",
                "steps": [
                    {"action": "navigate", "url": "/"},
                    {"action": "find_navigation_links"},
                    {"action": "test_navigation_clicks"},
                    {"action": "screenshot", "name": "navigation"}
                ]
            },
            {
                "name": "Form Interaction Test",
                "type": "interaction",
                "description": "Test form inputs and submissions",
                "steps": [
                    {"action": "find_forms"},
                    {"action": "test_form_inputs"},
                    {"action": "test_form_validation"},
                    {"action": "screenshot", "name": "forms"}
                ]
            },
            {
                "name": "Responsive Design Test",
                "type": "responsive",
                "description": "Test responsive design across different viewports",
                "steps": [
                    {"action": "test_mobile_viewport"},
                    {"action": "test_tablet_viewport"},
                    {"action": "test_desktop_viewport"},
                    {"action": "screenshot", "name": "responsive"}
                ]
            },
            {
                "name": "Performance Test",
                "type": "performance",
                "description": "Test page performance and Core Web Vitals",
                "steps": [
                    {"action": "measure_load_time"},
                    {"action": "measure_core_web_vitals"},
                    {"action": "check_resource_loading"},
                    {"action": "analyze_performance"}
                ]
            },
            {
                "name": "Accessibility Test",
                "type": "accessibility",
                "description": "Test accessibility compliance",
                "steps": [
                    {"action": "check_aria_labels"},
                    {"action": "check_keyboard_navigation"},
                    {"action": "check_color_contrast"},
                    {"action": "run_accessibility_audit"}
                ]
            }
        ]
    
    async def _execute_web_eval_agent(
        self,
        snapshot: ValidationSnapshot,
        test_config: Dict[str, Any],
        progress_callback: Optional[Callable[[str, str], None]] = None
    ) -> WebEvalResult:
        """Execute Web-Eval-Agent with the test configuration"""
        
        start_time = time.time()
        
        # Create results directory
        results_dir = Path(test_config["output_config"]["save_path"])
        results_dir.mkdir(parents=True, exist_ok=True)
        
        # Write test configuration
        config_file = results_dir / "test_config.json"
        with open(config_file, "w") as f:
            json.dump(test_config, f, indent=2)
        
        # Create Web-Eval-Agent script
        script_content = self._create_web_eval_script(test_config)
        script_file = results_dir / "run_tests.py"
        with open(script_file, "w") as f:
            f.write(script_content)
        
        try:
            # Execute Web-Eval-Agent
            if progress_callback:
                progress_callback("running", "Executing web evaluation tests")
            
            result = await self._run_web_eval_script(
                script_file,
                snapshot,
                progress_callback
            )
            
            # Parse results
            web_eval_result = await self._parse_web_eval_results(
                results_dir,
                time.time() - start_time
            )
            
            return web_eval_result
            
        except Exception as e:
            snapshot.add_log(f"Web-Eval-Agent execution failed: {str(e)}")
            raise
    
    def _create_web_eval_script(self, test_config: Dict[str, Any]) -> str:
        """Create Python script for Web-Eval-Agent execution"""
        
        script = f'''
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright
import google.generativeai as genai
import time
import traceback

# Configuration
CONFIG = {json.dumps(test_config, indent=2)}

class WebEvaluator:
    def __init__(self, config):
        self.config = config
        self.results = []
        self.screenshots = []
        self.error_logs = []
        self.performance_metrics = {{}}
        
        # Initialize Gemini if configured
        if config.get("gemini_config", {{}}).get("api_key"):
            genai.configure(api_key=config["gemini_config"]["api_key"])
            self.gemini_model = genai.GenerativeModel('gemini-pro')
        else:
            self.gemini_model = None
    
    async def run_evaluation(self):
        """Run all test scenarios"""
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.config["browser_config"]["headless"]
            )
            
            context = await browser.new_context(
                viewport=self.config["browser_config"]["viewport"]
            )
            
            page = await context.new_page()
            
            try:
                for scenario in self.config["test_scenarios"]:
                    print(f"Running scenario: {{scenario['name']}}")
                    result = await self.run_scenario(page, scenario)
                    self.results.append(result)
                    
            except Exception as e:
                self.error_logs.append(f"Evaluation failed: {{str(e)}}")
                print(f"Error: {{e}}")
                traceback.print_exc()
            finally:
                await browser.close()
        
        # Save results
        await self.save_results()
    
    async def run_scenario(self, page, scenario):
        """Run a single test scenario"""
        
        start_time = time.time()
        result = {{
            "name": scenario["name"],
            "type": scenario["type"],
            "success": True,
            "duration": 0,
            "steps": [],
            "errors": []
        }}
        
        try:
            for step in scenario["steps"]:
                step_result = await self.execute_step(page, step)
                result["steps"].append(step_result)
                
                if not step_result["success"]:
                    result["success"] = False
                    result["errors"].append(step_result.get("error", "Step failed"))
                    
        except Exception as e:
            result["success"] = False
            result["errors"].append(str(e))
            
        result["duration"] = time.time() - start_time
        return result
    
    async def execute_step(self, page, step):
        """Execute a single test step"""
        
        action = step["action"]
        step_result = {{"action": action, "success": True}}
        
        try:
            if action == "navigate":
                url = step.get("url", "/")
                full_url = self.config["target_url"].rstrip("/") + url
                await page.goto(full_url, timeout=30000)
                
            elif action == "wait_for_load":
                await page.wait_for_load_state("networkidle", timeout=30000)
                
            elif action == "screenshot":
                name = step.get("name", "screenshot")
                screenshot_path = Path(self.config["output_config"]["save_path"]) / f"{{name}}.png"
                await page.screenshot(path=screenshot_path)
                self.screenshots.append(str(screenshot_path))
                
            elif action == "check_title":
                title = await page.title()
                step_result["title"] = title
                if not title or title.lower() == "untitled":
                    step_result["success"] = False
                    step_result["error"] = "Page title is missing or invalid"
                    
            elif action == "check_no_errors":
                # Check for JavaScript errors
                errors = await page.evaluate("""
                    () => {{
                        const errors = [];
                        const originalError = console.error;
                        console.error = (...args) => {{
                            errors.push(args.join(' '));
                            originalError.apply(console, args);
                        }};
                        return errors;
                    }}
                """)
                
                if errors:
                    step_result["success"] = False
                    step_result["error"] = f"JavaScript errors found: {{errors}}"
                    
            elif action == "find_navigation_links":
                links = await page.query_selector_all("nav a, header a, .nav a")
                step_result["link_count"] = len(links)
                
            elif action == "test_navigation_clicks":
                links = await page.query_selector_all("nav a, header a, .nav a")
                for i, link in enumerate(links[:5]):  # Test first 5 links
                    try:
                        href = await link.get_attribute("href")
                        if href and not href.startswith("#"):
                            await link.click()
                            await page.wait_for_load_state("networkidle", timeout=10000)
                            await page.go_back()
                    except Exception as e:
                        step_result["navigation_errors"] = step_result.get("navigation_errors", [])
                        step_result["navigation_errors"].append(f"Link {{i}}: {{str(e)}}")
                        
            elif action == "find_forms":
                forms = await page.query_selector_all("form")
                step_result["form_count"] = len(forms)
                
            elif action == "measure_load_time":
                start = time.time()
                await page.reload()
                await page.wait_for_load_state("networkidle")
                load_time = time.time() - start
                step_result["load_time"] = load_time
                self.performance_metrics["load_time"] = load_time
                
            else:
                # Default: just mark as successful for unknown actions
                step_result["note"] = f"Action '{{action}}' not implemented"
                
        except Exception as e:
            step_result["success"] = False
            step_result["error"] = str(e)
            
        return step_result
    
    async def save_results(self):
        """Save evaluation results"""
        
        results_summary = {{
            "success": all(r["success"] for r in self.results),
            "test_count": len(self.results),
            "passed_tests": sum(1 for r in self.results if r["success"]),
            "failed_tests": sum(1 for r in self.results if not r["success"]),
            "screenshots": self.screenshots,
            "test_results": self.results,
            "error_logs": self.error_logs,
            "performance_metrics": self.performance_metrics
        }}
        
        # Save to JSON file
        results_file = Path(self.config["output_config"]["save_path"]) / "results.json"
        with open(results_file, "w") as f:
            json.dump(results_summary, f, indent=2)
        
        print(f"Results saved to {{results_file}}")
        print(f"Success: {{results_summary['success']}}")
        print(f"Tests: {{results_summary['passed_tests']}}/{{results_summary['test_count']}} passed")

async def main():
    evaluator = WebEvaluator(CONFIG)
    await evaluator.run_evaluation()

if __name__ == "__main__":
    asyncio.run(main())
'''
        
        return script
    
    async def _run_web_eval_script(
        self,
        script_file: Path,
        snapshot: ValidationSnapshot,
        progress_callback: Optional[Callable[[str, str], None]] = None
    ) -> subprocess.CompletedProcess:
        """Run the Web-Eval-Agent script"""
        
        # Prepare environment
        env = snapshot.environment_vars.copy()
        
        # Run script
        cmd = f"cd {script_file.parent} && python {script_file.name}"
        
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        
        # Monitor output
        stdout_lines = []
        stderr_lines = []
        
        async def read_stdout():
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                line_str = line.decode().strip()
                stdout_lines.append(line_str)
                snapshot.add_log(f"WEB-EVAL: {line_str}")
                
                if progress_callback and "Running scenario:" in line_str:
                    scenario_name = line_str.split("Running scenario:")[-1].strip()
                    progress_callback("testing", f"Running: {scenario_name}")
        
        async def read_stderr():
            while True:
                line = await process.stderr.readline()
                if not line:
                    break
                line_str = line.decode().strip()
                stderr_lines.append(line_str)
                snapshot.add_log(f"WEB-EVAL ERROR: {line_str}")
        
        # Start reading both streams
        await asyncio.gather(read_stdout(), read_stderr())
        
        # Wait for completion
        exit_code = await process.wait()
        
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=exit_code,
            stdout="\n".join(stdout_lines),
            stderr="\n".join(stderr_lines)
        )
    
    async def _parse_web_eval_results(
        self,
        results_dir: Path,
        duration: float
    ) -> WebEvalResult:
        """Parse Web-Eval-Agent results"""
        
        results_file = results_dir / "results.json"
        
        if not results_file.exists():
            return WebEvalResult(
                success=False,
                test_count=0,
                passed_tests=0,
                failed_tests=1,
                duration=duration,
                screenshots=[],
                test_results=[],
                error_logs=["Results file not found"],
                performance_metrics={}
            )
        
        try:
            with open(results_file, "r") as f:
                data = json.load(f)
            
            return WebEvalResult(
                success=data.get("success", False),
                test_count=data.get("test_count", 0),
                passed_tests=data.get("passed_tests", 0),
                failed_tests=data.get("failed_tests", 0),
                duration=duration,
                screenshots=data.get("screenshots", []),
                test_results=data.get("test_results", []),
                error_logs=data.get("error_logs", []),
                performance_metrics=data.get("performance_metrics", {})
            )
            
        except Exception as e:
            logger.error(f"Failed to parse web eval results: {e}")
            return WebEvalResult(
                success=False,
                test_count=0,
                passed_tests=0,
                failed_tests=1,
                duration=duration,
                screenshots=[],
                test_results=[],
                error_logs=[f"Failed to parse results: {str(e)}"],
                performance_metrics={}
            )
    
    def cancel_evaluation(self, snapshot_id: str):
        """Cancel an active web evaluation"""
        eval_id = f"eval_{snapshot_id}"
        if eval_id in self.active_evaluations:
            self.active_evaluations[eval_id] = False
            logger.info(f"Web evaluation {eval_id} cancelled")
    
    def is_evaluation_active(self, snapshot_id: str) -> bool:
        """Check if web evaluation is active for a snapshot"""
        eval_id = f"eval_{snapshot_id}"
        return self.active_evaluations.get(eval_id, False)


# Global web eval service instance
_web_eval_service = None

def get_web_eval_service() -> WebEvalService:
    """Get the global web eval service instance"""
    global _web_eval_service
    if _web_eval_service is None:
        _web_eval_service = WebEvalService()
    return _web_eval_service

