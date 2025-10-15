from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from typing import Dict, List, Optional
import json
from datetime import datetime
from collections import defaultdict
import asyncio

router = APIRouter()

# Session storage
class Session:
    def __init__(self, session_id: str, question_id: str = None):
        self.session_id = session_id
        self.question_id = question_id
        self.users: Dict[str, dict] = {}
        self.code: str = ""
        self.notes: str = ""
        self.language: str = "python"
        self.created_at = datetime.utcnow()
        self.last_code_update = datetime.utcnow()
        self.last_notes_update = datetime.utcnow()
    
    def add_user(self, user_id: str, websocket: WebSocket, username: str = None):
        self.users[user_id] = {
            "websocket": websocket,
            "username": username or f"User {user_id[:8]}",
            "joined_at": datetime.utcnow(),
            "cursor": None,
            "last_seen": datetime.utcnow()
        }
    
    def update_user_cursor(self, user_id: str, cursor: dict):
        if user_id in self.users:
            self.users[user_id]["cursor"] = cursor
            self.users[user_id]["last_seen"] = datetime.utcnow()
    
    def remove_user(self, user_id: str):
        if user_id in self.users:
            del self.users[user_id]
    
    def get_user_websockets(self, exclude_user_id: Optional[str] = None) -> List[WebSocket]:
        return [
            user["websocket"] 
            for uid, user in self.users.items() 
            if uid != exclude_user_id
        ]
    
    def is_empty(self) -> bool:
        return len(self.users) == 0
    
    def get_state(self) -> dict:
        return {
            "session_id": self.session_id,
            "question_id": self.question_id,
            "code": self.code,
            "notes": self.notes,
            "language": self.language,
            "users": [
                {
                    "user_id": uid,
                    "username": user["username"],
                    "cursor": user.get("cursor")
                }
                for uid, user in self.users.items()
            ],
            "created_at": self.created_at.isoformat()
        }
    
    def get_stats(self) -> dict:
        return {
            "session_id": self.session_id,
            "user_count": len(self.users),
            "code_length": len(self.code),
            "notes_length": len(self.notes),
            "last_code_update": self.last_code_update.isoformat(),
            "last_notes_update": self.last_notes_update.isoformat(),
            "uptime_seconds": (datetime.utcnow() - self.created_at).total_seconds()
        }

# Global storage
active_sessions: Dict[str, Session] = {}

async def broadcast_to_session(
    session_id: str,
    message: dict,
    exclude_user_id: Optional[str] = None
):
    """Broadcast message to all users in session except sender"""
    session = active_sessions.get(session_id)
    if not session:
        return
    
    websockets = session.get_user_websockets(exclude_user_id)
    disconnected = []
    
    for ws in websockets:
        try:
            await ws.send_json(message)
        except Exception as e:
            print(f"Error broadcasting: {e}")
            disconnected.append(ws)
    
    # Clean up disconnected
    for ws in disconnected:
        for user_id, user_data in list(session.users.items()):
            if user_data["websocket"] == ws:
                session.remove_user(user_id)


