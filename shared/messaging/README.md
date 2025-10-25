# RabbitMQ Integration Guide for PeerPrep Microservices

This guide shows how to integrate RabbitMQ messaging into your microservices for inter-service communication.

## Overview

RabbitMQ is now available in your Docker environment at:
- **AMQP Port**: 5672 (for applications)
- **Management UI**: http://localhost:15672 (admin/password)
- **Docker Service**: `rabbitmq`
- **Connection URL**: `amqp://admin:password@rabbitmq:5672/`

## Quick Start

### 1. Add RabbitMQ to your service's requirements.txt:
```
aio-pika==9.3.1
```

### 2. Add environment variable to your service:
```bash
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672/
```

### 3. Use the shared client library:
```python
# Copy the shared/messaging/rabbitmq_client.py to your service
from .rabbitmq_client import RabbitMQClient
```

## Common Communication Patterns

### 1. Event Publishing (Fire and Forget)
Use this when a service wants to notify other services about events:

```python
# In user-service: Notify when a new user is created
async def create_user(user_data):
    # ... create user logic ...

    # Notify other services
    client = RabbitMQClient()
    await client.connect()
    await client.publish_message(
        exchange="user.events",
        routing_key="user.created",
        message={
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    await client.close()
```

```python
# In matching-service: Listen for new users
async def handle_new_user(message):
    user_id = message["user_id"]
    # Initialize user matching profile
    await create_user_matching_profile(user_id)

async def start_user_event_listener():
    client = RabbitMQClient()
    await client.connect()
    await client.consume_messages(
        queue="matching.user_events",
        callback=handle_new_user,
        exchange="user.events",
        routing_key="user.created"
    )
```

### 2. Request/Response (RPC Style)
Use this when you need data from another service:

```python
# In matching-service: Get user profile from user-service
async def get_user_profile(user_id):
    client = RabbitMQClient()
    await client.connect()

    response = await client.rpc_call(
        queue="user.profile.get",
        message={"user_id": user_id}
    )

    await client.close()
    return response
```

```python
# In user-service: Handle profile requests
async def handle_profile_request(request):
    user_id = request["user_id"]
    user = await get_user_by_id(user_id)

    return {
        "user_id": user.id,
        "username": user.username,
        "profile_data": user.profile
    }

async def start_rpc_server():
    client = RabbitMQClient()
    await client.connect()
    await client.setup_rpc_server(
        queue="user.profile.get",
        handler=handle_profile_request
    )
```

### 3. Real-time Updates
Use this for live collaboration features:

```python
# In collaboration-service: Broadcast code changes
async def broadcast_code_change(session_id, user_id, code_delta):
    client = RabbitMQClient()
    await client.connect()
    await client.publish_message(
        exchange="collaboration.events",
        routing_key=f"session.{session_id}.code_updated",
        message={
            "session_id": session_id,
            "user_id": user_id,
            "code_delta": code_delta,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    await client.close()
```

## Error Handling

```python
try:
    await client.publish_message(...)
except Exception as e:
    logger.error(f"Failed to publish message: {e}")
    # Handle gracefully - don't break main functionality
```

## Testing

For local development, you can test messaging using the RabbitMQ Management UI:
1. Go to http://localhost:15672
2. Login with admin/password
3. Create test exchanges and queues
4. Send test messages

## Production Considerations

1. **Connection pooling**: Reuse connections across requests
2. **Error handling**: Always handle connection failures gracefully
3. **Message persistence**: Important messages should be durable
4. **Dead letter queues**: Set up for failed message handling
5. **Monitoring**: Use RabbitMQ management metrics

## Integration Checklist

For each service that wants to use RabbitMQ:

- [ ] Add `aio-pika==9.3.1` to requirements.txt
- [ ] Add `RABBITMQ_URL` environment variable
- [ ] Copy rabbitmq_client.py to your service
- [ ] Identify what events your service should publish
- [ ] Identify what events your service should consume
- [ ] Identify what RPC endpoints your service should provide
- [ ] Update your service startup to initialize message consumers
- [ ] Add error handling for messaging failures
- [ ] Test with other services