#!/usr/bin/env python3
"""Startup script for the Question Service."""
import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "dev",
        log_level="info"
    )