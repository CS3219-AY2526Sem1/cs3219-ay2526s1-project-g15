#!/usr/bin/env python3
"""
RabbitMQ Connection Test Script

Run this script to verify that RabbitMQ is working correctly.
Usage: python test_rabbitmq.py
"""

import asyncio
import sys
import os

# Add the shared directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from shared.messaging.rabbitmq_client import RabbitMQClient


async def test_connection():
    """Test basic RabbitMQ connection"""
    print("🔌 Testing RabbitMQ connection...")

    try:
        client = RabbitMQClient()
        await client.connect()
        print("✅ Connected to RabbitMQ successfully!")
        await client.close()
        return True
    except Exception as e:
        print(f"❌ Failed to connect to RabbitMQ: {e}")
        return False


async def test_messaging():
    """Test basic message publishing and consuming"""
    print("\n📨 Testing message publishing and consuming...")

    received_messages = []

    async def message_handler(message):
        print(f"📥 Received message: {message}")
        received_messages.append(message)

    try:
        client = RabbitMQClient()
        await client.connect()

        # Start consumer
        print("🎧 Starting message consumer...")
        await client.consume_messages(
            queue="test.queue",
            callback=message_handler,
            exchange="test.exchange",
            routing_key="test.message"
        )

        # Give consumer time to set up
        await asyncio.sleep(1)

        # Publish test message
        test_message = {
            "test": "Hello RabbitMQ!",
            "timestamp": "2025-10-17T00:00:00Z"
        }

        print("📤 Publishing test message...")
        await client.publish_message(
            exchange="test.exchange",
            routing_key="test.message",
            message=test_message
        )

        # Wait for message to be processed
        await asyncio.sleep(2)

        await client.close()

        if received_messages:
            print("✅ Message publishing and consuming works!")
            return True
        else:
            print("❌ No messages were received")
            return False

    except Exception as e:
        print(f"❌ Messaging test failed: {e}")
        return False


async def test_rpc():
    """Test RPC-style communication"""
    print("\n🔄 Testing RPC communication...")

    async def echo_handler(request):
        return {"echo": request, "response": "Hello from RPC server!"}

    try:
        # Start RPC server
        server_client = RabbitMQClient()
        await server_client.connect()

        print("🖥️  Starting RPC server...")
        await server_client.setup_rpc_server(
            queue="test.rpc",
            handler=echo_handler
        )

        # Give server time to start
        await asyncio.sleep(1)

        # Make RPC call
        rpc_client = RabbitMQClient()
        await rpc_client.connect()

        print("📞 Making RPC call...")
        response = await rpc_client.rpc_call(
            queue="test.rpc",
            message={"test": "RPC test message"},
            timeout=5.0
        )

        print(f"📨 RPC response: {response}")

        await rpc_client.close()
        await server_client.close()

        if response and "echo" in response:
            print("✅ RPC communication works!")
            return True
        else:
            print("❌ Invalid RPC response")
            return False

    except Exception as e:
        print(f"❌ RPC test failed: {e}")
        return False


async def main():
    """Run all tests"""
    print("🧪 RabbitMQ Integration Test Suite")
    print("=" * 50)

    tests = [
        ("Connection Test", test_connection),
        ("Messaging Test", test_messaging),
        ("RPC Test", test_rpc)
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 50)
    print("📊 Test Results:")

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} - {test_name}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n🎉 All tests passed! RabbitMQ is ready for use.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check your RabbitMQ setup.")
        print("\nTroubleshooting:")
        print("1. Make sure Docker containers are running: docker-compose up")
        print("2. Check RabbitMQ is accessible: http://localhost:15672")
        print("3. Verify environment variables are set correctly")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())