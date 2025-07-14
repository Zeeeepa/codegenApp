"""
Workflow State Manager - Handles persistence and retrieval of workflow execution state
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod

from app.models.domain.workflow import WorkflowExecution, WorkflowStatus
from app.utils.exceptions import WorkflowExecutionError

logger = logging.getLogger(__name__)


class StateStorage(ABC):
    """Abstract base class for state storage backends"""
    
    @abstractmethod
    async def save_execution(self, execution: WorkflowExecution) -> bool:
        """Save workflow execution state"""
        pass
    
    @abstractmethod
    async def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID"""
        pass
    
    @abstractmethod
    async def list_executions(
        self, 
        organization_id: int,
        status: Optional[WorkflowStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WorkflowExecution]:
        """List workflow executions with filtering"""
        pass
    
    @abstractmethod
    async def delete_execution(self, execution_id: str) -> bool:
        """Delete workflow execution"""
        pass
    
    @abstractmethod
    async def cleanup_old_executions(self, older_than: datetime) -> int:
        """Cleanup old executions, return count of deleted executions"""
        pass


class InMemoryStateStorage(StateStorage):
    """In-memory state storage implementation"""
    
    def __init__(self):
        self._executions: Dict[str, WorkflowExecution] = {}
        self._lock = asyncio.Lock()
    
    async def save_execution(self, execution: WorkflowExecution) -> bool:
        """Save workflow execution state"""
        async with self._lock:
            # Convert to dict for JSON serialization, then back to ensure consistency
            execution_dict = execution.dict()
            self._executions[execution.id] = WorkflowExecution(**execution_dict)
            logger.debug(f"💾 Saved execution {execution.id} to memory")
            return True
    
    async def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID"""
        async with self._lock:
            execution = self._executions.get(execution_id)
            if execution:
                # Return a copy to prevent external modifications
                return WorkflowExecution(**execution.dict())
            return None
    
    async def list_executions(
        self, 
        organization_id: int,
        status: Optional[WorkflowStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WorkflowExecution]:
        """List workflow executions with filtering"""
        async with self._lock:
            executions = []
            
            for execution in self._executions.values():
                if execution.organization_id != organization_id:
                    continue
                
                if status and execution.status != status:
                    continue
                
                executions.append(WorkflowExecution(**execution.dict()))
            
            # Sort by start time (newest first)
            executions.sort(key=lambda x: x.started_at, reverse=True)
            
            # Apply pagination
            return executions[offset:offset + limit]
    
    async def delete_execution(self, execution_id: str) -> bool:
        """Delete workflow execution"""
        async with self._lock:
            if execution_id in self._executions:
                del self._executions[execution_id]
                logger.debug(f"🗑️ Deleted execution {execution_id} from memory")
                return True
            return False
    
    async def cleanup_old_executions(self, older_than: datetime) -> int:
        """Cleanup old executions, return count of deleted executions"""
        async with self._lock:
            to_delete = []
            
            for execution_id, execution in self._executions.items():
                if execution.started_at < older_than:
                    to_delete.append(execution_id)
            
            for execution_id in to_delete:
                del self._executions[execution_id]
            
            if to_delete:
                logger.info(f"🧹 Cleaned up {len(to_delete)} old executions from memory")
            
            return len(to_delete)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return {
            "total_executions": len(self._executions),
            "storage_type": "in_memory"
        }


class WorkflowStateManager:
    """Manages workflow execution state with pluggable storage backends"""
    
    def __init__(self, storage: StateStorage):
        self.storage = storage
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_interval = 3600  # 1 hour
        self._cleanup_older_than_days = 7  # Keep executions for 7 days
    
    async def start(self):
        """Start the state manager and background tasks"""
        logger.info("🚀 Starting workflow state manager")
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    async def stop(self):
        """Stop the state manager and background tasks"""
        logger.info("🛑 Stopping workflow state manager")
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
    
    async def save_execution(self, execution: WorkflowExecution) -> bool:
        """Save workflow execution state"""
        try:
            return await self.storage.save_execution(execution)
        except Exception as e:
            logger.error(f"❌ Failed to save execution {execution.id}: {e}")
            raise WorkflowExecutionError(f"Failed to save execution state: {e}")
    
    async def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID"""
        try:
            return await self.storage.get_execution(execution_id)
        except Exception as e:
            logger.error(f"❌ Failed to get execution {execution_id}: {e}")
            raise WorkflowExecutionError(f"Failed to get execution state: {e}")
    
    async def list_executions(
        self, 
        organization_id: int,
        status: Optional[WorkflowStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WorkflowExecution]:
        """List workflow executions with filtering"""
        try:
            return await self.storage.list_executions(
                organization_id, status, limit, offset
            )
        except Exception as e:
            logger.error(f"❌ Failed to list executions: {e}")
            raise WorkflowExecutionError(f"Failed to list executions: {e}")
    
    async def delete_execution(self, execution_id: str) -> bool:
        """Delete workflow execution"""
        try:
            return await self.storage.delete_execution(execution_id)
        except Exception as e:
            logger.error(f"❌ Failed to delete execution {execution_id}: {e}")
            raise WorkflowExecutionError(f"Failed to delete execution: {e}")
    
    async def get_execution_metrics(self, organization_id: int) -> Dict[str, Any]:
        """Get execution metrics for organization"""
        try:
            executions = await self.storage.list_executions(organization_id, limit=1000)
            
            total = len(executions)
            if total == 0:
                return {
                    "total_executions": 0,
                    "status_breakdown": {},
                    "success_rate": 0.0,
                    "average_duration": 0.0
                }
            
            # Status breakdown
            status_counts = {}
            durations = []
            
            for execution in executions:
                status = execution.status.value
                status_counts[status] = status_counts.get(status, 0) + 1
                
                if execution.completed_at and execution.started_at:
                    duration = (execution.completed_at - execution.started_at).total_seconds()
                    durations.append(duration)
            
            # Calculate success rate
            completed = status_counts.get(WorkflowStatus.COMPLETED.value, 0)
            success_rate = (completed / total) * 100 if total > 0 else 0.0
            
            # Calculate average duration
            avg_duration = sum(durations) / len(durations) if durations else 0.0
            
            return {
                "total_executions": total,
                "status_breakdown": status_counts,
                "success_rate": success_rate,
                "average_duration": avg_duration
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get execution metrics: {e}")
            raise WorkflowExecutionError(f"Failed to get execution metrics: {e}")
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of old executions"""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                
                cutoff_date = datetime.utcnow() - timedelta(days=self._cleanup_older_than_days)
                deleted_count = await self.storage.cleanup_old_executions(cutoff_date)
                
                if deleted_count > 0:
                    logger.info(f"🧹 Periodic cleanup removed {deleted_count} old executions")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error during periodic cleanup: {e}")


class StateManagerFactory:
    """Factory for creating state manager instances"""
    
    @staticmethod
    def create_in_memory_manager() -> WorkflowStateManager:
        """Create state manager with in-memory storage"""
        storage = InMemoryStateStorage()
        return WorkflowStateManager(storage)
    
    @staticmethod
    def create_database_manager(database_url: str) -> WorkflowStateManager:
        """Create state manager with database storage"""
        # TODO: Implement database storage backend
        raise NotImplementedError("Database storage not yet implemented")
    
    @staticmethod
    def create_redis_manager(redis_url: str) -> WorkflowStateManager:
        """Create state manager with Redis storage"""
        # TODO: Implement Redis storage backend
        raise NotImplementedError("Redis storage not yet implemented")
