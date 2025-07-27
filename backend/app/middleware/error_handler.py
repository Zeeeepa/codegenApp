"""
Centralized error handling middleware for the Agent Run Manager.
Provides consistent error responses, logging, and monitoring integration.
"""

import logging
import traceback
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


class ErrorType:
    """Error type constants"""
    VALIDATION_ERROR = "validation_error"
    AUTHENTICATION_ERROR = "authentication_error"
    AUTHORIZATION_ERROR = "authorization_error"
    NOT_FOUND_ERROR = "not_found_error"
    CONFLICT_ERROR = "conflict_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    DATABASE_ERROR = "database_error"
    INTERNAL_ERROR = "internal_error"


class APIError(Exception):
    """Custom API error with structured information"""
    
    def __init__(self, 
                 message: str,
                 error_type: str = ErrorType.INTERNAL_ERROR,
                 status_code: int = 500,
                 details: Optional[Dict[str, Any]] = None,
                 error_code: Optional[str] = None):
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.details = details or {}
        self.error_code = error_code or error_type
        self.error_id = str(uuid.uuid4())
        self.timestamp = datetime.utcnow().isoformat()
        super().__init__(message)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for handling errors and exceptions"""
    
    def __init__(self, app, enable_debug: bool = False):
        super().__init__(app)
        self.enable_debug = enable_debug
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and handle any errors"""
        try:
            response = await call_next(request)
            return response
            
        except APIError as e:
            return await self._handle_api_error(request, e)
            
        except HTTPException as e:
            return await self._handle_http_exception(request, e)
            
        except Exception as e:
            return await self._handle_unexpected_error(request, e)
    
    async def _handle_api_error(self, request: Request, error: APIError) -> JSONResponse:
        """Handle custom API errors"""
        logger.error(
            f"API Error [{error.error_id}]: {error.message}",
            extra={
                "error_id": error.error_id,
                "error_type": error.error_type,
                "error_code": error.error_code,
                "status_code": error.status_code,
                "details": error.details,
                "path": str(request.url),
                "method": request.method,
            }
        )
        
        response_data = {
            "error": {
                "message": error.message,
                "type": error.error_type,
                "code": error.error_code,
                "error_id": error.error_id,
                "timestamp": error.timestamp,
            }
        }
        
        # Include details in development mode or for specific error types
        if self.enable_debug or error.error_type == ErrorType.VALIDATION_ERROR:
            response_data["error"]["details"] = error.details
        
        return JSONResponse(
            status_code=error.status_code,
            content=response_data
        )
    
    async def _handle_http_exception(self, request: Request, error: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        error_id = str(uuid.uuid4())
        
        logger.warning(
            f"HTTP Exception [{error_id}]: {error.detail}",
            extra={
                "error_id": error_id,
                "status_code": error.status_code,
                "path": str(request.url),
                "method": request.method,
            }
        )
        
        response_data = {
            "error": {
                "message": error.detail,
                "type": self._get_error_type_from_status(error.status_code),
                "code": f"http_{error.status_code}",
                "error_id": error_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
        }
        
        return JSONResponse(
            status_code=error.status_code,
            content=response_data
        )
    
    async def _handle_unexpected_error(self, request: Request, error: Exception) -> JSONResponse:
        """Handle unexpected errors"""
        error_id = str(uuid.uuid4())
        
        logger.error(
            f"Unexpected Error [{error_id}]: {str(error)}",
            extra={
                "error_id": error_id,
                "error_type": type(error).__name__,
                "path": str(request.url),
                "method": request.method,
                "traceback": traceback.format_exc(),
            }
        )
        
        response_data = {
            "error": {
                "message": "An unexpected error occurred",
                "type": ErrorType.INTERNAL_ERROR,
                "code": "internal_error",
                "error_id": error_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
        }
        
        # Include error details in debug mode
        if self.enable_debug:
            response_data["error"]["details"] = {
                "exception_type": type(error).__name__,
                "exception_message": str(error),
                "traceback": traceback.format_exc().split('\n'),
            }
        
        return JSONResponse(
            status_code=500,
            content=response_data
        )
    
    def _get_error_type_from_status(self, status_code: int) -> str:
        """Map HTTP status codes to error types"""
        mapping = {
            400: ErrorType.VALIDATION_ERROR,
            401: ErrorType.AUTHENTICATION_ERROR,
            403: ErrorType.AUTHORIZATION_ERROR,
            404: ErrorType.NOT_FOUND_ERROR,
            409: ErrorType.CONFLICT_ERROR,
            429: ErrorType.RATE_LIMIT_ERROR,
            500: ErrorType.INTERNAL_ERROR,
            502: ErrorType.EXTERNAL_SERVICE_ERROR,
            503: ErrorType.EXTERNAL_SERVICE_ERROR,
            504: ErrorType.EXTERNAL_SERVICE_ERROR,
        }
        return mapping.get(status_code, ErrorType.INTERNAL_ERROR)


# Convenience functions for raising common errors
def raise_validation_error(message: str, details: Optional[Dict[str, Any]] = None):
    """Raise a validation error"""
    raise APIError(
        message=message,
        error_type=ErrorType.VALIDATION_ERROR,
        status_code=400,
        details=details,
        error_code="validation_failed"
    )


def raise_not_found_error(resource: str, identifier: str):
    """Raise a not found error"""
    raise APIError(
        message=f"{resource} not found",
        error_type=ErrorType.NOT_FOUND_ERROR,
        status_code=404,
        details={"resource": resource, "identifier": identifier},
        error_code="resource_not_found"
    )


def raise_authentication_error(message: str = "Authentication required"):
    """Raise an authentication error"""
    raise APIError(
        message=message,
        error_type=ErrorType.AUTHENTICATION_ERROR,
        status_code=401,
        error_code="authentication_required"
    )


def raise_authorization_error(message: str = "Insufficient permissions"):
    """Raise an authorization error"""
    raise APIError(
        message=message,
        error_type=ErrorType.AUTHORIZATION_ERROR,
        status_code=403,
        error_code="insufficient_permissions"
    )


def raise_conflict_error(message: str, details: Optional[Dict[str, Any]] = None):
    """Raise a conflict error"""
    raise APIError(
        message=message,
        error_type=ErrorType.CONFLICT_ERROR,
        status_code=409,
        details=details,
        error_code="resource_conflict"
    )


def raise_rate_limit_error(message: str = "Rate limit exceeded"):
    """Raise a rate limit error"""
    raise APIError(
        message=message,
        error_type=ErrorType.RATE_LIMIT_ERROR,
        status_code=429,
        error_code="rate_limit_exceeded"
    )


def raise_external_service_error(service: str, message: str):
    """Raise an external service error"""
    raise APIError(
        message=f"External service error: {message}",
        error_type=ErrorType.EXTERNAL_SERVICE_ERROR,
        status_code=502,
        details={"service": service},
        error_code="external_service_error"
    )


def raise_database_error(message: str, details: Optional[Dict[str, Any]] = None):
    """Raise a database error"""
    raise APIError(
        message=f"Database error: {message}",
        error_type=ErrorType.DATABASE_ERROR,
        status_code=500,
        details=details,
        error_code="database_error"
    )
