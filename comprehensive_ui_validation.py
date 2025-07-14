#!/usr/bin/env python3
"""
Comprehensive UI Validation System

Combines UI flow testing with individual element validation to provide
complete coverage of UI functionality and quality in the PR Context Analysis System.
"""

import asyncio
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
import json

# Import our validation systems
from ui_flow_explanation import WebEvalAgentUITester
from element_validation_system import IndividualElementValidator, ElementValidationResult, UIElement, ElementType

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ComprehensiveValidationResult:
    """Complete validation result combining flow and element testing"""
    app_url: str
    total_elements: int
    flow_testing_results: Dict
    element_validation_results: List[ElementValidationResult]
    overall_status: str
    success_rate: float
    accessibility_score: float
    usability_score: float
    performance_metrics: Dict
    critical_issues: List[str]
    recommendations: List[str]
    validation_summary: Dict

class ComprehensiveUIValidator:
    """
    Master UI validation system that combines:
    1. User flow testing (login, navigation, forms)
    2. Individual element validation (accessibility, usability, performance)
    3. Comprehensive reporting and recommendations
    """
    
    def __init__(self, app_url: str):
        self.app_url = app_url
        self.flow_tester = WebEvalAgentUITester(app_url)
        self.element_validator = IndividualElementValidator(app_url)
        
        logger.info(f"🎯 Comprehensive UI Validator initialized for {app_url}")
    
    async def run_complete_validation(self) -> ComprehensiveValidationResult:
        """
        Run complete UI validation including both flow testing and element validation
        """
        logger.info("🚀 Starting comprehensive UI validation...")
        
        try:
            # Phase 1: Initialize both validation systems
            logger.info("\n📋 PHASE 1: Initialization")
            logger.info("-" * 50)
            
            await self.flow_tester.start_browser_session()
            await self.element_validator.start_validation_session()
            
            # Phase 2: Element discovery (shared between both systems)
            logger.info("\n📋 PHASE 2: Element Discovery")
            logger.info("-" * 50)
            
            flow_elements = await self.flow_tester.discover_ui_elements()
            validation_elements = await self.element_validator.discover_and_classify_elements()
            
            logger.info(f"✅ Discovered {len(flow_elements)} elements for flow testing")
            logger.info(f"✅ Discovered {len(validation_elements)} elements for individual validation")
            
            # Phase 3: User flow testing
            logger.info("\n📋 PHASE 3: User Flow Testing")
            logger.info("-" * 50)
            
            flow_results = await self.flow_tester.test_button_clicking_flow()
            
            # Phase 4: Individual element validation
            logger.info("\n📋 PHASE 4: Individual Element Validation")
            logger.info("-" * 50)
            
            element_results = await self.element_validator.validate_all_elements(validation_elements)
            
            # Phase 5: Generate comprehensive report
            logger.info("\n📋 PHASE 5: Comprehensive Analysis")
            logger.info("-" * 50)
            
            comprehensive_result = await self._generate_comprehensive_result(
                flow_results, element_results, validation_elements
            )
            
            logger.info("✅ Comprehensive UI validation completed successfully")
            return comprehensive_result
            
        except Exception as e:
            logger.error(f"Comprehensive validation failed: {e}")
            raise
    
    async def _generate_comprehensive_result(
        self, 
        flow_results: Dict, 
        element_results: List[ElementValidationResult],
        elements: List[UIElement]
    ) -> ComprehensiveValidationResult:
        """Generate comprehensive validation result"""
        
        # Calculate overall metrics
        total_elements = len(element_results)
        
        # Flow testing metrics
        flow_success_rate = (flow_results['successful_interactions'] / flow_results['total_interactions']) * 100 if flow_results['total_interactions'] > 0 else 0
        
        # Element validation metrics
        passed_elements = len([r for r in element_results if r.validation_status.value == 'passed'])
        element_success_rate = (passed_elements / total_elements) * 100 if total_elements > 0 else 0
        
        # Combined success rate (weighted average)
        overall_success_rate = (flow_success_rate * 0.6 + element_success_rate * 0.4)
        
        # Accessibility and usability scores
        avg_accessibility = sum(r.accessibility_score for r in element_results) / total_elements if total_elements > 0 else 0
        avg_usability = sum(r.usability_score for r in element_results) / total_elements if total_elements > 0 else 0
        
        # Performance metrics
        flow_response_times = [i['response_time'] for i in flow_results['interaction_details'] if 'response_time' in i]
        avg_flow_response_time = sum(flow_response_times) / len(flow_response_times) if flow_response_times else 0
        
        performance_metrics = {
            'avg_flow_response_time': avg_flow_response_time,
            'total_interactions': flow_results['total_interactions'],
            'failed_interactions': flow_results['failed_interactions'],
            'element_test_success_rate': sum(len(r.passed_tests) for r in element_results) / sum(len(r.tests_performed) for r in element_results) * 100 if element_results else 0
        }
        
        # Critical issues
        critical_issues = []
        
        # Add flow-related critical issues
        for flow in flow_results['user_flows_tested']:
            if not flow['overall_success'] and 'login' in flow['flow_name'].lower():
                critical_issues.append(f"CRITICAL: {flow['flow_name']} failed - authentication may be broken")
            elif not flow['overall_success'] and 'form' in flow['flow_name'].lower():
                critical_issues.append(f"HIGH: {flow['flow_name']} failed - data submission issues")
        
        # Add element-related critical issues
        for result in element_results:
            if result.validation_status.value == 'failed':
                # Find original element to get priority
                element = next((e for e in elements if e.selector == result.selector), None)
                if element and element.validation_priority == 'critical':
                    critical_issues.append(f"CRITICAL: {result.element_type.value} ({result.selector}) validation failed")
                else:
                    critical_issues.append(f"HIGH: {result.element_type.value} ({result.selector}) validation failed")
        
        # Comprehensive recommendations
        recommendations = []
        
        # Flow-based recommendations
        if flow_success_rate < 95:
            recommendations.append(f"Improve user flow reliability - current success rate: {flow_success_rate:.1f}%")
        
        if avg_flow_response_time > 0.5:
            recommendations.append(f"Optimize interaction response times - current average: {avg_flow_response_time:.3f}s")
        
        # Element-based recommendations
        failed_elements = [r for r in element_results if r.validation_status.value == 'failed']
        if failed_elements:
            recommendations.append(f"Fix {len(failed_elements)} failed element validations")
        
        if avg_accessibility < 9.0:
            recommendations.append(f"Improve accessibility - current score: {avg_accessibility:.1f}/10")
        
        if avg_usability < 9.0:
            recommendations.append(f"Enhance usability - current score: {avg_usability:.1f}/10")
        
        # Add specific element recommendations
        for result in element_results:
            recommendations.extend(result.recommendations)
        
        # Remove duplicates
        recommendations = list(set(recommendations))
        
        # Determine overall status
        if overall_success_rate >= 95 and len(critical_issues) == 0:
            overall_status = "PASSED"
        elif overall_success_rate >= 80 and len([i for i in critical_issues if 'CRITICAL' in i]) == 0:
            overall_status = "WARNING"
        else:
            overall_status = "FAILED"
        
        # Validation summary
        validation_summary = {
            'flow_testing': {
                'total_flows': len(flow_results['user_flows_tested']),
                'passed_flows': len([f for f in flow_results['user_flows_tested'] if f['overall_success']]),
                'failed_flows': len([f for f in flow_results['user_flows_tested'] if not f['overall_success']]),
                'success_rate': flow_success_rate
            },
            'element_validation': {
                'total_elements': total_elements,
                'passed_elements': passed_elements,
                'failed_elements': len([r for r in element_results if r.validation_status.value == 'failed']),
                'warning_elements': len([r for r in element_results if r.validation_status.value == 'warning']),
                'success_rate': element_success_rate
            },
            'quality_scores': {
                'accessibility': avg_accessibility,
                'usability': avg_usability,
                'performance': 10 - (avg_flow_response_time * 10) if avg_flow_response_time < 1 else 0
            }
        }
        
        return ComprehensiveValidationResult(
            app_url=self.app_url,
            total_elements=total_elements,
            flow_testing_results=flow_results,
            element_validation_results=element_results,
            overall_status=overall_status,
            success_rate=overall_success_rate,
            accessibility_score=avg_accessibility,
            usability_score=avg_usability,
            performance_metrics=performance_metrics,
            critical_issues=critical_issues,
            recommendations=recommendations[:10],  # Top 10 recommendations
            validation_summary=validation_summary
        )
    
    async def generate_detailed_report(self, result: ComprehensiveValidationResult) -> Dict:
        """Generate detailed validation report for PR comments and documentation"""
        
        report = {
            'validation_metadata': {
                'app_url': result.app_url,
                'validation_timestamp': asyncio.get_event_loop().time(),
                'total_elements_tested': result.total_elements,
                'validation_type': 'comprehensive_ui_validation'
            },
            'executive_summary': {
                'overall_status': result.overall_status,
                'success_rate': result.success_rate,
                'accessibility_score': result.accessibility_score,
                'usability_score': result.usability_score,
                'critical_issues_count': len(result.critical_issues),
                'recommendations_count': len(result.recommendations)
            },
            'flow_testing_details': {
                'summary': result.validation_summary['flow_testing'],
                'flow_results': [
                    {
                        'flow_name': flow['flow_name'],
                        'status': 'PASSED' if flow['overall_success'] else 'FAILED',
                        'interactions': f"{flow['successful_interactions']}/{flow['interactions_count']}",
                        'success_rate': (flow['successful_interactions'] / flow['interactions_count']) * 100 if flow['interactions_count'] > 0 else 0
                    }
                    for flow in result.flow_testing_results['user_flows_tested']
                ]
            },
            'element_validation_details': {
                'summary': result.validation_summary['element_validation'],
                'element_results': [
                    {
                        'element_type': r.element_type.value,
                        'selector': r.selector,
                        'status': r.validation_status.value,
                        'test_results': f"{len(r.passed_tests)}/{len(r.tests_performed)}",
                        'accessibility_score': r.accessibility_score,
                        'usability_score': r.usability_score,
                        'has_recommendations': len(r.recommendations) > 0
                    }
                    for r in result.element_validation_results
                ]
            },
            'quality_assessment': {
                'accessibility': {
                    'score': result.accessibility_score,
                    'grade': self._get_grade(result.accessibility_score),
                    'issues': [r.selector for r in result.element_validation_results if r.accessibility_score < 8.0]
                },
                'usability': {
                    'score': result.usability_score,
                    'grade': self._get_grade(result.usability_score),
                    'issues': [r.selector for r in result.element_validation_results if r.usability_score < 8.0]
                },
                'performance': {
                    'avg_response_time': result.performance_metrics['avg_flow_response_time'],
                    'grade': self._get_performance_grade(result.performance_metrics['avg_flow_response_time']),
                    'slow_interactions': result.performance_metrics['failed_interactions']
                }
            },
            'critical_issues': result.critical_issues,
            'recommendations': result.recommendations,
            'next_steps': self._generate_next_steps(result)
        }
        
        return report
    
    def _get_grade(self, score: float) -> str:
        """Convert numeric score to letter grade"""
        if score >= 9.5:
            return "A+"
        elif score >= 9.0:
            return "A"
        elif score >= 8.5:
            return "B+"
        elif score >= 8.0:
            return "B"
        elif score >= 7.0:
            return "C"
        elif score >= 6.0:
            return "D"
        else:
            return "F"
    
    def _get_performance_grade(self, response_time: float) -> str:
        """Convert response time to performance grade"""
        if response_time <= 0.2:
            return "A+"
        elif response_time <= 0.3:
            return "A"
        elif response_time <= 0.5:
            return "B"
        elif response_time <= 0.8:
            return "C"
        elif response_time <= 1.0:
            return "D"
        else:
            return "F"
    
    def _generate_next_steps(self, result: ComprehensiveValidationResult) -> List[str]:
        """Generate actionable next steps based on validation results"""
        next_steps = []
        
        if result.overall_status == "FAILED":
            next_steps.append("🚨 IMMEDIATE ACTION REQUIRED: Address critical validation failures before merging")
            
            # Prioritize critical issues
            critical_count = len([i for i in result.critical_issues if 'CRITICAL' in i])
            if critical_count > 0:
                next_steps.append(f"1. Fix {critical_count} critical issues that may break core functionality")
        
        if result.success_rate < 80:
            next_steps.append("2. Improve overall UI reliability - success rate below acceptable threshold")
        
        if result.accessibility_score < 8.0:
            next_steps.append("3. Address accessibility issues to ensure compliance with WCAG guidelines")
        
        if result.performance_metrics['avg_flow_response_time'] > 0.5:
            next_steps.append("4. Optimize UI performance - response times are slower than recommended")
        
        if len(result.recommendations) > 0:
            next_steps.append(f"5. Review and implement {len(result.recommendations)} specific recommendations")
        
        if result.overall_status == "PASSED":
            next_steps.append("✅ All validations passed! UI is ready for production deployment")
        
        return next_steps

