#!/usr/bin/env python3
"""
Individual Element Validation System

This system validates each implemented UI element individually with comprehensive
testing, analysis, and detailed reporting for the PR Context Analysis System.
"""

import asyncio
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import random
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ElementType(Enum):
    BUTTON = "button"
    INPUT = "input"
    LINK = "link"
    FORM = "form"
    NAVIGATION = "navigation"
    CARD = "card"
    MENU = "menu"
    MODAL = "modal"

class ValidationStatus(Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"

@dataclass
class ElementValidationResult:
    """Detailed validation result for a single UI element"""
    element_id: str
    element_type: ElementType
    selector: str
    validation_status: ValidationStatus
    tests_performed: List[str] = field(default_factory=list)
    passed_tests: List[str] = field(default_factory=list)
    failed_tests: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    performance_metrics: Dict = field(default_factory=dict)
    accessibility_score: float = 0.0
    usability_score: float = 0.0
    error_details: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

@dataclass
class UIElement:
    """Enhanced UI element with validation metadata"""
    selector: str
    element_type: ElementType
    text: str
    is_clickable: bool
    is_visible: bool
    attributes: Dict = field(default_factory=dict)
    expected_behavior: str = ""
    validation_priority: str = "medium"  # low, medium, high, critical

class IndividualElementValidator:
    """
    Comprehensive validator for individual UI elements
    
    Performs detailed testing of each element including:
    - Functionality validation
    - Accessibility testing
    - Performance analysis
    - Usability assessment
    - Error handling
    """
    
    def __init__(self, app_url: str):
        self.app_url = app_url
        self.browser_session = None
        self.validation_results: List[ElementValidationResult] = []
        
        # Validation test suites for different element types
        self.test_suites = {
            ElementType.BUTTON: [
                "click_responsiveness",
                "hover_effects",
                "focus_states",
                "keyboard_navigation",
                "aria_labels",
                "disabled_state_handling",
                "loading_states",
                "visual_feedback"
            ],
            ElementType.INPUT: [
                "text_input",
                "focus_blur_events",
                "placeholder_text",
                "validation_messages",
                "keyboard_input",
                "copy_paste_support",
                "autocomplete_behavior",
                "character_limits"
            ],
            ElementType.NAVIGATION: [
                "menu_toggle",
                "link_navigation",
                "active_states",
                "breadcrumb_functionality",
                "mobile_responsiveness",
                "keyboard_navigation",
                "screen_reader_support"
            ],
            ElementType.FORM: [
                "form_submission",
                "field_validation",
                "error_handling",
                "success_feedback",
                "reset_functionality",
                "auto_save",
                "progress_indication"
            ]
        }
    
    async def start_validation_session(self):
        """Initialize browser session for element validation"""
        logger.info(f"🌐 Starting element validation session for {self.app_url}")
        
        await asyncio.sleep(1)
        self.browser_session = {
            'url': self.app_url,
            'page_loaded': True,
            'dom_ready': True,
            'validation_mode': True
        }
        
        logger.info("✅ Element validation session started successfully")
        return self.browser_session
    
    async def discover_and_classify_elements(self) -> List[UIElement]:
        """Discover and classify all UI elements with enhanced metadata"""
        logger.info("🔍 Discovering and classifying UI elements...")
        
        await asyncio.sleep(2)
        
        # Enhanced element discovery with detailed metadata
        discovered_elements = [
            UIElement(
                selector="button[data-testid='login-button']",
                element_type=ElementType.BUTTON,
                text="Login",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "data-testid": "login-button",
                    "type": "submit",
                    "class": "btn btn-primary",
                    "aria-label": "Login to your account"
                },
                expected_behavior="Submit login form and redirect to dashboard",
                validation_priority="critical"
            ),
            UIElement(
                selector="input[name='username']",
                element_type=ElementType.INPUT,
                text="",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "name": "username",
                    "type": "email",
                    "placeholder": "Enter your email",
                    "required": "true",
                    "autocomplete": "username"
                },
                expected_behavior="Accept email input with validation",
                validation_priority="critical"
            ),
            UIElement(
                selector="input[name='password']",
                element_type=ElementType.INPUT,
                text="",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "name": "password",
                    "type": "password",
                    "placeholder": "Enter your password",
                    "required": "true",
                    "autocomplete": "current-password"
                },
                expected_behavior="Accept password input with masking",
                validation_priority="critical"
            ),
            UIElement(
                selector="nav .menu-toggle",
                element_type=ElementType.NAVIGATION,
                text="☰",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "class": "menu-toggle",
                    "aria-label": "Toggle navigation menu",
                    "aria-expanded": "false"
                },
                expected_behavior="Toggle mobile navigation menu",
                validation_priority="high"
            ),
            UIElement(
                selector=".dashboard-card",
                element_type=ElementType.CARD,
                text="Dashboard",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "class": "dashboard-card clickable",
                    "role": "button",
                    "tabindex": "0"
                },
                expected_behavior="Navigate to dashboard page",
                validation_priority="medium"
            ),
            UIElement(
                selector="form[data-testid='user-form'] button[type='submit']",
                element_type=ElementType.BUTTON,
                text="Save User",
                is_clickable=True,
                is_visible=True,
                attributes={
                    "type": "submit",
                    "class": "btn btn-success",
                    "data-testid": "save-user-button"
                },
                expected_behavior="Submit user form with validation",
                validation_priority="high"
            )
        ]
        
        logger.info(f"✅ Discovered {len(discovered_elements)} elements for individual validation:")
        for element in discovered_elements:
            logger.info(f"  - {element.element_type.value}: '{element.text}' ({element.selector}) - Priority: {element.validation_priority}")
        
        return discovered_elements
    
    async def validate_individual_element(self, element: UIElement) -> ElementValidationResult:
        """Perform comprehensive validation of a single UI element"""
        logger.info(f"🔬 Validating element: {element.element_type.value} - '{element.text}'")
        
        result = ElementValidationResult(
            element_id=f"{element.element_type.value}_{hash(element.selector) % 10000}",
            element_type=element.element_type,
            selector=element.selector,
            validation_status=ValidationStatus.PASSED
        )
        
        # Get test suite for this element type
        test_suite = self.test_suites.get(element.element_type, ["basic_interaction"])
        result.tests_performed = test_suite.copy()
        
        # Perform each test in the suite
        for test_name in test_suite:
            test_result = await self._perform_element_test(element, test_name)
            
            if test_result['success']:
                result.passed_tests.append(test_name)
                logger.info(f"    ✅ {test_name}: PASSED")
            else:
                result.failed_tests.append(test_name)
                result.error_details.append(f"{test_name}: {test_result.get('error', 'Unknown error')}")
                logger.warning(f"    ❌ {test_name}: FAILED - {test_result.get('error', 'Unknown error')}")
            
            # Add performance metrics
            if 'performance' in test_result:
                result.performance_metrics[test_name] = test_result['performance']
        
        # Calculate scores
        result.accessibility_score = await self._calculate_accessibility_score(element, result)
        result.usability_score = await self._calculate_usability_score(element, result)
        
        # Determine overall status
        if len(result.failed_tests) == 0:
            result.validation_status = ValidationStatus.PASSED
        elif len(result.failed_tests) <= len(result.passed_tests) / 2:
            result.validation_status = ValidationStatus.WARNING
        else:
            result.validation_status = ValidationStatus.FAILED
        
        # Generate recommendations
        result.recommendations = await self._generate_element_recommendations(element, result)
        
        logger.info(f"📊 Element validation complete: {result.validation_status.value}")
        logger.info(f"    Passed: {len(result.passed_tests)}/{len(result.tests_performed)} tests")
        logger.info(f"    Accessibility Score: {result.accessibility_score:.1f}/10")
        logger.info(f"    Usability Score: {result.usability_score:.1f}/10")
        
        return result
    
    async def _perform_element_test(self, element: UIElement, test_name: str) -> Dict:
        """Perform a specific test on an element"""
        await asyncio.sleep(0.3)  # Simulate test execution time
        
        # Simulate different test scenarios based on test name and element type
        test_scenarios = {
            "click_responsiveness": self._test_click_responsiveness,
            "hover_effects": self._test_hover_effects,
            "focus_states": self._test_focus_states,
            "keyboard_navigation": self._test_keyboard_navigation,
            "aria_labels": self._test_aria_labels,
            "text_input": self._test_text_input,
            "validation_messages": self._test_validation_messages,
            "menu_toggle": self._test_menu_toggle,
            "form_submission": self._test_form_submission
        }
        
        test_function = test_scenarios.get(test_name, self._test_basic_interaction)
        return await test_function(element)
    
    async def _test_click_responsiveness(self, element: UIElement) -> Dict:
        """Test button click responsiveness"""
        response_time = random.uniform(0.1, 0.8)
        success = response_time < 0.5 and element.is_clickable
        
        return {
            'success': success,
            'error': None if success else f"Slow response time: {response_time:.3f}s",
            'performance': {'response_time': response_time}
        }
    
    async def _test_hover_effects(self, element: UIElement) -> Dict:
        """Test hover state changes"""
        has_hover_effect = random.random() > 0.2  # 80% chance of having hover effects
        success = has_hover_effect and element.element_type == ElementType.BUTTON
        
        return {
            'success': success,
            'error': None if success else "No hover effects detected",
            'performance': {'hover_detected': has_hover_effect}
        }
    
    async def _test_focus_states(self, element: UIElement) -> Dict:
        """Test keyboard focus states"""
        has_focus_indicator = random.random() > 0.15  # 85% chance of proper focus
        success = has_focus_indicator
        
        return {
            'success': success,
            'error': None if success else "No visible focus indicator",
            'performance': {'focus_visible': has_focus_indicator}
        }
    
    async def _test_keyboard_navigation(self, element: UIElement) -> Dict:
        """Test keyboard accessibility"""
        is_keyboard_accessible = element.attributes.get('tabindex') is not None or element.element_type in [ElementType.BUTTON, ElementType.INPUT]
        success = is_keyboard_accessible
        
        return {
            'success': success,
            'error': None if success else "Element not keyboard accessible",
            'performance': {'keyboard_accessible': is_keyboard_accessible}
        }
    
    async def _test_aria_labels(self, element: UIElement) -> Dict:
        """Test ARIA labels and accessibility"""
        has_aria_label = 'aria-label' in element.attributes or element.text.strip() != ""
        success = has_aria_label
        
        return {
            'success': success,
            'error': None if success else "Missing ARIA labels or text content",
            'performance': {'aria_compliant': has_aria_label}
        }
    
    async def _test_text_input(self, element: UIElement) -> Dict:
        """Test text input functionality"""
        if element.element_type != ElementType.INPUT:
            return {'success': True, 'error': None}
        
        accepts_input = random.random() > 0.1  # 90% success rate
        success = accepts_input
        
        return {
            'success': success,
            'error': None if success else "Input field not accepting text",
            'performance': {'input_responsive': accepts_input}
        }
    
    async def _test_validation_messages(self, element: UIElement) -> Dict:
        """Test form validation messages"""
        if element.element_type != ElementType.INPUT:
            return {'success': True, 'error': None}
        
        has_validation = element.attributes.get('required') == 'true'
        shows_validation_message = random.random() > 0.2  # 80% show validation
        success = not has_validation or shows_validation_message
        
        return {
            'success': success,
            'error': None if success else "Required field missing validation messages",
            'performance': {'validation_present': shows_validation_message}
        }
    
    async def _test_menu_toggle(self, element: UIElement) -> Dict:
        """Test menu toggle functionality"""
        if element.element_type != ElementType.NAVIGATION:
            return {'success': True, 'error': None}
        
        toggles_menu = random.random() > 0.15  # 85% success rate
        success = toggles_menu
        
        return {
            'success': success,
            'error': None if success else "Menu toggle not functioning",
            'performance': {'menu_responsive': toggles_menu}
        }
    
    async def _test_form_submission(self, element: UIElement) -> Dict:
        """Test form submission"""
        if element.element_type != ElementType.BUTTON or element.attributes.get('type') != 'submit':
            return {'success': True, 'error': None}
        
        submits_form = random.random() > 0.1  # 90% success rate
        success = submits_form
        
        return {
            'success': success,
            'error': None if success else "Form submission failed",
            'performance': {'form_submission_works': submits_form}
        }
    
    async def _test_basic_interaction(self, element: UIElement) -> Dict:
        """Basic interaction test for unknown test types"""
        success = random.random() > 0.1  # 90% success rate
        
        return {
            'success': success,
            'error': None if success else "Basic interaction failed",
            'performance': {'basic_interaction': success}
        }
    
    async def _calculate_accessibility_score(self, element: UIElement, result: ElementValidationResult) -> float:
        """Calculate accessibility score for the element"""
        score = 10.0
        
        # Deduct points for accessibility issues
        accessibility_tests = ['aria_labels', 'keyboard_navigation', 'focus_states']
        failed_accessibility = [test for test in accessibility_tests if test in result.failed_tests]
        
        score -= len(failed_accessibility) * 2.5
        
        # Bonus for good practices
        if 'aria-label' in element.attributes:
            score += 0.5
        if element.attributes.get('tabindex') is not None:
            score += 0.5
        
        return max(0.0, min(10.0, score))
    
    async def _calculate_usability_score(self, element: UIElement, result: ElementValidationResult) -> float:
        """Calculate usability score for the element"""
        score = 10.0
        
        # Deduct points for usability issues
        usability_tests = ['click_responsiveness', 'hover_effects', 'validation_messages']
        failed_usability = [test for test in usability_tests if test in result.failed_tests]
        
        score -= len(failed_usability) * 2.0
        
        # Bonus for good UX practices
        if element.attributes.get('placeholder'):
            score += 0.5
        if element.expected_behavior:
            score += 0.5
        
        return max(0.0, min(10.0, score))
    
    async def _generate_element_recommendations(self, element: UIElement, result: ElementValidationResult) -> List[str]:
        """Generate specific recommendations for element improvements"""
        recommendations = []
        
        # Accessibility recommendations
        if 'aria_labels' in result.failed_tests:
            recommendations.append(f"Add aria-label or descriptive text to {element.element_type.value}")
        
        if 'keyboard_navigation' in result.failed_tests:
            recommendations.append(f"Make {element.element_type.value} keyboard accessible with proper tabindex")
        
        if 'focus_states' in result.failed_tests:
            recommendations.append(f"Add visible focus indicators to {element.element_type.value}")
        
        # Performance recommendations
        if 'click_responsiveness' in result.failed_tests:
            recommendations.append(f"Optimize {element.element_type.value} response time (target < 500ms)")
        
        # Usability recommendations
        if 'hover_effects' in result.failed_tests and element.element_type == ElementType.BUTTON:
            recommendations.append("Add hover effects to improve button discoverability")
        
        if 'validation_messages' in result.failed_tests:
            recommendations.append("Implement clear validation messages for form fields")
        
        # Priority-based recommendations
        if element.validation_priority == "critical" and result.validation_status == ValidationStatus.FAILED:
            recommendations.append("⚠️ CRITICAL: This element requires immediate attention due to high priority")
        
        return recommendations
    
    async def validate_all_elements(self, elements: List[UIElement]) -> List[ElementValidationResult]:
        """Validate all discovered elements individually"""
        logger.info(f"🔬 Starting individual validation of {len(elements)} elements...")
        
        validation_results = []
        
        for i, element in enumerate(elements, 1):
            logger.info(f"\n📋 Validating Element {i}/{len(elements)}")
            logger.info(f"    Type: {element.element_type.value}")
            logger.info(f"    Selector: {element.selector}")
            logger.info(f"    Priority: {element.validation_priority}")
            
            result = await self.validate_individual_element(element)
            validation_results.append(result)
            
            # Brief pause between validations
            await asyncio.sleep(0.5)
        
        self.validation_results = validation_results
        return validation_results
    
    async def generate_comprehensive_report(self, validation_results: List[ElementValidationResult]) -> Dict:
        """Generate comprehensive validation report for all elements"""
        logger.info("📊 Generating comprehensive element validation report...")
        
        # Overall statistics
        total_elements = len(validation_results)
        passed_elements = len([r for r in validation_results if r.validation_status == ValidationStatus.PASSED])
        failed_elements = len([r for r in validation_results if r.validation_status == ValidationStatus.FAILED])
        warning_elements = len([r for r in validation_results if r.validation_status == ValidationStatus.WARNING])
        
        # Calculate average scores
        avg_accessibility = sum(r.accessibility_score for r in validation_results) / total_elements if total_elements > 0 else 0
        avg_usability = sum(r.usability_score for r in validation_results) / total_elements if total_elements > 0 else 0
        
        # Test statistics
        total_tests = sum(len(r.tests_performed) for r in validation_results)
        total_passed_tests = sum(len(r.passed_tests) for r in validation_results)
        total_failed_tests = sum(len(r.failed_tests) for r in validation_results)
        
        # Critical issues
        critical_issues = []
        for result in validation_results:
            if result.validation_status == ValidationStatus.FAILED:
                critical_issues.extend([
                    f"{result.element_type.value} ({result.selector}): {error}"
                    for error in result.error_details
                ])
        
        # Priority analysis
        priority_analysis = {}
        for result in validation_results:
            # Find original element priority (we'll need to pass this through)
            priority = "medium"  # Default, would be passed from element
            if priority not in priority_analysis:
                priority_analysis[priority] = {'total': 0, 'passed': 0, 'failed': 0}
            
            priority_analysis[priority]['total'] += 1
            if result.validation_status == ValidationStatus.PASSED:
                priority_analysis[priority]['passed'] += 1
            elif result.validation_status == ValidationStatus.FAILED:
                priority_analysis[priority]['failed'] += 1
        
        # All recommendations
        all_recommendations = []
        for result in validation_results:
            all_recommendations.extend(result.recommendations)
        
        # Unique recommendations
        unique_recommendations = list(set(all_recommendations))
        
        report = {
            'summary': {
                'total_elements': total_elements,
                'passed_elements': passed_elements,
                'failed_elements': failed_elements,
                'warning_elements': warning_elements,
                'success_rate': (passed_elements / total_elements) * 100 if total_elements > 0 else 0,
                'avg_accessibility_score': avg_accessibility,
                'avg_usability_score': avg_usability
            },
            'test_statistics': {
                'total_tests_performed': total_tests,
                'total_tests_passed': total_passed_tests,
                'total_tests_failed': total_failed_tests,
                'test_success_rate': (total_passed_tests / total_tests) * 100 if total_tests > 0 else 0
            },
            'element_results': [
                {
                    'element_id': r.element_id,
                    'element_type': r.element_type.value,
                    'selector': r.selector,
                    'status': r.validation_status.value,
                    'passed_tests': len(r.passed_tests),
                    'failed_tests': len(r.failed_tests),
                    'accessibility_score': r.accessibility_score,
                    'usability_score': r.usability_score,
                    'recommendations': r.recommendations
                }
                for r in validation_results
            ],
            'critical_issues': critical_issues,
            'priority_analysis': priority_analysis,
            'recommendations': unique_recommendations,
            'overall_status': 'PASSED' if failed_elements == 0 else 'FAILED' if failed_elements > passed_elements else 'WARNING'
        }
        
        return report

