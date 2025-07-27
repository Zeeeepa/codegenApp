"""
Monitoring and Metrics Collection for the Agent Run Manager.
Provides comprehensive application metrics, performance monitoring, and alerting.
"""

import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import asyncio
import psutil
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    """Individual metric data point"""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str]
    metric_type: str  # counter, gauge, histogram, summary


@dataclass
class SystemMetrics:
    """System resource metrics"""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    network_bytes_sent: int
    network_bytes_recv: int
    active_connections: int
    timestamp: datetime


@dataclass
class ApplicationMetrics:
    """Application-specific metrics"""
    active_agent_runs: int
    completed_agent_runs: int
    failed_agent_runs: int
    total_projects: int
    active_websocket_connections: int
    database_connections: int
    cache_hit_rate: float
    average_response_time_ms: float
    error_rate: float
    timestamp: datetime


class MetricsCollector:
    """Collects and stores application metrics"""
    
    def __init__(self, max_points: int = 10000):
        self.max_points = max_points
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_points))
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.response_times: deque = deque(maxlen=1000)
        self.error_count: int = 0
        self.request_count: int = 0
        self.start_time = datetime.utcnow()
        self._lock = threading.Lock()
    
    def increment_counter(self, name: str, value: float = 1.0, labels: Dict[str, str] = None):
        """Increment a counter metric"""
        with self._lock:
            key = self._make_key(name, labels)
            self.counters[key] += value
            self._add_metric_point(name, self.counters[key], labels, "counter")
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """Set a gauge metric value"""
        with self._lock:
            key = self._make_key(name, labels)
            self.gauges[key] = value
            self._add_metric_point(name, value, labels, "gauge")
    
    def observe_histogram(self, name: str, value: float, labels: Dict[str, str] = None):
        """Add an observation to a histogram metric"""
        with self._lock:
            key = self._make_key(name, labels)
            self.histograms[key].append(value)
            # Keep only last 1000 observations
            if len(self.histograms[key]) > 1000:
                self.histograms[key] = self.histograms[key][-1000:]
            self._add_metric_point(name, value, labels, "histogram")
    
    def record_response_time(self, duration_ms: float):
        """Record API response time"""
        self.response_times.append(duration_ms)
        self.observe_histogram("http_request_duration_ms", duration_ms)
    
    def record_request(self, success: bool = True):
        """Record API request"""
        self.request_count += 1
        if not success:
            self.error_count += 1
        
        self.increment_counter("http_requests_total", labels={"status": "success" if success else "error"})
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get current system metrics"""
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Disk
            disk = psutil.disk_usage('/')
            
            # Network
            network = psutil.net_io_counters()
            
            # Connections
            connections = len(psutil.net_connections())
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                memory_available_mb=memory.available / (1024 * 1024),
                disk_usage_percent=disk.percent,
                disk_free_gb=disk.free / (1024 * 1024 * 1024),
                network_bytes_sent=network.bytes_sent,
                network_bytes_recv=network.bytes_recv,
                active_connections=connections,
                timestamp=datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return None
    
    def get_application_metrics(self) -> ApplicationMetrics:
        """Get current application metrics"""
        try:
            # Calculate error rate
            error_rate = (self.error_count / max(self.request_count, 1)) * 100
            
            # Calculate average response time
            avg_response_time = sum(self.response_times) / max(len(self.response_times), 1)
            
            # Get current gauge values
            active_runs = self.gauges.get("active_agent_runs", 0)
            completed_runs = self.counters.get("completed_agent_runs", 0)
            failed_runs = self.counters.get("failed_agent_runs", 0)
            total_projects = self.gauges.get("total_projects", 0)
            websocket_connections = self.gauges.get("websocket_connections", 0)
            db_connections = self.gauges.get("database_connections", 0)
            cache_hit_rate = self.gauges.get("cache_hit_rate", 0)
            
            return ApplicationMetrics(
                active_agent_runs=int(active_runs),
                completed_agent_runs=int(completed_runs),
                failed_agent_runs=int(failed_runs),
                total_projects=int(total_projects),
                active_websocket_connections=int(websocket_connections),
                database_connections=int(db_connections),
                cache_hit_rate=cache_hit_rate,
                average_response_time_ms=avg_response_time,
                error_rate=error_rate,
                timestamp=datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"Failed to collect application metrics: {e}")
            return None
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary"""
        system_metrics = self.get_system_metrics()
        app_metrics = self.get_application_metrics()
        
        uptime = datetime.utcnow() - self.start_time
        
        return {
            "uptime_seconds": uptime.total_seconds(),
            "system": asdict(system_metrics) if system_metrics else None,
            "application": asdict(app_metrics) if app_metrics else None,
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "histogram_summaries": self._get_histogram_summaries(),
            "collection_time": datetime.utcnow().isoformat()
        }
    
    def _make_key(self, name: str, labels: Dict[str, str] = None) -> str:
        """Create a unique key for metric with labels"""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}[{label_str}]"
    
    def _add_metric_point(self, name: str, value: float, labels: Dict[str, str], metric_type: str):
        """Add a metric point to the time series"""
        point = MetricPoint(
            name=name,
            value=value,
            timestamp=datetime.utcnow(),
            labels=labels or {},
            metric_type=metric_type
        )
        self.metrics[name].append(point)
    
    def _get_histogram_summaries(self) -> Dict[str, Dict[str, float]]:
        """Get summary statistics for histograms"""
        summaries = {}
        for key, values in self.histograms.items():
            if values:
                sorted_values = sorted(values)
                n = len(sorted_values)
                summaries[key] = {
                    "count": n,
                    "sum": sum(sorted_values),
                    "min": sorted_values[0],
                    "max": sorted_values[-1],
                    "mean": sum(sorted_values) / n,
                    "p50": sorted_values[int(n * 0.5)],
                    "p90": sorted_values[int(n * 0.9)],
                    "p95": sorted_values[int(n * 0.95)],
                    "p99": sorted_values[int(n * 0.99)]
                }
        return summaries


