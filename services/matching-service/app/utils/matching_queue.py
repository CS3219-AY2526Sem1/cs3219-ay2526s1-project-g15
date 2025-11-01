import redis
import json
from typing import Optional, List
from datetime import datetime, timezone
from app.core.config import settings

class MatchingQueue:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    def _get_queue_key(self, difficulty: str, topic: str) -> str:
        """Generate Redis key for specific difficulty + topic combination"""
        return f"matching_queue:{difficulty}:{topic}"
    
    def add_to_queue(self, request_id: str, user_id: str, difficulty: str, topic: str):
        """Add user to matching queue"""
        key = self._get_queue_key(difficulty, topic)
        now = datetime.now(timezone.utc)
        member = json.dumps({
            "request_id": request_id,
            "user_id": user_id,
            "timestamp": now.isoformat()
            },
            separators=(",", ":"),
        )
        score = now.timestamp()  # older = smaller score

        # add or update with score
        self.redis_client.zadd(key, {member: score})
        # set TTL only if not already set
        if self.redis_client.ttl(key) in (-1, -2):
            self.redis_client.expire(key, settings.MATCHING_TIMEOUT_SECONDS + 10)
            
    def find_match(self, difficulty: str, topic: str, exclude_user_id: str) -> Optional[dict]:
        key = self._get_queue_key(difficulty, topic)
        # Pop up to N oldest, skip self, reinsert skipped with original score
        batch = self.redis_client.zpopmin(key, 5)  # returns list of (member, score)
        if not batch:
            return None

        picked = None
        to_reinsert = []
        for member, score in batch:
            data = json.loads(member)
            if data.get("user_id") != exclude_user_id:
                picked = data
                # don't reinsert picked (we are consuming it)
                continue
            # skip self -> keep ordering by re-inserting
            to_reinsert.append((member, score))

        # Reinsert skipped ones with original score
        if to_reinsert:
            self.redis_client.zadd(key, {m: s for (m, s) in to_reinsert})

        return picked
    
    def remove_from_queue(self, request_id: str, difficulty: str, topic: str):
        """Remove specific request from queue"""
        queue_key = self._get_queue_key(difficulty, topic)
        
        # Find and remove the request
        all_requests = self.redis_client.zrange(queue_key, 0, -1)
        for req in all_requests:
            data = json.loads(req)
            if data["request_id"] == request_id:
                self.redis_client.zrem(queue_key, req)
                break
    
    def get_queue_size(self, difficulty: str, topic: str) -> int:
        """Get current queue size for monitoring"""
        queue_key = self._get_queue_key(difficulty, topic)
        return self.redis_client.zcard(queue_key)

matching_queue = MatchingQueue()