async def demonstrate_comprehensive_validation():
    """Demonstrate the complete comprehensive UI validation system"""
    print("🎯 COMPREHENSIVE UI VALIDATION SYSTEM DEMONSTRATION")
    print("=" * 90)
    
    # Initialize comprehensive validator
    validator = ComprehensiveUIValidator("http://localhost:3000")
    
    try:
        # Run complete validation
        result = await validator.run_complete_validation()
        
        # Generate detailed report
        detailed_report = await validator.generate_detailed_report(result)
        
        # Display comprehensive results
        print("\n" + "=" * 90)
        print("🏆 COMPREHENSIVE UI VALIDATION RESULTS")
        print("=" * 90)
        
        print(f"\n📊 Executive Summary:")
        print(f"  Overall Status: {result.overall_status}")
        print(f"  Success Rate: {result.success_rate:.1f}%")
        print(f"  Accessibility Score: {result.accessibility_score:.1f}/10 ({detailed_report['quality_assessment']['accessibility']['grade']})")
        print(f"  Usability Score: {result.usability_score:.1f}/10 ({detailed_report['quality_assessment']['usability']['grade']})")
        print(f"  Performance Grade: {detailed_report['quality_assessment']['performance']['grade']}")
        print(f"  Critical Issues: {len(result.critical_issues)}")
        
        print(f"\n🔄 Flow Testing Results:")
        for flow_result in detailed_report['flow_testing_details']['flow_results']:
            status_emoji = "✅" if flow_result['status'] == 'PASSED' else "❌"
            print(f"  {status_emoji} {flow_result['flow_name']}: {flow_result['interactions']} interactions ({flow_result['success_rate']:.1f}%)")
        
        print(f"\n🔬 Element Validation Results:")
        for element_result in detailed_report['element_validation_details']['element_results']:
            status_emoji = "✅" if element_result['status'] == 'passed' else "❌" if element_result['status'] == 'failed' else "⚠️"
            print(f"  {status_emoji} {element_result['element_type']}: {element_result['test_results']} tests passed")
            print(f"      Accessibility: {element_result['accessibility_score']:.1f}/10, Usability: {element_result['usability_score']:.1f}/10")
        
        print(f"\n📈 Quality Assessment:")
        print(f"  Accessibility: {detailed_report['quality_assessment']['accessibility']['grade']} ({result.accessibility_score:.1f}/10)")
        print(f"  Usability: {detailed_report['quality_assessment']['usability']['grade']} ({result.usability_score:.1f}/10)")
        print(f"  Performance: {detailed_report['quality_assessment']['performance']['grade']} ({result.performance_metrics['avg_flow_response_time']:.3f}s avg)")
        
        if result.critical_issues:
            print(f"\n🚨 Critical Issues:")
            for issue in result.critical_issues[:5]:
                print(f"  - {issue}")
            if len(result.critical_issues) > 5:
                print(f"  ... and {len(result.critical_issues) - 5} more issues")
        
        if result.recommendations:
            print(f"\n💡 Top Recommendations:")
            for rec in result.recommendations[:5]:
                print(f"  - {rec}")
            if len(result.recommendations) > 5:
                print(f"  ... and {len(result.recommendations) - 5} more recommendations")
        
        print(f"\n📋 Next Steps:")
        for step in detailed_report['next_steps']:
            print(f"  {step}")
        
        print(f"\n🎯 Comprehensive UI Validation Complete!")
        print(f"   Status: {result.overall_status}")
        print(f"   Overall Score: {result.success_rate:.1f}%")
        
        return result, detailed_report
        
    except Exception as e:
        logger.error(f"Comprehensive validation demonstration failed: {e}")
        return None, None

if __name__ == "__main__":
    asyncio.run(demonstrate_comprehensive_validation())

