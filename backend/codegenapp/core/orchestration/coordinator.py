"""
Service Coordinator - Routes workflow steps to appropriate service adapters
"""

import logging
from typing import Dict, Any, Protocol
from codegenapp.models.domain.workflow import WorkflowStep
from codegenapp.utils.exceptions import ServiceNotFoundError, ActionNotFoundError

logger = logging.getLogger(__name__)


class ServiceAdapter(Protocol):
    """Protocol for service adapters"""
    
    async def execute_action(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an action with given context"""
        ...
    
    async def health_check(self) -> str:
        """Check service health"""
        ...


class ServiceCoordinator:
    """Coordinates execution across multiple service adapters"""
    
    def __init__(self):
        self.adapters: Dict[str, ServiceAdapter] = {}
    
    def register_adapter(self, service_name: str, adapter: ServiceAdapter):
        """Register a service adapter"""
        self.adapters[service_name] = adapter
        logger.info(f"📝 Registered adapter for service: {service_name}")
    
    async def execute_step(self, step: WorkflowStep, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a workflow step through the appropriate service adapter"""
        adapter = self.adapters.get(step.service)
        if not adapter:
            raise ServiceNotFoundError(f"No adapter found for service: {step.service}")
        
        logger.info(f"🔄 Executing {step.service}.{step.action} for step {step.id}")
        
        try:
            result = await adapter.execute_action(step.action, context)
            logger.info(f"✅ Successfully executed step {step.id}")
            return result
        except Exception as e:
            logger.error(f"❌ Failed to execute step {step.id}: {e}")
            raise
    
    async def health_check_all(self) -> Dict[str, str]:
        """Check health of all registered adapters"""
        health_status = {}
        
        for service_name, adapter in self.adapters.items():
            try:
                status = await adapter.health_check()
                health_status[service_name] = status
            except Exception as e:
                health_status[service_name] = f"error: {str(e)}"
        
        return health_status
    
    def get_registered_services(self) -> list[str]:
        """Get list of registered service names"""
        return list(self.adapters.keys())
