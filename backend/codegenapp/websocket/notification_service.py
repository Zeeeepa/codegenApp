"""
Notification service for real-time updates.
Handles different types of notifications and message formatting.
"""

import logging
from typing import Dict, Any, Optional, List
from enum import Enum

from .connection_manager import ConnectionManager, WebSocketMessage

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Types of notifications"""
    AGENT_RUN_STARTED = "agent_run_started"
    AGENT_RUN_PROGRESS = "agent_run_progress"
    AGENT_RUN_COMPLETED = "agent_run_completed"
    AGENT_RUN_FAILED = "agent_run_failed"
    VALIDATION_STARTED = "validation_started"
    VALIDATION_COMPLETED = "validation_completed"
    VALIDATION_FAILED = "validation_failed"
    PROJECT_UPDATED = "project_updated"
    SYSTEM_ALERT = "system_alert"
    USER_MESSAGE = "user_message"


class NotificationService:
    """Service for handling real-time notifications"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
    
    async def notify_agent_run_started(self, 
                                     project_id: str, 
                                     run_id: str, 
                                     target_text: str,
                                     user_id: Optional[str] = None):
        """Notify that an agent run has started"""
        message = WebSocketMessage(
            type=NotificationType.AGENT_RUN_STARTED.value,
            data={
                "run_id": run_id,
                "project_id": project_id,
                "target_text": target_text,
                "status": "started"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        if user_id:
            await self.connection_manager.send_to_user(user_id, message)
        
        logger.info(f"Notified agent run started: {run_id}")
    
    async def notify_agent_run_progress(self, 
                                      project_id: str, 
                                      run_id: str, 
                                      progress: float,
                                      current_step: Optional[str] = None,
                                      user_id: Optional[str] = None):
        """Notify agent run progress update"""
        message = WebSocketMessage(
            type=NotificationType.AGENT_RUN_PROGRESS.value,
            data={
                "run_id": run_id,
                "project_id": project_id,
                "progress": progress,
                "current_step": current_step,
                "status": "running"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        if user_id:
            await self.connection_manager.send_to_user(user_id, message)
    
    async def notify_agent_run_completed(self, 
                                       project_id: str, 
                                       run_id: str, 
                                       result: Dict[str, Any],
                                       user_id: Optional[str] = None):
        """Notify that an agent run has completed"""
        message = WebSocketMessage(
            type=NotificationType.AGENT_RUN_COMPLETED.value,
            data={
                "run_id": run_id,
                "project_id": project_id,
                "result": result,
                "status": "completed"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        if user_id:
            await self.connection_manager.send_to_user(user_id, message)
        
        logger.info(f"Notified agent run completed: {run_id}")
    
    async def notify_agent_run_failed(self, 
                                    project_id: str, 
                                    run_id: str, 
                                    error: str,
                                    user_id: Optional[str] = None):
        """Notify that an agent run has failed"""
        message = WebSocketMessage(
            type=NotificationType.AGENT_RUN_FAILED.value,
            data={
                "run_id": run_id,
                "project_id": project_id,
                "error": error,
                "status": "failed"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        if user_id:
            await self.connection_manager.send_to_user(user_id, message)
        
        logger.error(f"Notified agent run failed: {run_id} - {error}")
    
    async def notify_validation_started(self, 
                                      project_id: str, 
                                      validation_id: str, 
                                      name: str,
                                      agent_run_id: Optional[str] = None):
        """Notify that validation has started"""
        message = WebSocketMessage(
            type=NotificationType.VALIDATION_STARTED.value,
            data={
                "validation_id": validation_id,
                "project_id": project_id,
                "agent_run_id": agent_run_id,
                "name": name,
                "status": "started"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        logger.info(f"Notified validation started: {validation_id}")
    
    async def notify_validation_completed(self, 
                                        project_id: str, 
                                        validation_id: str, 
                                        results: Dict[str, Any],
                                        success: bool = True):
        """Notify that validation has completed"""
        message = WebSocketMessage(
            type=NotificationType.VALIDATION_COMPLETED.value,
            data={
                "validation_id": validation_id,
                "project_id": project_id,
                "results": results,
                "success": success,
                "status": "completed"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        logger.info(f"Notified validation completed: {validation_id} (success: {success})")
    
    async def notify_validation_failed(self, 
                                     project_id: str, 
                                     validation_id: str, 
                                     error: str):
        """Notify that validation has failed"""
        message = WebSocketMessage(
            type=NotificationType.VALIDATION_FAILED.value,
            data={
                "validation_id": validation_id,
                "project_id": project_id,
                "error": error,
                "status": "failed"
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        logger.error(f"Notified validation failed: {validation_id} - {error}")
    
    async def notify_project_updated(self, 
                                   project_id: str, 
                                   changes: Dict[str, Any],
                                   user_id: Optional[str] = None):
        """Notify that a project has been updated"""
        message = WebSocketMessage(
            type=NotificationType.PROJECT_UPDATED.value,
            data={
                "project_id": project_id,
                "changes": changes,
                "updated_by": user_id
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        logger.info(f"Notified project updated: {project_id}")
    
    async def notify_system_alert(self, 
                                alert_type: str, 
                                message: str, 
                                severity: str = "info",
                                project_id: Optional[str] = None):
        """Send system-wide alert"""
        alert_message = WebSocketMessage(
            type=NotificationType.SYSTEM_ALERT.value,
            data={
                "alert_type": alert_type,
                "message": message,
                "severity": severity,
                "project_id": project_id
            }
        )
        
        if project_id:
            await self.connection_manager.broadcast_to_project(project_id, alert_message)
        else:
            await self.connection_manager.broadcast_to_all(alert_message)
        
        logger.warning(f"System alert ({severity}): {message}")
    
    async def send_user_message(self, 
                              user_id: str, 
                              message: str, 
                              message_type: str = "info",
                              data: Optional[Dict[str, Any]] = None):
        """Send direct message to a specific user"""
        user_message = WebSocketMessage(
            type=NotificationType.USER_MESSAGE.value,
            data={
                "message": message,
                "message_type": message_type,
                "data": data or {}
            }
        )
        
        await self.connection_manager.send_to_user(user_id, user_message)
        
        logger.info(f"Sent user message to {user_id}: {message}")
    
    async def notify_batch_updates(self, 
                                 project_id: str, 
                                 updates: List[Dict[str, Any]]):
        """Send batch updates for efficiency"""
        message = WebSocketMessage(
            type="batch_updates",
            data={
                "project_id": project_id,
                "updates": updates,
                "count": len(updates)
            }
        )
        
        await self.connection_manager.broadcast_to_project(project_id, message)
        
        logger.info(f"Sent batch updates to project {project_id}: {len(updates)} updates")
    
    def get_notification_stats(self) -> Dict[str, Any]:
        """Get notification service statistics"""
        connection_stats = self.connection_manager.get_connection_stats()
        
        return {
            "connection_manager": connection_stats,
            "service_status": "active"
        }
