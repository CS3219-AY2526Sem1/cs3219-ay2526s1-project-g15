from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.core.config import settings
from app.api import websocket
from app.events import consumer

# Create FastAPI app
app = FastAPI(
    title="PeerPrep Collaboration Service",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket router
app.include_router(websocket.router, prefix="/api/v1", tags=["websocket"])

# Health check endpoint
@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    print(f"{settings.APP_NAME} starting up...")
    # Start the event consumer in the background
    asyncio.create_task(consumer.consume_matching_events())

@app.on_event("shutdown")
async def shutdown_event():
    print(f"{settings.APP_NAME} shutting down...")