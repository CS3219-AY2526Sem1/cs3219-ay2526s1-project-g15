from typing import Union
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import verify_token
from app.core.config import settings
from app.schemas.matching import (
    MatchRequestCreate, 
    MatchRequestResponse,
    MatchRequestStatusResponse,
    MatchFoundResponse,
    MatchConfirmRequest,
    MatchConfirmedResponse,
    MatchCancelledResponse
)
from app.services.matching_service import matching_service
from app.models.match_request import MatchRequest, MatchStatus
from app.models.match import Match
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
    from app.core.config import settings
    
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
                
                asyncio.create_task(confirm_timeout_task(match.id, settings.CONFIRM_MATCH_TIMEOUT_SECONDS))
                break
            
            await asyncio.sleep(2)
    finally:
        db.close()

async def confirm_timeout_task(match_id: str, timeout_seconds: int):
    from app.core.database import SessionLocal
    from app.models import Match, MatchRequest, MatchStatus
    from app.utils.matching_queue import matching_queue

    await asyncio.sleep(timeout_seconds)

    db = SessionLocal()
    try:
        m = db.query(Match).filter(Match.id == match_id).first()
        if not m:
            return  # already cleaned up

        # If not fully confirmed by now, expire & requeue both
        if not (m.user1_confirmed and m.user2_confirmed):
            # fetch original requests
            r1 = db.query(MatchRequest).filter(MatchRequest.id == m.request1_id).first()
            r2 = db.query(MatchRequest).filter(MatchRequest.id == m.request2_id).first()

            for r in (r1, r2):
                if r:
                    r.status = MatchStatus.PENDING
                    r.matched_at = None
                    db.add(r)
                    # put back into Redis queue
                    difficulty_val = r.difficulty.value if hasattr(r.difficulty, "value") else r.difficulty
                    matching_queue.add_to_queue(
                        request_id=r.id,
                        user_id=r.user_id,
                        difficulty=difficulty_val,
                        topic=r.topic
                    )

            # delete or mark match as expired; simplest is delete
            db.delete(m)
            db.commit()

            # (optional) notify users over WS
            try:
                await manager.send_message(m.user1_id, {"type": "match_expired", "reason": "confirmation_timeout"})
                await manager.send_message(m.user2_id, {"type": "match_expired", "reason": "confirmation_timeout"})
            except Exception:
                pass
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

@router.get("/requests/{request_id}/status", response_model=MatchRequestStatusResponse)
def get_request_status(
    request_id: str,
    user: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    # Ensure the request exists and belongs to the caller
    req = db.query(MatchRequest).filter(MatchRequest.id == request_id).first()
    if not req or req.user_id != user["user_id"]:
        raise HTTPException(status_code=404, detail="Request not found")

    # Build response
    status_str = req.status.value if hasattr(req.status, "value") else str(req.status)
    resp = {"status": status_str}

    # If matched, fetch the match_id
    if req.status == MatchStatus.MATCHED:
        m = db.query(Match).filter(
            (Match.request1_id == request_id) | (Match.request2_id == request_id)
        ).first()
        if m:
            resp["match_id"] = m.id

    return resp

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


@router.post("/confirm", response_model=Union[MatchConfirmedResponse, MatchCancelledResponse])
async def confirm_match(
    confirmation: MatchConfirmRequest,
    user: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Confirm match and create collaboration session
    """
    try:
        result = matching_service.confirm_match(
            db=db,
            match_id=confirmation.match_id,
            user_id=user["user_id"],
            confirmed=confirmation.confirmed
        )

        # Service returns either a Match (confirmed path) or a dict like {"cancelled": True, "match_id": "..."}
        if isinstance(result, dict) and result.get("cancelled"):
            return {
                "status": "cancelled",
                "requeued_partner": True,
                "match_id": result["match_id"]
            }

        match = result
        # If both confirmed, return session details
        if match.user1_confirmed and match.user2_confirmed:
            # Call collaboration service and question service to set up the session
            
            partner_id = match.user2_id if match.user1_id == user["user_id"] else match.user1_id
            
            return MatchConfirmedResponse(
                match_id=match.id,
                session_id=match.session_id or "pending",
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
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time matching updates.
    Expects a JWT access token in the query string: /ws?token=<ACCESS_TOKEN>
    """
    user_id = None
    try:
        # Decode with the *User Service* secret & settings
        claims = jwt.decode(
            token,
            settings.AUTH_ACCESS_SECRET, # SAME value as user-service SECRET_KEY
            algorithms=[settings.AUTH_ALGORITHM],
            issuer=settings.AUTH_ISSUER,
            options={"verify_aud": bool(settings.AUTH_AUDIENCE)},
            audience=settings.AUTH_AUDIENCE,
        )

        # Must be an access token
        if claims.get("type") != "access":
            await websocket.close(code=4401)
            return

        # Get the canonical user id
        user_id = claims.get("sub")
        if not user_id:
            await websocket.close(code=4401)
            return

        # Accept the socket and register it
        await manager.connect(user_id, websocket)

        # Keep alive / receive client messages if you need them
        while True:
            _ = await websocket.receive_json()

    except (ExpiredSignatureError, JWTError):
        # token invalid/expired
        try:
            await websocket.close(code=4401)
        finally:
            if user_id:
                manager.disconnect(user_id)
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)
    except Exception as e:
        # log the error if you wish
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        finally:
            if user_id:
                manager.disconnect(user_id)