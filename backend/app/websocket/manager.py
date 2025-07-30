"""
WebSocket Manager

This module manages WebSocket connections for real-time updates
and notifications to connected clients.
"""

import logging
import json
from typing import Dict, List, Any, Optional
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manager for WebSocket connections and real-time messaging"""
    
    def __init__(self):
        # Store active connections
        self.active_connections: List[WebSocket] = []
        
        # Store connections by project (for targeted messaging)
        self.project_connections: Dict[str, List[WebSocket]] = {}
        
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, project_name: Optional[str] = None) -> None:
        """
        Accept a new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            project_name: Optional project name for targeted messaging
        """
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            
            # Store connection metadata
            self.connection_metadata[websocket] = {
                "connected_at": datetime.utcnow().isoformat(),
                "project_name": project_name
            }
            
            # Add to project-specific connections if project specified
            if project_name:
                if project_name not in self.project_connections:
                    self.project_connections[project_name] = []
                self.project_connections[project_name].append(websocket)
            
            logger.info(f"WebSocket connected (project: {project_name}). Total connections: {len(self.active_connections)}")
            
            # Send welcome message
            await self.send_personal_message(websocket, {
                "type": "connection_established",
                "message": "WebSocket connection established",
                "project_name": project_name,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {e}")
    
    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection
        
        Args:
            websocket: WebSocket connection to remove
        """
        try:
            # Remove from active connections
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            # Remove from project connections
            metadata = self.connection_metadata.get(websocket, {})
            project_name = metadata.get("project_name")
            
            if project_name and project_name in self.project_connections:
                if websocket in self.project_connections[project_name]:
                    self.project_connections[project_name].remove(websocket)
                
                # Clean up empty project connection lists
                if not self.project_connections[project_name]:
                    del self.project_connections[project_name]
            
            # Remove metadata
            if websocket in self.connection_metadata:
                del self.connection_metadata[websocket]
            
            logger.info(f"WebSocket disconnected (project: {project_name}). Total connections: {len(self.active_connections)}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
    
    async def send_personal_message(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        """
        Send a message to a specific WebSocket connection
        
        Args:
            websocket: Target WebSocket connection
            message: Message to send
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            # Remove broken connection
            self.disconnect(websocket)
    
    async def broadcast_message(self, message: Dict[str, Any]) -> None:
        """
        Broadcast a message to all connected clients
        
        Args:
            message: Message to broadcast
        """
        if not self.active_connections:
            logger.debug("No active connections to broadcast to")
            return
        
        logger.info(f"Broadcasting message to {len(self.active_connections)} connections")
        
        # Send to all connections
        disconnected_connections = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected_connections.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected_connections:
            self.disconnect(connection)
    
    async def broadcast_to_project(self, project_name: str, message: Dict[str, Any]) -> None:
        """
        Broadcast a message to all clients connected to a specific project
        
        Args:
            project_name: Name of the project
            message: Message to broadcast
        """
        if project_name not in self.project_connections:
            logger.debug(f"No connections for project: {project_name}")
            return
        
        connections = self.project_connections[project_name]
        logger.info(f"Broadcasting to project '{project_name}' ({len(connections)} connections)")
        
        # Send to project-specific connections
        disconnected_connections = []
        
        for connection in connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to project connection: {e}")
                disconnected_connections.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected_connections:
            self.disconnect(connection)
    
    async def send_notification(
        self, 
        notification_type: str, 
        message: str, 
        data: Optional[Dict[str, Any]] = None,
        project_name: Optional[str] = None
    ) -> None:
        """
        Send a structured notification
        
        Args:
            notification_type: Type of notification (info, success, warning, error)
            message: Notification message
            data: Additional data to include
            project_name: Optional project name for targeted notification
        """
        notification = {
            "type": "notification",
            "notification_type": notification_type,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if project_name:
            await self.broadcast_to_project(project_name, notification)
        else:
            await self.broadcast_message(notification)
    
    async def send_progress_update(
        self,
        task_id: str,
        progress: int,
        status: str,
        message: Optional[str] = None,
        project_name: Optional[str] = None
    ) -> None:
        """
        Send a progress update for a long-running task
        
        Args:
            task_id: Unique identifier for the task
            progress: Progress percentage (0-100)
            status: Current status (running, completed, failed)
            message: Optional status message
            project_name: Optional project name for targeted update
        """
        progress_update = {
            "type": "progress_update",
            "task_id": task_id,
            "progress": progress,
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if project_name:
            await self.broadcast_to_project(project_name, progress_update)
        else:
            await self.broadcast_message(progress_update)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about current connections
        
        Returns:
            Dictionary with connection statistics
        """
        return {
            "total_connections": len(self.active_connections),
            "project_connections": {
                project: len(connections) 
                for project, connections in self.project_connections.items()
            },
            "connection_metadata": {
                str(id(ws)): metadata 
                for ws, metadata in self.connection_metadata.items()
            }
        }


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
