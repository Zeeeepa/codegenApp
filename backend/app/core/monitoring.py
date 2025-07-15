"""
CodegenApp Monitoring and Metrics
Prometheus metrics and health monitoring
"""

import time
from typing import Dict, Any
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import FastAPI, Response
from app.core.logging import get_logger

logger = get_logger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'codegenapp_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'codegenapp_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

VALIDATION_COUNT = Counter(
    'codegenapp_validations_total',
    'Total number of validations',
    ['project', 'status']
)

VALIDATION_DURATION = Histogram(
    'codegenapp_validation_duration_seconds',
    'Validation duration in seconds',
    ['project', 'stage']
)

ACTIVE_VALIDATIONS = Gauge(
    'codegenapp_active_validations',
    'Number of active validations',
    ['project']
)

DEPLOYMENT_COUNT = Counter(
    'codegenapp_deployments_total',
    'Total number of deployments',
    ['project', 'status']
)

AUTO_MERGE_COUNT = Counter(
    'codegenapp_auto_merges_total',
    'Total number of auto-merges',
    ['project', 'decision']
)

ERROR_COUNT = Counter(
    'codegenapp_errors_total',
    'Total number of errors',
    ['error_type', 'component']
)

SYSTEM_HEALTH = Gauge(
    'codegenapp_system_health',
    'System health status (1=healthy, 0=unhealthy)',
    ['component']
)


class MetricsCollector:
    """Metrics collection and management"""
    
    def __init__(self):
        self.start_time = time.time()
        self.health_status: Dict[str, bool] = {
            'codegen_api': True,
            'github_api': True,
            'gemini_api': True,
            'validation_pipeline': True,
            'web_eval_agent': True,
            'graph_sitter': True
        }
    
    def record_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    
    def record_validation_start(self, project: str):
        """Record validation start"""
        ACTIVE_VALIDATIONS.labels(project=project).inc()
        logger.info("Validation started", project=project)
    
    def record_validation_complete(self, project: str, status: str, duration: float, stage: str):
        """Record validation completion"""
        ACTIVE_VALIDATIONS.labels(project=project).dec()
        VALIDATION_COUNT.labels(project=project, status=status).inc()
        VALIDATION_DURATION.labels(project=project, stage=stage).observe(duration)
        logger.info("Validation completed", project=project, status=status, duration=duration)
    
    def record_deployment(self, project: str, status: str):
        """Record deployment attempt"""
        DEPLOYMENT_COUNT.labels(project=project, status=status).inc()
        logger.info("Deployment recorded", project=project, status=status)
    
    def record_auto_merge(self, project: str, decision: str):
        """Record auto-merge decision"""
        AUTO_MERGE_COUNT.labels(project=project, decision=decision).inc()
        logger.info("Auto-merge decision recorded", project=project, decision=decision)
    
    def record_error(self, error_type: str, component: str):
        """Record error occurrence"""
        ERROR_COUNT.labels(error_type=error_type, component=component).inc()
        logger.error("Error recorded", error_type=error_type, component=component)
    
    def update_health_status(self, component: str, healthy: bool):
        """Update component health status"""
        self.health_status[component] = healthy
        SYSTEM_HEALTH.labels(component=component).set(1 if healthy else 0)
        logger.info("Health status updated", component=component, healthy=healthy)
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall health summary"""
        overall_healthy = all(self.health_status.values())
        return {
            'overall_healthy': overall_healthy,
            'components': self.health_status,
            'uptime_seconds': time.time() - self.start_time
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


def setup_monitoring(app: FastAPI):
    """Setup monitoring endpoints and middleware"""
    
    @app.get("/metrics")
    async def get_metrics():
        """Prometheus metrics endpoint"""
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
    
    @app.get("/health/detailed")
    async def detailed_health():
        """Detailed health check with component status"""
        return metrics_collector.get_health_summary()
    
    @app.middleware("http")
    async def metrics_middleware(request, call_next):
        """Middleware to collect request metrics"""
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        metrics_collector.record_request(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            duration=duration
        )
        
        return response
    
    logger.info("Monitoring setup complete")


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance"""
    return metrics_collector


class MonitoringMixin:
    """Mixin class to add monitoring capabilities to any class"""
    
    @property
    def metrics(self) -> MetricsCollector:
        """Get metrics collector instance"""
        return metrics_collector

