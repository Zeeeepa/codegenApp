"""
CodegenApp Custom Exceptions
Comprehensive exception handling for the CI/CD flow management system
"""

from typing import Optional, Dict, Any


class CodegenAppException(Exception):
    """Base exception for CodegenApp"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "CODEGENAPP_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


# ===== API INTEGRATION EXCEPTIONS =====

class CodegenAPIException(CodegenAppException):
    """Codegen API related exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="CODEGEN_API_ERROR",
            status_code=502,
            details=details
        )


class GitHubAPIException(CodegenAppException):
    """GitHub API related exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="GITHUB_API_ERROR",
            status_code=502,
            details=details
        )


class GeminiAPIException(CodegenAppException):
    """Gemini API related exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="GEMINI_API_ERROR",
            status_code=502,
            details=details
        )


# ===== VALIDATION PIPELINE EXCEPTIONS =====

class ValidationException(CodegenAppException):
    """Validation pipeline exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details
        )


class SnapshotException(CodegenAppException):
    """Snapshot management exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="SNAPSHOT_ERROR",
            status_code=500,
            details=details
        )


class DeploymentException(CodegenAppException):
    """Deployment execution exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="DEPLOYMENT_ERROR",
            status_code=500,
            details=details
        )


# ===== SERVICE INTEGRATION EXCEPTIONS =====

class WebEvalException(CodegenAppException):
    """Web-Eval-Agent exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="WEB_EVAL_ERROR",
            status_code=500,
            details=details
        )


class GraphSitterException(CodegenAppException):
    """Graph-Sitter integration exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="GRAPH_SITTER_ERROR",
            status_code=500,
            details=details
        )


class SandboxException(CodegenAppException):
    """Sandbox environment exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="SANDBOX_ERROR",
            status_code=500,
            details=details
        )


# ===== WORKFLOW EXCEPTIONS =====

class WorkflowException(CodegenAppException):
    """Workflow orchestration exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="WORKFLOW_ERROR",
            status_code=500,
            details=details
        )


class AutoMergeException(CodegenAppException):
    """Auto-merge decision exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTO_MERGE_ERROR",
            status_code=422,
            details=details
        )


# ===== CONFIGURATION EXCEPTIONS =====

class ConfigurationException(CodegenAppException):
    """Configuration related exceptions"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            status_code=500,
            details=details
        )


class ProjectNotFoundException(CodegenAppException):
    """Project not found exceptions"""
    
    def __init__(self, project_name: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Project '{project_name}' not found",
            error_code="PROJECT_NOT_FOUND",
            status_code=404,
            details=details
        )


# ===== TIMEOUT EXCEPTIONS =====

class TimeoutException(CodegenAppException):
    """Timeout related exceptions"""
    
    def __init__(self, operation: str, timeout: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Operation '{operation}' timed out after {timeout} seconds",
            error_code="TIMEOUT_ERROR",
            status_code=408,
            details=details
        )


class ValidationTimeoutException(TimeoutException):
    """Validation timeout exceptions"""
    
    def __init__(self, timeout: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            operation="validation",
            timeout=timeout,
            details=details
        )


class DeploymentTimeoutException(TimeoutException):
    """Deployment timeout exceptions"""
    
    def __init__(self, timeout: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            operation="deployment",
            timeout=timeout,
            details=details
        )


# ===== RETRY EXCEPTIONS =====

class RetryableException(CodegenAppException):
    """Base class for retryable exceptions"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "RETRYABLE_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(message, error_code, status_code, details)
        self.retry_after = retry_after


class RateLimitException(RetryableException):
    """Rate limit exceptions"""
    
    def __init__(self, service: str, retry_after: int = 60, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Rate limit exceeded for {service}",
            error_code="RATE_LIMIT_ERROR",
            status_code=429,
            details=details,
            retry_after=retry_after
        )


class ServiceUnavailableException(RetryableException):
    """Service unavailable exceptions"""
    
    def __init__(self, service: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Service '{service}' is currently unavailable",
            error_code="SERVICE_UNAVAILABLE",
            status_code=503,
            details=details,
            retry_after=30
        )


# ===== UTILITY FUNCTIONS =====

def handle_api_error(response, service_name: str):
    """Handle API response errors and raise appropriate exceptions"""
    if response.status_code == 401:
        raise CodegenAppException(
            message=f"Authentication failed for {service_name}",
            error_code="AUTHENTICATION_ERROR",
            status_code=401
        )
    elif response.status_code == 403:
        raise CodegenAppException(
            message=f"Access forbidden for {service_name}",
            error_code="AUTHORIZATION_ERROR",
            status_code=403
        )
    elif response.status_code == 404:
        raise CodegenAppException(
            message=f"Resource not found in {service_name}",
            error_code="RESOURCE_NOT_FOUND",
            status_code=404
        )
    elif response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 60))
        raise RateLimitException(service_name, retry_after)
    elif response.status_code >= 500:
        raise ServiceUnavailableException(service_name)
    else:
        raise CodegenAppException(
            message=f"API error from {service_name}: {response.text}",
            error_code="API_ERROR",
            status_code=response.status_code
        )

