"""
Performance monitoring middleware for Question Service
Implements NF3.1.1 (500ms retrieval) and NF3.1.2 (2s image loading)
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)

        # NF3.1.1: Questions shall be retrievable within 500ms
        if "/questions/" in str(request.url) and request.method == "GET":
            if process_time > 0.5:
                logger.warning(f"Question retrieval took {process_time:.3f}s (>500ms): {request.url}")

        # NF3.1.2: Images shall load within 2 seconds
        if "/images/" in str(request.url):
            if process_time > 2.0:
                logger.warning(f"Image loading took {process_time:.3f}s (>2s): {request.url}")

        return response