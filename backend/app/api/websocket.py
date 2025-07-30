"""
WebSocket API endpoints

This module provides WebSocket endpoints for real-time communication
with frontend clients.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional

from app.websocket.manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    project: Optional[str] = Query(None, description="Project name for targeted messaging")
):
    """
    WebSocket endpoint for real-time communication
    
    Args:
        websocket: WebSocket connection
        project: Optional project name for receiving project-specific updates
    """
    await websocket_manager.connect(websocket, project)
    
    try:
        while True:
            # Keep the connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Echo back received messages (for testing)
            await websocket_manager.send_personal_message(websocket, {
                "type": "echo",
                "message": f"Received: {data}",
                "project": project
            })
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for project: {project}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@router.websocket("/ws/{project_name}")
async def project_websocket_endpoint(websocket: WebSocket, project_name: str):
    """
    WebSocket endpoint for project-specific communication
    
    Args:
        websocket: WebSocket connection
        project_name: Name of the project to connect to
    """
    await websocket_manager.connect(websocket, project_name)
    
    try:
        while True:
            # Keep the connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Handle project-specific messages
            await websocket_manager.send_personal_message(websocket, {
                "type": "project_echo",
                "message": f"Project {project_name} received: {data}",
                "project": project_name
            })
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for project: {project_name}")
    except Exception as e:
        logger.error(f"WebSocket error for project {project_name}: {e}")
        websocket_manager.disconnect(websocket)
