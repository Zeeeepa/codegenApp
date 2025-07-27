"""
Health Check and Monitoring API Routes for the Agent Run Manager.
Provides system health, metrics, and monitoring endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging
from datetime import datetime

from app.monitoring.metrics import metrics_collector, performance_monitor
from app.database.connection import DatabaseManager
from app.api.v1.routes.auth import get_current_user, require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    try:
        # Check database connectivity
        db_manager = DatabaseManager()
        db_healthy = db_manager.health_check()
        
        # Get basic system info
        health_status = performance_monitor.get_health_status()
        
        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "database": "connected" if db_healthy else "disconnected",
            "uptime_seconds": (datetime.utcnow() - metrics_collector.start_time).total_seconds(),
            "overall_status": health_status["status"]
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/detailed")
async def detailed_health_check(
    current_user: Dict[str, Any] = Depends(require_permission("organizations:read"))
):
    """Detailed health check with comprehensive system information"""
    try:
        # Database health
        db_manager = DatabaseManager()
        db_healthy = db_manager.health_check()
        
        # System metrics
        system_metrics = metrics_collector.get_system_metrics()
        app_metrics = metrics_collector.get_application_metrics()
        
        # Performance status
        health_status = performance_monitor.get_health_status()
        
        # Component status
        components = {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "details": "PostgreSQL connection active" if db_healthy else "Database connection failed"
            },
            "websocket": {
                "status": "healthy",
                "active_connections": app_metrics.active_websocket_connections if app_metrics else 0
            },
            "github_integration": {
                "status": "healthy",
                "details": "GitHub webhook handler active"
            },
            "notification_service": {
                "status": "healthy",
                "details": "Real-time notification system operational"
            }
        }
        
        return {
            "status": health_status["status"],
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "uptime_seconds": (datetime.utcnow() - metrics_collector.start_time).total_seconds(),
            "system_metrics": system_metrics.__dict__ if system_metrics else None,
            "application_metrics": app_metrics.__dict__ if app_metrics else None,
            "components": components,
            "alerts": health_status["alerts"],
            "alert_count": health_status["alert_count"]
        }
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/metrics")
async def get_metrics(
    current_user: Dict[str, Any] = Depends(require_permission("organizations:read"))
):
    """Get comprehensive application metrics"""
    try:
        metrics_summary = metrics_collector.get_metrics_summary()
        return metrics_summary
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """Get metrics in Prometheus format"""
    try:
        # Get all metrics
        system_metrics = metrics_collector.get_system_metrics()
        app_metrics = metrics_collector.get_application_metrics()
        
        # Format as Prometheus metrics
        prometheus_output = []
        
        if system_metrics:
            prometheus_output.extend([
                f"# HELP system_cpu_percent CPU usage percentage",
                f"# TYPE system_cpu_percent gauge",
                f"system_cpu_percent {system_metrics.cpu_percent}",
                f"",
                f"# HELP system_memory_percent Memory usage percentage",
                f"# TYPE system_memory_percent gauge", 
                f"system_memory_percent {system_metrics.memory_percent}",
                f"",
                f"# HELP system_disk_usage_percent Disk usage percentage",
                f"# TYPE system_disk_usage_percent gauge",
                f"system_disk_usage_percent {system_metrics.disk_usage_percent}",
                f"",
                f"# HELP system_active_connections Active network connections",
                f"# TYPE system_active_connections gauge",
                f"system_active_connections {system_metrics.active_connections}",
                f""
            ])
        
        if app_metrics:
            prometheus_output.extend([
                f"# HELP app_active_agent_runs Active agent runs",
                f"# TYPE app_active_agent_runs gauge",
                f"app_active_agent_runs {app_metrics.active_agent_runs}",
                f"",
                f"# HELP app_completed_agent_runs_total Completed agent runs total",
                f"# TYPE app_completed_agent_runs_total counter",
                f"app_completed_agent_runs_total {app_metrics.completed_agent_runs}",
                f"",
                f"# HELP app_failed_agent_runs_total Failed agent runs total",
                f"# TYPE app_failed_agent_runs_total counter",
                f"app_failed_agent_runs_total {app_metrics.failed_agent_runs}",
                f"",
                f"# HELP app_total_projects Total projects",
                f"# TYPE app_total_projects gauge",
                f"app_total_projects {app_metrics.total_projects}",
                f"",
                f"# HELP app_websocket_connections Active WebSocket connections",
                f"# TYPE app_websocket_connections gauge",
                f"app_websocket_connections {app_metrics.active_websocket_connections}",
                f"",
                f"# HELP app_error_rate_percent Error rate percentage",
                f"# TYPE app_error_rate_percent gauge",
                f"app_error_rate_percent {app_metrics.error_rate}",
                f"",
                f"# HELP app_response_time_ms Average response time in milliseconds",
                f"# TYPE app_response_time_ms gauge",
                f"app_response_time_ms {app_metrics.average_response_time_ms}",
                f""
            ])
        
        # Add counters and gauges
        for key, value in metrics_collector.counters.items():
            metric_name = key.replace("[", "_").replace("]", "").replace("=", "_").replace(",", "_")
            prometheus_output.extend([
                f"# HELP {metric_name} Counter metric",
                f"# TYPE {metric_name} counter",
                f"{metric_name} {value}",
                f""
            ])
        
        for key, value in metrics_collector.gauges.items():
            metric_name = key.replace("[", "_").replace("]", "").replace("=", "_").replace(",", "_")
            prometheus_output.extend([
                f"# HELP {metric_name} Gauge metric",
                f"# TYPE {metric_name} gauge",
                f"{metric_name} {value}",
                f""
            ])
        
        return "\n".join(prometheus_output)
        
    except Exception as e:
        logger.error(f"Failed to generate Prometheus metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Prometheus metrics: {str(e)}"
        )


@router.get("/alerts")
async def get_alerts(
    current_user: Dict[str, Any] = Depends(require_permission("organizations:read"))
):
    """Get current system alerts"""
    try:
        alerts = performance_monitor.check_alerts()
        
        return {
            "alerts": alerts,
            "alert_count": len(alerts),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve alerts: {str(e)}"
        )


@router.get("/status")
async def get_system_status():
    """Get overall system status (public endpoint)"""
    try:
        health_status = performance_monitor.get_health_status()
        
        return {
            "status": health_status["status"],
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": (datetime.utcnow() - metrics_collector.start_time).total_seconds(),
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.post("/metrics/reset")
async def reset_metrics(
    current_user: Dict[str, Any] = Depends(require_permission("organizations:update"))
):
    """Reset application metrics (admin only)"""
    try:
        # Reset counters and metrics
        metrics_collector.counters.clear()
        metrics_collector.gauges.clear()
        metrics_collector.histograms.clear()
        metrics_collector.response_times.clear()
        metrics_collector.error_count = 0
        metrics_collector.request_count = 0
        metrics_collector.start_time = datetime.utcnow()
        
        # Clear alerts
        performance_monitor.alerts.clear()
        
        logger.info(f"Metrics reset by user {current_user['email']}")
        
        return {
            "message": "Metrics reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset metrics: {str(e)}"
        )
