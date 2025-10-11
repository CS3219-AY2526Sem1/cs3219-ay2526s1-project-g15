from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import verify_token
from app.schemas.matching import (
    MatchRequestCreate, 
    MatchRequestResponse,
    MatchFoundResponse,
    MatchConfirmRequest,
    MatchConfirmedResponse
)
from app.services.matching_service import matching_service
from typing import Dict
import asyncio

router = APIRouter()

# Debugging:
# @router.get("/ping")
# async def ping():
#     return {"ok": True}

# @router.get("/debug/whoami")
# def whoami(user: dict = Depends(verify_token)):
#     return user  # {"user_id": "..."}

# @router.get("/debug/my-requests")
# def debug_my_requests(user: dict = Depends(verify_token), db: Session = Depends(get_db)):
#     from app.models.match_request import MatchRequest, MatchStatus
#     rows = db.query(MatchRequest).filter(
#         MatchRequest.user_id == user["user_id"],
#         MatchRequest.status == MatchStatus.PENDING,
#     ).all()
#     return [{k: v for k, v in r.__dict__.items() if k != "_sa_instance_state"} for r in rows]

# @router.get("/debug/matches")
# def debug_list_matches(db: Session = Depends(get_db)):
#     from app.models.match import Match
#     rows = db.query(Match).all()
#     return [{k: v for k, v in m.__dict__.items() if k != "_sa_instance_state"} for m in rows]

# @router.get("/debug/my-requests")
# def debug_my_requests(user: dict = Depends(verify_token), db: Session = Depends(get_db)):
#     from app.models.match_request import MatchRequest
#     rows = db.query(MatchRequest).filter(MatchRequest.user_id == user["user_id"]).all()
#     return [{k: v for k, v in r.__dict__.items() if k != "_sa_instance_state"} for r in rows]

# @router.get("/debug/matches")
# def debug_list_matches(db: Session = Depends(get_db)):
#     from app.models.match import Match
#     rows = db.query(Match).all()
#     return [{k:v for k,v in m.__dict__.items() if k != "_sa_instance_state"} for m in rows]

# @router.get("/debug/queue/{difficulty}/{topic}")
# def debug_queue(difficulty: str, topic: str):
#     # peek into Redis queue
#     from app.utils.matching_queue import matching_queue
#     size = matching_queue.get_queue_size(difficulty, topic)
#     # raw view (optional)
#     try:
#         import redis, json
#         r = matching_queue.redis_client
#         key = f"matching_queue:{difficulty}:{topic}"
#         members = r.zrange(key, 0, -1, withscores=True)
#         return {"size": size, "members": [{"data": json.loads(m), "score": s} for m, s in members]}
#     except Exception as e:
#         return {"size": size, "error": str(e)}

# WebSocket connection manager for real-time updates
class MatchingConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                self.disconnect(user_id)

manager = MatchingConnectionManager()


@router.post("/request", response_model=MatchRequestResponse)
async def create_match_request(
    request: MatchRequestCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Create a new match request
    User will be added to matching queue
    """
    try:
        match_request = matching_service.create_match_request(
            db=db,
            user_id=user["user_id"],
            difficulty=request.difficulty,
            topic=request.topic
        )
        
        # Start background task to find match
        background_tasks.add_task(
            find_match_async,
            match_request.id,
            user["user_id"]
        )
        
        # Start timeout task
        background_tasks.add_task(
            handle_timeout_async,
            match_request.id,
            60  # 60 seconds timeout
        )
        
        return match_request
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


async def find_match_async(request_id: str, user_id: str):
    """Background task to continuously search for matches"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Try to find match for up to 60 seconds
        for _ in range(30):  # Check every 2 seconds
            match = matching_service.find_and_create_match(db, request_id)
            
            if match:
                # Notify both users via WebSocket
                await manager.send_message(match.user1_id, {
                    "type": "match_found",
                    "match_id": match.id,
                    "partner_id": match.user2_id,
                    "difficulty": match.difficulty,
                    "topic": match.topic
                })
                
                await manager.send_message(match.user2_id, {
                    "type": "match_found",
                    "match_id": match.id,
                    "partner_id": match.user1_id,
                    "difficulty": match.difficulty,
                    "topic": match.topic
                })
                
                break
            
            await asyncio.sleep(2)
    finally:
        db.close()


async def handle_timeout_async(request_id: str, timeout_seconds: int):
    """Handle match request timeout after specified seconds"""
    from app.core.database import SessionLocal
    
    await asyncio.sleep(timeout_seconds)
    
    db = SessionLocal()
    try:
        matching_service.handle_timeout(db, request_id)
        # Notify user via WebSocket here
    finally:
        db.close()


@router.delete("/request/{request_id}")
async def cancel_match_request(
    request_id: str,
    user: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Cancel a pending match request"""
    try:
        matching_service.cancel_match_request(db, request_id, user["user_id"])
        return {"message": "Match request cancelled"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm", response_model=MatchConfirmedResponse)
async def confirm_match(
    confirmation: MatchConfirmRequest,
    user: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Confirm match and create collaboration session
    """
    try:
        match = matching_service.confirm_match(
            db=db,
            match_id=confirmation.match_id,
            user_id=user["user_id"]
        )
        
        # If both confirmed, return session details
        if match.user1_confirmed and match.user2_confirmed:
            # Call collaboration service and question service to set up the session
            
            partner_id = match.user2_id if match.user1_id == user["user_id"] else match.user1_id
            
            return MatchConfirmedResponse(
                match_id=match.id,
                collaboration_session_id=match.collaboration_session_id or "pending",
                question_id="TBD",  # Get from question service
                partner_id=partner_id
            )
        else:
            raise HTTPException(
                status_code=202,
                detail="Waiting for partner confirmation"
            )
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str
):
    """
    WebSocket endpoint for real-time matching updates
    """
    # Verify token (you'll need to implement this for WebSocket)
    # For now, assuming token is passed as query param
    
    try:
        # Extract user_id from token
        from jose import jwt
        from app.core.config import settings
        
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        await manager.connect(user_id, websocket)
        
        # Keep connection alive
        while True:
            data = await websocket.receive_json()
            # Handle any client messages if needed
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if user_id:
            manager.disconnect(user_id)