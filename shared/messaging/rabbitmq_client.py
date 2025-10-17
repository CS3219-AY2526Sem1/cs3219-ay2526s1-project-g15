import asyncio
import json
import uuid
from typing import Dict, Any, Callable, Optional
import aio_pika
from aio_pika import Message, ExchangeType
import os
from dataclasses import dataclass


@dataclass
class MessageConfig:
    """Configuration for RabbitMQ message handling"""
    exchange_name: str
    exchange_type: ExchangeType = ExchangeType.TOPIC
    routing_key: str = ""
    queue_name: str = ""
    durable: bool = True
    auto_delete: bool = False


class RabbitMQClient:
    """
    RabbitMQ client for inter-service communication in PeerPrep microservices.

    This client provides high-level methods for:
    - Publishing messages to exchanges
    - Consuming messages from queues
    - RPC-style request/response communication
    """

    def __init__(self, rabbitmq_url: Optional[str] = None):
        self.rabbitmq_url = rabbitmq_url or os.getenv(
            "RABBITMQ_URL",
            "amqp://admin:password@rabbitmq:5672/"
        )
        self.connection = None
        self.channel = None
        self._exchanges: Dict[str, aio_pika.Exchange] = {}
        self._rpc_responses: Dict[str, Any] = {}

    async def connect(self):
        """Establish connection to RabbitMQ server"""
        if self.connection and not self.connection.is_closed:
            return

        self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=10)

    async def close(self):
        """Close connection to RabbitMQ server"""
        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()

    async def _get_or_create_exchange(self, name: str, exchange_type: ExchangeType = ExchangeType.TOPIC) -> aio_pika.Exchange:
        """Get existing exchange or create new one"""
        if name not in self._exchanges:
            self._exchanges[name] = await self.channel.declare_exchange(
                name, exchange_type, durable=True
            )
        return self._exchanges[name]

    async def publish_message(
        self,
        exchange: str,
        routing_key: str,
        message: Dict[str, Any],
        message_id: Optional[str] = None
    ):
        """
        Publish a message to an exchange with routing key.

        Args:
            exchange: Name of the exchange
            routing_key: Routing key for message delivery
            message: Message payload (will be JSON serialized)
            message_id: Optional message ID for tracking
        """
        if not self.channel:
            await self.connect()

        exchange_obj = await self._get_or_create_exchange(exchange)

        message_body = json.dumps(message).encode()
        msg = Message(
            message_body,
            message_id=message_id or str(uuid.uuid4()),
            timestamp=asyncio.get_event_loop().time(),
            content_type="application/json"
        )

        await exchange_obj.publish(msg, routing_key=routing_key)

    async def consume_messages(
        self,
        queue: str,
        callback: Callable,
        exchange: str,
        routing_key: str = "",
        exchange_type: ExchangeType = ExchangeType.TOPIC
    ):
        """
        Consume messages from a queue with automatic acknowledgment.

        Args:
            queue: Name of the queue to consume from
            callback: Async function to handle received messages
            exchange: Exchange to bind queue to
            routing_key: Routing key pattern for message filtering
            exchange_type: Type of exchange (topic, direct, fanout)
        """
        if not self.channel:
            await self.connect()

        exchange_obj = await self._get_or_create_exchange(exchange, exchange_type)

        queue_obj = await self.channel.declare_queue(queue, durable=True)
        await queue_obj.bind(exchange_obj, routing_key=routing_key)

        async def message_handler(message: aio_pika.IncomingMessage):
            async with message.process():
                try:
                    body = json.loads(message.body.decode())
                    await callback(body)
                except Exception as e:
                    print(f"Error processing message: {e}")
                    # Message will be rejected and requeued
                    raise

        await queue_obj.consume(message_handler)

    async def rpc_call(
        self,
        queue: str,
        message: Dict[str, Any],
        timeout: float = 30.0
    ) -> Dict[str, Any]:
        """
        Make an RPC call to another service.

        Args:
            queue: RPC queue name (usually service.method_name)
            message: Request payload
            timeout: Maximum time to wait for response

        Returns:
            Response from the target service
        """
        if not self.channel:
            await self.connect()

        correlation_id = str(uuid.uuid4())

        # Create temporary response queue
        callback_queue = await self.channel.declare_queue(exclusive=True)

        # Publish request
        request_body = json.dumps(message).encode()
        request_msg = Message(
            request_body,
            correlation_id=correlation_id,
            reply_to=callback_queue.name,
            content_type="application/json"
        )

        await self.channel.default_exchange.publish(request_msg, routing_key=queue)

        # Wait for response
        response_future = asyncio.Future()

        async def on_response(message: aio_pika.IncomingMessage):
            if message.correlation_id == correlation_id:
                response_future.set_result(json.loads(message.body.decode()))

        await callback_queue.consume(on_response, no_ack=True)

        try:
            response = await asyncio.wait_for(response_future, timeout=timeout)
            return response
        except asyncio.TimeoutError:
            raise TimeoutError(f"RPC call to {queue} timed out after {timeout}s")

    async def setup_rpc_server(
        self,
        queue: str,
        handler: Callable[[Dict[str, Any]], Dict[str, Any]]
    ):
        """
        Set up an RPC server to handle incoming requests.

        Args:
            queue: RPC queue name to listen on
            handler: Async function that processes requests and returns responses
        """
        if not self.channel:
            await self.connect()

        rpc_queue = await self.channel.declare_queue(queue, durable=True)

        async def rpc_handler(message: aio_pika.IncomingMessage):
            async with message.process():
                try:
                    request = json.loads(message.body.decode())
                    response = await handler(request)

                    response_body = json.dumps(response).encode()
                    response_msg = Message(
                        response_body,
                        correlation_id=message.correlation_id,
                        content_type="application/json"
                    )

                    await self.channel.default_exchange.publish(
                        response_msg,
                        routing_key=message.reply_to
                    )
                except Exception as e:
                    # Send error response
                    error_response = {"error": str(e)}
                    error_body = json.dumps(error_response).encode()
                    error_msg = Message(
                        error_body,
                        correlation_id=message.correlation_id,
                        content_type="application/json"
                    )

                    await self.channel.default_exchange.publish(
                        error_msg,
                        routing_key=message.reply_to
                    )

        await rpc_queue.consume(rpc_handler)


# Predefined exchange configurations for common use cases
EXCHANGES = {
    "user.events": MessageConfig(
        exchange_name="user.events",
        exchange_type=ExchangeType.TOPIC
    ),
    "matching.events": MessageConfig(
        exchange_name="matching.events",
        exchange_type=ExchangeType.TOPIC
    ),
    "collaboration.events": MessageConfig(
        exchange_name="collaboration.events",
        exchange_type=ExchangeType.TOPIC
    ),
    "question.events": MessageConfig(
        exchange_name="question.events",
        exchange_type=ExchangeType.TOPIC
    )
}

# Common routing keys
ROUTING_KEYS = {
    # User service events
    "user.created": "user.created",
    "user.updated": "user.updated",
    "user.deleted": "user.deleted",

    # Matching service events
    "match.requested": "match.requested",
    "match.found": "match.found",
    "match.cancelled": "match.cancelled",

    # Collaboration events
    "session.started": "session.started",
    "session.ended": "session.ended",
    "code.updated": "code.updated",

    # Question events
    "question.assigned": "question.assigned",
    "question.completed": "question.completed"
}