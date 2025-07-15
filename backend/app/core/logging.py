"""
CodegenApp Logging Configuration
Structured logging with JSON format and multiple handlers
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Dict, Any

import structlog
from app.config.settings import LoggingSettings


def setup_logging(config: LoggingSettings) -> None:
    """Setup structured logging configuration"""
    
    # Create logs directory if it doesn't exist
    log_path = Path(config.file_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if config.format == "json" else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging.basicConfig(
        level=getattr(logging, config.level.upper()),
        format="%(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.handlers.RotatingFileHandler(
                config.file_path,
                maxBytes=_parse_size(config.max_size),
                backupCount=config.backup_count,
                encoding="utf-8"
            )
        ]
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)


def _parse_size(size_str: str) -> int:
    """Parse size string like '100MB' to bytes"""
    size_str = size_str.upper()
    if size_str.endswith("KB"):
        return int(size_str[:-2]) * 1024
    elif size_str.endswith("MB"):
        return int(size_str[:-2]) * 1024 * 1024
    elif size_str.endswith("GB"):
        return int(size_str[:-2]) * 1024 * 1024 * 1024
    else:
        return int(size_str)


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


class LoggerMixin:
    """Mixin class to add logging capabilities to any class"""
    
    @property
    def logger(self) -> structlog.BoundLogger:
        """Get logger instance for this class"""
        return get_logger(self.__class__.__name__)


def log_function_call(func_name: str, args: Dict[str, Any] = None, kwargs: Dict[str, Any] = None):
    """Decorator to log function calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            logger.info(
                "Function called",
                function=func_name,
                args=args if args else {},
                kwargs=kwargs if kwargs else {}
            )
            try:
                result = func(*args, **kwargs)
                logger.info("Function completed successfully", function=func_name)
                return result
            except Exception as e:
                logger.error(
                    "Function failed",
                    function=func_name,
                    error=str(e),
                    error_type=type(e).__name__
                )
                raise
        return wrapper
    return decorator


async def log_async_function_call(func_name: str, args: Dict[str, Any] = None, kwargs: Dict[str, Any] = None):
    """Decorator to log async function calls"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            logger.info(
                "Async function called",
                function=func_name,
                args=args if args else {},
                kwargs=kwargs if kwargs else {}
            )
            try:
                result = await func(*args, **kwargs)
                logger.info("Async function completed successfully", function=func_name)
                return result
            except Exception as e:
                logger.error(
                    "Async function failed",
                    function=func_name,
                    error=str(e),
                    error_type=type(e).__name__
                )
                raise
        return wrapper
    return decorator