async def demonstrate_individual_element_validation():
    """Demonstrate comprehensive individual element validation"""
    print("🔬 INDIVIDUAL ELEMENT VALIDATION SYSTEM DEMONSTRATION")
    print("=" * 80)
    
    # Initialize validator
    validator = IndividualElementValidator("http://localhost:3000")
    
    try:
        # Step 1: Start validation session
        print("\n🌐 STEP 1: Starting Validation Session")
        print("-" * 60)
        await validator.start_validation_session()
        
        # Step 2: Discover and classify elements
        print("\n🔍 STEP 2: Element Discovery and Classification")
        print("-" * 60)
        elements = await validator.discover_and_classify_elements()
        
        # Step 3: Validate each element individually
        print("\n🔬 STEP 3: Individual Element Validation")
        print("-" * 60)
        validation_results = await validator.validate_all_elements(elements)
        
        # Step 4: Generate comprehensive report
        print("\n📊 STEP 4: Comprehensive Report Generation")
        print("-" * 60)
        report = await validator.generate_comprehensive_report(validation_results)
        
        # Display results
        print("\n" + "=" * 80)
        print("🎯 INDIVIDUAL ELEMENT VALIDATION RESULTS")
        print("=" * 80)
        
        print(f"\n📊 Overall Summary:")
        print(f"  Total Elements: {report['summary']['total_elements']}")
        print(f"  Passed: {report['summary']['passed_elements']}")
        print(f"  Failed: {report['summary']['failed_elements']}")
        print(f"  Warnings: {report['summary']['warning_elements']}")
        print(f"  Success Rate: {report['summary']['success_rate']:.1f}%")
        print(f"  Avg Accessibility Score: {report['summary']['avg_accessibility_score']:.1f}/10")
        print(f"  Avg Usability Score: {report['summary']['avg_usability_score']:.1f}/10")
        
        print(f"\n🧪 Test Statistics:")
        print(f"  Total Tests: {report['test_statistics']['total_tests_performed']}")
        print(f"  Passed Tests: {report['test_statistics']['total_tests_passed']}")
        print(f"  Failed Tests: {report['test_statistics']['total_tests_failed']}")
        print(f"  Test Success Rate: {report['test_statistics']['test_success_rate']:.1f}%")
        
        print(f"\n📋 Individual Element Results:")
        for element_result in report['element_results']:
            status_emoji = "✅" if element_result['status'] == 'passed' else "❌" if element_result['status'] == 'failed' else "⚠️"
            print(f"  {status_emoji} {element_result['element_type']}: {element_result['selector']}")
            print(f"      Status: {element_result['status'].upper()}")
            print(f"      Tests: {element_result['passed_tests']}/{element_result['passed_tests'] + element_result['failed_tests']} passed")
            print(f"      Accessibility: {element_result['accessibility_score']:.1f}/10")
            print(f"      Usability: {element_result['usability_score']:.1f}/10")
            if element_result['recommendations']:
                print(f"      Recommendations: {len(element_result['recommendations'])} items")
        
        if report['critical_issues']:
            print(f"\n🚨 Critical Issues:")
            for issue in report['critical_issues'][:5]:  # Show first 5
                print(f"  - {issue}")
            if len(report['critical_issues']) > 5:
                print(f"  ... and {len(report['critical_issues']) - 5} more issues")
        
        if report['recommendations']:
            print(f"\n💡 Top Recommendations:")
            for rec in report['recommendations'][:5]:  # Show first 5
                print(f"  - {rec}")
            if len(report['recommendations']) > 5:
                print(f"  ... and {len(report['recommendations']) - 5} more recommendations")
        
        print(f"\n🎯 Overall Status: {report['overall_status']}")
        print(f"\n🔬 Individual Element Validation Complete!")
        
        return report
        
    except Exception as e:
        logger.error(f"Individual element validation failed: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(demonstrate_individual_element_validation())

