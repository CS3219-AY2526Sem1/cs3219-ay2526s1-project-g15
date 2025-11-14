"""
RabbitMQ Messaging Library for PeerPrep Microservices

This library provides a simple interface for inter-service communication
using RabbitMQ message queues.

Usage Examples:

1. Publishing messages:
```python
from shared.messaging.rabbitmq_client import RabbitMQClient

async def publish_user_created(user_data):
    client = RabbitMQClient()
    await client.connect()
    await client.publish_message(
        exchange="user.events",
        routing_key="user.created",
        message=user_data
    )
    await client.close()
```

2. Consuming messages:
```python
async def handle_user_created(message):
    user_data = message
    print(f"New user created: {user_data}")

async def start_consumer():
    client = RabbitMQClient()
    await client.connect()
    await client.consume_messages(
        queue="matching.user_events",
        callback=handle_user_created,
        exchange="user.events",
        routing_key="user.created"
    )
```

3. RPC-style communication:
```python
async def get_user_profile(user_id):
    client = RabbitMQClient()
    await client.connect()
    response = await client.rpc_call(
        queue="user.profile",
        message={"user_id": user_id}
    )
    await client.close()
    return response
```
"""