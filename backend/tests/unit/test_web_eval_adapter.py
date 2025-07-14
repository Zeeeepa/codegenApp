"""
Unit tests for Web-Eval-Agent adapter
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import aiohttp

from app.services.adapters.web_eval_adapter import (
    WebEvalAdapter,
    PerformanceMetrics,
    AccessibilityViolation,
    AccessibilityReport,
    SEOReport,
    SecurityReport,
    Recommendation
)


@pytest.fixture
def web_eval_config():
    """Web-eval adapter configuration"""
    return {
        "default_timeout": 60,
        "max_concurrent_evaluations": 5,
        "evaluation_types": ["performance", "accessibility", "seo"],
        "device_types": ["desktop", "mobile"]
    }


@pytest.fixture
def web_eval_adapter(web_eval_config):
    """Web-eval adapter instance"""
    return WebEvalAdapter(web_eval_config)


@pytest.mark.asyncio
class TestWebEvalAdapter:
    """Test cases for Web-Eval-Agent adapter"""
    
    async def test_adapter_initialization(self, web_eval_adapter):
        """Test adapter initialization"""
        assert web_eval_adapter.default_timeout == 60
        assert web_eval_adapter.max_concurrent_evaluations == 5
        assert web_eval_adapter.evaluation_types == ["performance", "accessibility", "seo"]
        assert web_eval_adapter.device_types == ["desktop", "mobile"]
    
    async def test_health_check_mock_mode(self, web_eval_adapter):
        """Test health check in mock mode"""
        health_status = await web_eval_adapter.health_check()
        assert "degraded" in health_status
        assert "web-eval-agent library not available" in health_status
    
    async def test_evaluate_website_action(self, web_eval_adapter):
        """Test evaluate_website action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "evaluation_types": ["performance", "accessibility"],
                "device_types": ["desktop"]
            }
        }
        
        result = await web_eval_adapter.execute_action("evaluate_website", context)
        
        assert "evaluation_id" in result
        assert result["url"] == "https://example.com"
        assert "overall_score" in result
        assert "results" in result
        assert "recommendations" in result
        assert "evaluation_time" in result
    
    async def test_test_performance_action(self, web_eval_adapter):
        """Test test_performance action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "device_type": "desktop"
            }
        }
        
        result = await web_eval_adapter.execute_action("test_performance", context)
        
        assert result["url"] == "https://example.com"
        assert result["device_type"] == "desktop"
        assert "performance" in result
        assert "score" in result
    
    async def test_check_accessibility_action(self, web_eval_adapter):
        """Test check_accessibility action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "device_type": "mobile"
            }
        }
        
        result = await web_eval_adapter.execute_action("check_accessibility", context)
        
        assert result["url"] == "https://example.com"
        assert result["device_type"] == "mobile"
        assert "accessibility" in result
    
    async def test_validate_seo_action(self, web_eval_adapter):
        """Test validate_seo action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("validate_seo", context)
        
        assert result["url"] == "https://example.com"
        assert "seo" in result
    
    async def test_check_security_action(self, web_eval_adapter):
        """Test check_security action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("check_security", context)
        
        assert result["url"] == "https://example.com"
        assert "security" in result
    
    async def test_run_lighthouse_action(self, web_eval_adapter):
        """Test run_lighthouse action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "categories": ["performance", "accessibility"]
            }
        }
        
        result = await web_eval_adapter.execute_action("run_lighthouse", context)
        
        assert result["url"] == "https://example.com"
        assert "lighthouse_version" in result
        assert "categories" in result
    
    async def test_test_mobile_responsive_action(self, web_eval_adapter):
        """Test test_mobile_responsive action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "viewports": ["mobile", "tablet"]
            }
        }
        
        result = await web_eval_adapter.execute_action("test_mobile_responsive", context)
        
        assert result["url"] == "https://example.com"
        assert result["viewports_tested"] == ["mobile", "tablet"]
        assert "responsive" in result
    
    async def test_test_ui_components_action(self, web_eval_adapter):
        """Test test_ui_components action"""
        context = {
            "parameters": {
                "url": "https://example.com",
                "components": ["forms", "buttons"]
            }
        }
        
        result = await web_eval_adapter.execute_action("test_ui_components", context)
        
        assert result["url"] == "https://example.com"
        assert result["components_tested"] == ["forms", "buttons"]
        assert "results" in result
    
    async def test_analyze_user_experience_action(self, web_eval_adapter):
        """Test analyze_user_experience action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("analyze_user_experience", context)
        
        assert result["url"] == "https://example.com"
        assert "ux_score" in result
        assert "metrics" in result
    
    async def test_validate_forms_action(self, web_eval_adapter):
        """Test validate_forms action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("validate_forms", context)
        
        assert result["url"] == "https://example.com"
        assert "forms_found" in result
        assert "validation_results" in result
    
    async def test_test_navigation_action(self, web_eval_adapter):
        """Test test_navigation action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("test_navigation", context)
        
        assert result["url"] == "https://example.com"
        assert "navigation_score" in result
    
    async def test_check_broken_links_action(self, web_eval_adapter):
        """Test check_broken_links action"""
        context = {
            "parameters": {
                "url": "https://example.com"
            }
        }
        
        result = await web_eval_adapter.execute_action("check_broken_links", context)
        
        assert result["url"] == "https://example.com"
        assert "total_links" in result
        assert "broken_links" in result
    
    async def test_invalid_action(self, web_eval_adapter):
        """Test invalid action handling"""
        context = {"parameters": {}}
        
        with pytest.raises(Exception) as exc_info:
            await web_eval_adapter.execute_action("invalid_action", context)
        
        assert "Unknown action" in str(exc_info.value)
    
    async def test_missing_url_parameter(self, web_eval_adapter):
        """Test missing URL parameter"""
        context = {"parameters": {}}
        
        with pytest.raises(Exception) as exc_info:
            await web_eval_adapter.execute_action("evaluate_website", context)
        
        assert "url parameter required" in str(exc_info.value)
    
    async def test_invalid_url(self, web_eval_adapter):
        """Test invalid URL handling"""
        context = {
            "parameters": {
                "url": "not-a-valid-url"
            }
        }
        
        with pytest.raises(Exception) as exc_info:
            await web_eval_adapter.execute_action("evaluate_website", context)
        
        assert "Invalid URL" in str(exc_info.value)
    
    async def test_cleanup(self, web_eval_adapter):
        """Test adapter cleanup"""
        # Add some active evaluations
        web_eval_adapter.active_evaluations["test_eval"] = {
            "url": "https://example.com",
            "status": "running"
        }
        
        await web_eval_adapter.cleanup()
        
        assert len(web_eval_adapter.active_evaluations) == 0


class TestPerformanceMetrics:
    """Test cases for PerformanceMetrics class"""
    
    def test_performance_metrics_creation(self):
        """Test PerformanceMetrics creation"""
        metrics = PerformanceMetrics(
            load_time=2.5,
            first_contentful_paint=1.2,
            largest_contentful_paint=2.0,
            cumulative_layout_shift=0.1,
            first_input_delay=50.0,
            time_to_interactive=3.0
        )
        
        assert metrics.load_time == 2.5
        assert metrics.first_contentful_paint == 1.2
        assert metrics.largest_contentful_paint == 2.0
        assert metrics.cumulative_layout_shift == 0.1
        assert metrics.first_input_delay == 50.0
        assert metrics.time_to_interactive == 3.0
    
    def test_performance_metrics_to_dict(self):
        """Test PerformanceMetrics to_dict method"""
        metrics = PerformanceMetrics(
            load_time=1.5,
            first_contentful_paint=0.8,
            largest_contentful_paint=1.2,
            cumulative_layout_shift=0.05,
            first_input_delay=30.0
        )
        
        metrics_dict = metrics.to_dict()
        
        assert metrics_dict["load_time"] == 1.5
        assert metrics_dict["first_contentful_paint"] == 0.8
        assert metrics_dict["largest_contentful_paint"] == 1.2
        assert metrics_dict["cumulative_layout_shift"] == 0.05
        assert metrics_dict["first_input_delay"] == 30.0


class TestAccessibilityViolation:
    """Test cases for AccessibilityViolation class"""
    
    def test_accessibility_violation_creation(self):
        """Test AccessibilityViolation creation"""
        violation = AccessibilityViolation(
            rule_id="color-contrast",
            impact="serious",
            description="Elements must have sufficient color contrast",
            help_url="https://example.com/help",
            selector="button.primary",
            html="<button class='primary'>Submit</button>"
        )
        
        assert violation.rule_id == "color-contrast"
        assert violation.impact == "serious"
        assert violation.description == "Elements must have sufficient color contrast"
        assert violation.help_url == "https://example.com/help"
        assert violation.selector == "button.primary"
        assert violation.html == "<button class='primary'>Submit</button>"
    
    def test_accessibility_violation_to_dict(self):
        """Test AccessibilityViolation to_dict method"""
        violation = AccessibilityViolation(
            rule_id="missing-alt",
            impact="critical",
            description="Images must have alt text",
            help_url="https://example.com/alt-help",
            selector="img",
            html="<img src='test.jpg'>"
        )
        
        violation_dict = violation.to_dict()
        
        assert violation_dict["rule_id"] == "missing-alt"
        assert violation_dict["impact"] == "critical"
        assert violation_dict["description"] == "Images must have alt text"
        assert violation_dict["help_url"] == "https://example.com/alt-help"
        assert violation_dict["selector"] == "img"
        assert violation_dict["html"] == "<img src='test.jpg'>"


class TestAccessibilityReport:
    """Test cases for AccessibilityReport class"""
    
    def test_accessibility_report_creation(self):
        """Test AccessibilityReport creation"""
        violations = [
            AccessibilityViolation(
                rule_id="test-rule",
                impact="minor",
                description="Test violation",
                help_url="https://example.com",
                selector="div",
                html="<div></div>"
            )
        ]
        
        report = AccessibilityReport(
            score=85.0,
            violations=violations,
            passes=20,
            incomplete=2
        )
        
        assert report.score == 85.0
        assert len(report.violations) == 1
        assert report.passes == 20
        assert report.incomplete == 2
    
    def test_accessibility_report_to_dict(self):
        """Test AccessibilityReport to_dict method"""
        report = AccessibilityReport(
            score=90.0,
            violations=[],
            passes=25,
            incomplete=1
        )
        
        report_dict = report.to_dict()
        
        assert report_dict["score"] == 90.0
        assert report_dict["violations"] == []
        assert report_dict["passes"] == 25
        assert report_dict["incomplete"] == 1


class TestSEOReport:
    """Test cases for SEOReport class"""
    
    def test_seo_report_creation(self):
        """Test SEOReport creation"""
        report = SEOReport(
            score=75.0,
            title_present=True,
            meta_description_present=True,
            h1_present=True,
            alt_text_coverage=80.0,
            internal_links=10,
            external_links=5
        )
        
        assert report.score == 75.0
        assert report.title_present is True
        assert report.meta_description_present is True
        assert report.h1_present is True
        assert report.alt_text_coverage == 80.0
        assert report.internal_links == 10
        assert report.external_links == 5
    
    def test_seo_report_to_dict(self):
        """Test SEOReport to_dict method"""
        report = SEOReport(
            score=80.0,
            title_present=False,
            meta_description_present=True,
            h1_present=True,
            alt_text_coverage=90.0,
            internal_links=15,
            external_links=3
        )
        
        report_dict = report.to_dict()
        
        assert report_dict["score"] == 80.0
        assert report_dict["title_present"] is False
        assert report_dict["meta_description_present"] is True
        assert report_dict["h1_present"] is True
        assert report_dict["alt_text_coverage"] == 90.0
        assert report_dict["internal_links"] == 15
        assert report_dict["external_links"] == 3


class TestSecurityReport:
    """Test cases for SecurityReport class"""
    
    def test_security_report_creation(self):
        """Test SecurityReport creation"""
        security_headers = {
            "Content-Security-Policy": True,
            "X-Frame-Options": True,
            "Strict-Transport-Security": True
        }
        
        report = SecurityReport(
            score=85.0,
            https_enabled=True,
            mixed_content_issues=0,
            vulnerable_libraries=["jquery@1.0.0"],
            security_headers=security_headers
        )
        
        assert report.score == 85.0
        assert report.https_enabled is True
        assert report.mixed_content_issues == 0
        assert report.vulnerable_libraries == ["jquery@1.0.0"]
        assert report.security_headers == security_headers
    
    def test_security_report_to_dict(self):
        """Test SecurityReport to_dict method"""
        security_headers = {
            "Content-Security-Policy": False,
            "X-Frame-Options": True
        }
        
        report = SecurityReport(
            score=70.0,
            https_enabled=False,
            mixed_content_issues=2,
            vulnerable_libraries=[],
            security_headers=security_headers
        )
        
        report_dict = report.to_dict()
        
        assert report_dict["score"] == 70.0
        assert report_dict["https_enabled"] is False
        assert report_dict["mixed_content_issues"] == 2
        assert report_dict["vulnerable_libraries"] == []
        assert report_dict["security_headers"] == security_headers


class TestRecommendation:
    """Test cases for Recommendation class"""
    
    def test_recommendation_creation(self):
        """Test Recommendation creation"""
        recommendation = Recommendation(
            category="performance",
            priority="high",
            description="Optimize images",
            impact="high",
            effort="medium",
            implementation_guide="Use WebP format and compression"
        )
        
        assert recommendation.category == "performance"
        assert recommendation.priority == "high"
        assert recommendation.description == "Optimize images"
        assert recommendation.impact == "high"
        assert recommendation.effort == "medium"
        assert recommendation.implementation_guide == "Use WebP format and compression"
    
    def test_recommendation_to_dict(self):
        """Test Recommendation to_dict method"""
        recommendation = Recommendation(
            category="accessibility",
            priority="critical",
            description="Add alt text to images",
            impact="high",
            effort="low"
        )
        
        recommendation_dict = recommendation.to_dict()
        
        assert recommendation_dict["category"] == "accessibility"
        assert recommendation_dict["priority"] == "critical"
        assert recommendation_dict["description"] == "Add alt text to images"
        assert recommendation_dict["impact"] == "high"
        assert recommendation_dict["effort"] == "low"
        assert recommendation_dict["implementation_guide"] == ""
