"""
WebSocket connection management for real-time updates.

Manages WebSocket connections for real-time dashboard updates
and project-specific notifications in the CI/CD system.
"""

import json
import asyncio
import logging
import uuid
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    type: str
    data: Dict[str, Any]
    timestamp: str = None
    message_id: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
        if self.message_id is None:
            self.message_id = str(uuid.uuid4())


class ConnectionManager:
    """
    WebSocket connection manager for real-time updates.
    
    Manages connections, broadcasts, and project-specific
    communication channels for the dashboard.
    """
    
    def __init__(self):
        # Active connections by connection ID
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Project subscriptions: project_id -> set of connection IDs
        self.project_subscriptions: Dict[str, Set[str]] = {}
        
        # Connection metadata: connection_id -> metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """
        Accept a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            connection_id: Unique connection identifier
            project_id: Project to subscribe to (optional)
            user_id: User ID for the connection (optional)
        """
        await websocket.accept()
        
        # Store connection
        self.active_connections[connection_id] = websocket
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            "connected_at": datetime.utcnow().isoformat(),
            "project_id": project_id,
            "user_id": user_id,
            "last_activity": datetime.utcnow().isoformat()
        }
        
        # Subscribe to project if specified
        if project_id:
            await self.subscribe_to_project(connection_id, project_id)
        
        # Send connection confirmation
        await self.send_personal_message(connection_id, {
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, connection_id: str):
        """
        Remove a WebSocket connection.
        
        Args:
            connection_id: Connection identifier to remove
        """
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from project subscriptions
        for project_id, subscribers in self.project_subscriptions.items():
            subscribers.discard(connection_id)
        
        # Remove metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
    
    async def subscribe_to_project(self, connection_id: str, project_id: str):
        """
        Subscribe a connection to project updates.
        
        Args:
            connection_id: Connection identifier
            project_id: Project ID to subscribe to
        """
        if project_id not in self.project_subscriptions:
            self.project_subscriptions[project_id] = set()
        
        self.project_subscriptions[project_id].add(connection_id)
        
        # Update connection metadata
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["project_id"] = project_id
        
        # Send subscription confirmation
        await self.send_personal_message(connection_id, {
            "type": "project_subscribed",
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def unsubscribe_from_project(self, connection_id: str, project_id: str):
        """
        Unsubscribe a connection from project updates.
        
        Args:
            connection_id: Connection identifier
            project_id: Project ID to unsubscribe from
        """
        if project_id in self.project_subscriptions:
            self.project_subscriptions[project_id].discard(connection_id)
        
        # Send unsubscription confirmation
        await self.send_personal_message(connection_id, {
            "type": "project_unsubscribed",
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def send_personal_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Send a message to a specific connection.
        
        Args:
            connection_id: Target connection identifier
            message: Message to send
        """
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow().isoformat()
                    
            except Exception as e:
                # Connection might be closed, remove it
                self.disconnect(connection_id)
    
    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any]):
        """
        Broadcast a message to all connections subscribed to a project.
        
        Args:
            project_id: Project ID to broadcast to
            message: Message to broadcast
        """
        if project_id not in self.project_subscriptions:
            return
        
        # Add timestamp to message
        message["timestamp"] = datetime.utcnow().isoformat()
        message_json = json.dumps(message)
        
        # Get subscribers
        subscribers = self.project_subscriptions[project_id].copy()
        
        # Send to all subscribers
        disconnected_connections = []
        for connection_id in subscribers:
            if connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                try:
                    await websocket.send_text(message_json)
                    
                    # Update last activity
                    if connection_id in self.connection_metadata:
                        self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow().isoformat()
                        
                except Exception as e:
                    # Connection might be closed, mark for removal
                    disconnected_connections.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            self.disconnect(connection_id)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """
        Broadcast a message to all active connections.
        
        Args:
            message: Message to broadcast
        """
        # Add timestamp to message
        message["timestamp"] = datetime.utcnow().isoformat()
        message_json = json.dumps(message)
        
        # Get all active connections
        connection_ids = list(self.active_connections.keys())
        
        # Send to all connections
        disconnected_connections = []
        for connection_id in connection_ids:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(message_json)
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow().isoformat()
                    
            except Exception as e:
                # Connection might be closed, mark for removal
                disconnected_connections.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            self.disconnect(connection_id)
    
    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Handle incoming WebSocket message.
        
        Args:
            connection_id: Source connection identifier
            message: Received message
        """
        message_type = message.get("type")
        
        if message_type == "subscribe_project":
            project_id = message.get("project_id")
            if project_id:
                await self.subscribe_to_project(connection_id, project_id)
        
        elif message_type == "unsubscribe_project":
            project_id = message.get("project_id")
            if project_id:
                await self.unsubscribe_from_project(connection_id, project_id)
        
        elif message_type == "ping":
            await self.send_personal_message(connection_id, {
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        elif message_type == "get_status":
            await self.send_personal_message(connection_id, {
                "type": "status",
                "active_connections": len(self.active_connections),
                "project_subscriptions": {
                    project_id: len(subscribers) 
                    for project_id, subscribers in self.project_subscriptions.items()
                }
            })
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.
        
        Returns:
            dict: Connection statistics
        """
        return {
            "total_connections": len(self.active_connections),
            "project_subscriptions": {
                project_id: len(subscribers)
                for project_id, subscribers in self.project_subscriptions.items()
            },
            "connections_by_project": {
                project_id: [
                    {
                        "connection_id": conn_id,
                        "metadata": self.connection_metadata.get(conn_id, {})
                    }
                    for conn_id in subscribers
                ]
                for project_id, subscribers in self.project_subscriptions.items()
            }
        }
    
    async def cleanup_stale_connections(self, max_idle_minutes: int = 30):
        """
        Clean up stale connections.
        
        Args:
            max_idle_minutes: Maximum idle time before cleanup
        """
        from datetime import timedelta
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_idle_minutes)
        stale_connections = []
        
        for connection_id, metadata in self.connection_metadata.items():
            last_activity = datetime.fromisoformat(metadata.get("last_activity", ""))
            if last_activity < cutoff_time:
                stale_connections.append(connection_id)
        
        # Disconnect stale connections
        for connection_id in stale_connections:
            if connection_id in self.active_connections:
                try:
                    await self.active_connections[connection_id].close()
                except:
                    pass
            self.disconnect(connection_id)


# Global connection manager instance
connection_manager = ConnectionManager()