@router.websocket("/ws/session/active/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    user_id: str = Query(..., description="User ID from JWT"),
    username: str = Query(None, description="Display name"),
):
    """
    Main WebSocket endpoint for real-time collaboration
    
    AUTOMATIC REAL-TIME SYNC:
    - Frontend sends updates on every keystroke (debounced)
    - Backend immediately broadcasts to other users
    - No manual "send" button needed
    
    Connection: ws://localhost:8003/api/v1/ws/session/{session_id}?user_id={user_id}&username={name}
    """
    
    await websocket.accept()
    print(f"{username or user_id} connecting to session {session_id}")
    
    # Create or get session
    if session_id not in active_sessions:
        active_sessions[session_id] = Session(session_id)
    
    session = active_sessions[session_id]
    session.add_user(user_id, websocket, username)
    
    # Send current state immediately
    await websocket.send_json({
        "type": "session_state",
        "data": session.get_state(),
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Notify others
    await broadcast_to_session(session_id, {
        "type": "user_joined",
        "user_id": user_id,
        "username": username or f"User {user_id[:8]}",
        "timestamp": datetime.utcnow().isoformat()
    }, exclude_user_id=user_id)
    
    try:
        # Main message loop - handles real-time updates
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            # Handle different message types
            if msg_type == "code_update":
                await handle_code_update(session, user_id, message)
            
            elif msg_type == "cursor_move":
                await handle_cursor_move(session, user_id, message)
            
            elif msg_type == "notes_update":
                await handle_notes_update(session, user_id, message)
            
            elif msg_type == "language_change":
                await handle_language_change(session, user_id, message)
            
            elif msg_type == "execute_code":
                await handle_code_execution(session, user_id, message)
            
            elif msg_type == "request_state":
                await websocket.send_json({
                    "type": "session_state",
                    "data": session.get_state(),
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            else:
                print(f"Unknown message type: {msg_type}")
    
    except WebSocketDisconnect:
        print(f"{username or user_id} disconnected from {session_id}")
        
        session.remove_user(user_id)
        
        # Notify others
        await broadcast_to_session(session_id, {
            "type": "user_left",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Clean up empty sessions
        if session.is_empty():
            print(f"Session {session_id} empty, cleaning up")
            # TODO: Save to database before deleting
            del active_sessions[session_id]
    
    except Exception as e:
        print(f"Error in WebSocket: {e}")
        await websocket.close(code=1011)


async def handle_code_update(session: Session, user_id: str, message: dict):
    """
    Handle real-time code updates
    Updates are sent automatically as user types (debounced by frontend)
    """
    if "code" in message:
        session.code = message["code"]
        session.last_code_update = datetime.utcnow()
    
    # Update cursor if provided
    if "cursor" in message:
        session.update_user_cursor(user_id, message["cursor"])
    
    # Broadcast immediately to other users
    await broadcast_to_session(session.session_id, {
        "type": "code_update",
        "user_id": user_id,
        "code": session.code,
        "cursor": message.get("cursor"),
        "timestamp": datetime.utcnow().isoformat()
    }, exclude_user_id=user_id)


async def handle_cursor_move(session: Session, user_id: str, message: dict):
    """
    Handle cursor position updates (lightweight)
    Shows where other users are typing
    """
    cursor = message.get("cursor")
    if cursor:
        session.update_user_cursor(user_id, cursor)
    
    # Broadcast cursor position
    await broadcast_to_session(session.session_id, {
        "type": "cursor_move",
        "user_id": user_id,
        "cursor": cursor,
        "selection": message.get("selection"),
        "timestamp": datetime.utcnow().isoformat()
    }, exclude_user_id=user_id)


async def handle_notes_update(session: Session, user_id: str, message: dict):
    """
    Handle collaborative notes updates
    Syncs automatically as users type
    """
    if "notes" in message:
        session.notes = message["notes"]
        session.last_notes_update = datetime.utcnow()
    
    await broadcast_to_session(session.session_id, {
        "type": "notes_update",
        "user_id": user_id,
        "notes": session.notes,
        "timestamp": datetime.utcnow().isoformat()
    }, exclude_user_id=user_id)


async def handle_language_change(session: Session, user_id: str, message: dict):
    """
    Handle programming language changes
    Syncs across all users
    """
    if "language" in message:
        session.language = message["language"]
    
    # Broadcast to all users (including sender for confirmation)
    await broadcast_to_session(session.session_id, {
        "type": "language_change",
        "user_id": user_id,
        "language": session.language,
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_code_execution(session: Session, user_id: str, message: dict):
    """
    Handle code execution requests
    TODO: Integrate with code execution service
    """
    # Show loading state to all users
    await broadcast_to_session(session.session_id, {
        "type": "code_executing",
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # TODO: Call code execution service
    # For now, just send a placeholder response
    await broadcast_to_session(session.session_id, {
        "type": "execution_result",
        "output": "Code execution not yet implemented",
        "status": "pending",
        "timestamp": datetime.utcnow().isoformat()
    })


# REST API Endpoints for debugging and management

@router.get("/sessions")
async def list_active_sessions():
    """List all active collaboration sessions"""
    return {
        "sessions": [
            session.get_stats()
            for session in active_sessions.values()
        ],
        "total_sessions": len(active_sessions),
        "total_users": sum(len(s.users) for s in active_sessions.values())
    }


@router.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get detailed information about a session"""
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "state": session.get_state(),
        "stats": session.get_stats()
    }


@router.delete("/sessions/{session_id}")
async def close_session(session_id: str):
    """Close a session (admin only - add auth later)"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    
    # Notify all users
    await broadcast_to_session(session_id, {
        "type": "session_closed",
        "message": "Session has been closed",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # TODO: Save to database
    
    del active_sessions[session_id]
    
    return {"message": "Session closed successfully"}


@router.post("/sessions/{session_id}/save")
async def save_session(session_id: str):
    """Manually save session state (for testing)"""
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # TODO: Save to database
    state = session.get_state()
    
    return {
        "message": "Session saved (not implemented yet)",
        "state": state
    }