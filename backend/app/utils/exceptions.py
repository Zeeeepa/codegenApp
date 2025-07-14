"""
Custom exceptions for the Strands-Agents backend
"""


class StrandsAgentsError(Exception):
    """Base exception for all Strands-Agents errors"""
    pass


class WorkflowExecutionError(StrandsAgentsError):
    """Raised when workflow execution fails"""
    pass


class StepExecutionError(StrandsAgentsError):
    """Raised when a workflow step fails"""
    pass


class ServiceNotFoundError(StrandsAgentsError):
    """Raised when a requested service adapter is not found"""
    pass


class ActionNotFoundError(StrandsAgentsError):
    """Raised when a requested action is not found in a service adapter"""
    pass


class ConfigurationError(StrandsAgentsError):
    """Raised when there's a configuration error"""
    pass


class AuthenticationError(StrandsAgentsError):
    """Raised when authentication fails"""
    pass


class ValidationError(StrandsAgentsError):
    """Raised when data validation fails"""
    pass