class PerformanceMonitor:
    """Performance monitoring and alerting"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.alerts: List[Dict[str, Any]] = []
        self.alert_thresholds = {
            "cpu_percent": 80.0,
            "memory_percent": 85.0,
            "disk_usage_percent": 90.0,
            "error_rate": 5.0,
            "response_time_ms": 1000.0
        }
    
    @contextmanager
    def measure_time(self, operation_name: str, labels: Dict[str, str] = None):
        """Context manager to measure operation time"""
        start_time = time.time()
        try:
            yield
        finally:
            duration_ms = (time.time() - start_time) * 1000
            self.metrics.observe_histogram(f"{operation_name}_duration_ms", duration_ms, labels)
    
    def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for alert conditions"""
        alerts = []
        
        # Get current metrics
        system_metrics = self.metrics.get_system_metrics()
        app_metrics = self.metrics.get_application_metrics()
        
        if system_metrics:
            # CPU alert
            if system_metrics.cpu_percent > self.alert_thresholds["cpu_percent"]:
                alerts.append({
                    "type": "system",
                    "severity": "warning",
                    "metric": "cpu_percent",
                    "value": system_metrics.cpu_percent,
                    "threshold": self.alert_thresholds["cpu_percent"],
                    "message": f"High CPU usage: {system_metrics.cpu_percent:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Memory alert
            if system_metrics.memory_percent > self.alert_thresholds["memory_percent"]:
                alerts.append({
                    "type": "system",
                    "severity": "warning",
                    "metric": "memory_percent",
                    "value": system_metrics.memory_percent,
                    "threshold": self.alert_thresholds["memory_percent"],
                    "message": f"High memory usage: {system_metrics.memory_percent:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Disk alert
            if system_metrics.disk_usage_percent > self.alert_thresholds["disk_usage_percent"]:
                alerts.append({
                    "type": "system",
                    "severity": "critical",
                    "metric": "disk_usage_percent",
                    "value": system_metrics.disk_usage_percent,
                    "threshold": self.alert_thresholds["disk_usage_percent"],
                    "message": f"High disk usage: {system_metrics.disk_usage_percent:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        if app_metrics:
            # Error rate alert
            if app_metrics.error_rate > self.alert_thresholds["error_rate"]:
                alerts.append({
                    "type": "application",
                    "severity": "warning",
                    "metric": "error_rate",
                    "value": app_metrics.error_rate,
                    "threshold": self.alert_thresholds["error_rate"],
                    "message": f"High error rate: {app_metrics.error_rate:.1f}%",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Response time alert
            if app_metrics.average_response_time_ms > self.alert_thresholds["response_time_ms"]:
                alerts.append({
                    "type": "application",
                    "severity": "warning",
                    "metric": "response_time_ms",
                    "value": app_metrics.average_response_time_ms,
                    "threshold": self.alert_thresholds["response_time_ms"],
                    "message": f"High response time: {app_metrics.average_response_time_ms:.1f}ms",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        # Store alerts
        self.alerts.extend(alerts)
        
        # Keep only last 100 alerts
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]
        
        return alerts
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status"""
        alerts = self.check_alerts()
        
        # Determine overall status
        if any(alert["severity"] == "critical" for alert in alerts):
            status = "critical"
        elif any(alert["severity"] == "warning" for alert in alerts):
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "alerts": alerts,
            "alert_count": len(alerts),
            "timestamp": datetime.utcnow().isoformat()
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()
performance_monitor = PerformanceMonitor(metrics_collector)
