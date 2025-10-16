from sqlalchemy.orm import Session
from app.models.match_request import MatchRequest, MatchStatus, DifficultyLevel
from app.models.match import Match
from app.utils.matching_queue import matching_queue
from datetime import datetime, timezone
import uuid
from typing import Optional, Union

class MatchingService:
    
    def create_match_request(
        self, 
        db: Session, 
        user_id: str, 
        difficulty: DifficultyLevel, 
        topic: str
    ) -> MatchRequest:
        """Create a new match request and add to queue"""
        
        # Check if user already has pending request
        existing = db.query(MatchRequest).filter(
            MatchRequest.user_id == user_id,
            MatchRequest.status == MatchStatus.PENDING
        ).first()
        
        if existing:
            raise ValueError("User already has a pending match request")
        
        # Create match request
        request_id = str(uuid.uuid4())
        match_request = MatchRequest(
            id=request_id,
            user_id=user_id,
            difficulty=difficulty,
            topic=topic,
            status=MatchStatus.PENDING
        )
        
        db.add(match_request)
        db.commit()
        db.refresh(match_request)
        
        # Add to Redis queue
        matching_queue.add_to_queue(
            request_id=request_id,
            user_id=user_id,
            difficulty=difficulty.value,
            topic=topic
        )
        
        return match_request
    
    def find_and_create_match(
        self, 
        db: Session, 
        request_id: str
    ) -> Optional[Match]:
        """Try to find a match for the request"""
        
        # Get the match request
        match_request = db.query(MatchRequest).filter(
            MatchRequest.id == request_id
        ).first()
        
        if not match_request or match_request.status != MatchStatus.PENDING:
            return None
        
        # Look for match in queue
        partner_data = matching_queue.find_match(
            difficulty=match_request.difficulty.value,
            topic=match_request.topic,
            exclude_user_id=match_request.user_id
        )
        
        if not partner_data:
            return None
        
        # Get partner's match request
        partner_request = db.query(MatchRequest).filter(
            MatchRequest.id == partner_data["request_id"]
        ).first()
        
        if not partner_request or partner_request.status != MatchStatus.PENDING:
            return None
        
        # Create match
        match = Match(
            id=str(uuid.uuid4()),
            request1_id=match_request.id,
            request2_id=partner_request.id,
            user1_id=match_request.user_id,
            user2_id=partner_request.user_id,
            difficulty=match_request.difficulty.value,
            topic=match_request.topic
        )
        
        # Update both requests to matched
        match_request.status = MatchStatus.MATCHED
        match_request.matched_at = datetime.now(timezone.utc)
        partner_request.status = MatchStatus.MATCHED
        partner_request.matched_at = datetime.now(timezone.utc)
        
        db.add(match)
        db.commit()
        db.refresh(match)
        
        # Remove from queue
        matching_queue.remove_from_queue(
            request_id=match_request.id,
            difficulty=match_request.difficulty.value,
            topic=match_request.topic
        )
        
        return match
    
    def cancel_match_request(self, db: Session, request_id: str, user_id: str):
        """Cancel a pending match request"""
        match_request = db.query(MatchRequest).filter(
            MatchRequest.id == request_id,
            MatchRequest.user_id == user_id
        ).first()
        
        if not match_request:
            raise ValueError("Match request not found")
        
        if match_request.status != MatchStatus.PENDING:
            raise ValueError("Can only cancel pending requests")
        
        match_request.status = MatchStatus.CANCELLED
        db.commit()
        
        # Remove from queue
        matching_queue.remove_from_queue(
            request_id=request_id,
            difficulty=match_request.difficulty.value,
            topic=match_request.topic
        )
    
    def confirm_match(self, db: Session, match_id: str, user_id: str, confirmed: bool) -> Union[Match, dict]:
        """User confirms they want to proceed with the match"""
        match = db.query(Match).filter(Match.id == match_id).first()
        
        if not match:
            raise ValueError("Match not found")
        if user_id not in (match.user1_id, match.user2_id):
            raise ValueError("User not part of this match")

        if confirmed is False:
            # figure out original request and partner's request
            if user_id == match.user1_id:
                my_req_id, partner_req_id, partner_id = match.request1_id, match.request2_id, match.user2_id
            else:
                my_req_id, partner_req_id, partner_id = match.request2_id, match.request1_id, match.user1_id

            my_req = db.query(MatchRequest).filter(MatchRequest.id == my_req_id).first()
            partner_req = db.query(MatchRequest).filter(MatchRequest.id == partner_req_id).first()

            # cancel match
            if my_req and my_req.status != MatchStatus.CANCELLED:
                my_req.status = MatchStatus.CANCELLED
                db.add(my_req)

            # requeue partner
            if partner_req:
                partner_req.status = MatchStatus.PENDING
                partner_req.matched_at = None
                db.add(partner_req)

                difficulty_val = partner_req.difficulty.value if hasattr(partner_req.difficulty, "value") else partner_req.difficulty
                matching_queue.add_to_queue(
                    request_id=partner_req.id,
                    user_id=partner_req.user_id,
                    difficulty=difficulty_val,
                    topic=partner_req.topic,
                )

            # remove the match
            db.delete(match)
            db.commit()
            return {"cancelled": True, "match_id": match_id}

        
        # Update confirmation status
        if match.user1_id == user_id:
            match.user1_confirmed = True
        elif match.user2_id == user_id:
            match.user2_confirmed = True
        else:
            raise ValueError("User not part of this match")
        
        # If both confirmed, create collaboration session
        if match.user1_confirmed and match.user2_confirmed:
            match.confirmed_at = datetime.now(timezone.utc)
            collaboration_id = str(uuid.uuid4())
            match.session_id = collaboration_id
            # Call collaboration service to create session (?)
        
        db.commit()
        db.refresh(match)
        
        return match
    
    def handle_timeout(self, db: Session, request_id: str):
        """Handle match request timeout"""
        match_request = db.query(MatchRequest).filter(
            MatchRequest.id == request_id
        ).first()
        
        if match_request and match_request.status == MatchStatus.PENDING:
            match_request.status = MatchStatus.TIMEOUT
            match_request.timeout_at = datetime.now(timezone.utc)
            db.commit()
            
            # Remove from queue
            matching_queue.remove_from_queue(
                request_id=request_id,
                difficulty=match_request.difficulty.value,
                topic=match_request.topic
            )

matching_service = MatchingService()