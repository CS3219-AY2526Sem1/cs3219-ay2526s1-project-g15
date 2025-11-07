import asyncio
import aio_pika
import json
import aiohttp
import redis.asyncio as redis
import os
from app.api.websocket import broadcast_to_session

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:password@rabbitmq:5672/")
QUESTION_SERVICE_URL = os.getenv("QUESTION_SERVICE_URL", "http://question-service:8003")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001")

async def notify_session_ready(session_id):
    await broadcast_to_session(
        session_id,
        {
            "type": "session_state",
            "data": {
                "status": "ready",
                "session_id": session_id
            }
        },
        exclude_user_id=None
    )

async def handle_session_created(payload):
    match_id = payload["match_id"]
    session_id = payload["session_id"]
    question_id = payload["question_id"]
    partner_id = payload["partner_id"]

    async with aiohttp.ClientSession() as session:
        # Fetch question
        question_resp = await session.get(f"{QUESTION_SERVICE_URL}/api/v1/questions/{question_id}")
        question = await question_resp.json()

    # Store in Redis
    redis_client = redis.from_url("redis://redis:6379/0")
    session_data = {
        "match_id": match_id,
        "session_id": session_id,
        "question": question,
        "partner": partner_id,
        "language": "python",
        "code": "",
    }

    await redis_client.set(session_id, json.dumps(session_data))

    await notify_session_ready(session_id)

async def consume_matching_events():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange("matching.events", aio_pika.ExchangeType.TOPIC, durable=True)
    queue = await channel.declare_queue("collaboration_session_created", durable=True)

    await queue.bind(exchange, routing_key="match.found")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_session_created(payload)

if __name__ == "__main__":
    asyncio.run(consume_matching_events())
