import json
from redis.asyncio import Redis

redis_client = None

async def get_redis_client() -> Redis:
    global redis_client
    if not redis_client:
        redis_client = Redis.from_url("redis://redis:6379", decode_responses=True)
    return redis_client
