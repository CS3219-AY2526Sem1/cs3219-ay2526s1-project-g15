from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.api.matching import router as matching_router
from app.core.config import settings

# Configure logging
log_level = getattr(logging, (getattr(settings, "LOG_LEVEL", "INFO") or "INFO").upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("matching-service")

# Lifespan (replaces on_event startup/shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    logger.info("=" * 50)
    logger.info("Starting PeerPrep Matching Service")
    logger.info(f"Environment: {settings.ENV}")
    logger.info(f"Port: {settings.PORT}")
    try:
        # Hide credentials in log
        db_display = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL
        logger.info(f"Database: {db_display}")
    except Exception:
        logger.info("Database: <unavailable>")

    logger.info(f"Redis: {getattr(settings, 'REDIS_URL', 'unset')}")
    logger.info(f"Matching Timeout: {settings.MATCHING_TIMEOUT_SECONDS}s")
    logger.info("=" * 50)

    # Test DB connection (sync engine example)
    try:
        from app.core.database import engine
        # If you are using ASYNC engine, use: async with engine.begin() as conn: await conn.run_sync(lambda _: None)
        with engine.connect() as conn:
            logger.info("✓ Database connection successful")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")

    # Test Redis
    try:
        from app.utils.matching_queue import matching_queue
        matching_queue.redis_client.ping()
        logger.info("✓ Redis connection successful")
    except Exception as e:
        logger.error(f"✗ Redis connection failed: {e}")

    # yield control to application runtime
    try:
        yield
    finally:
        # SHUTDOWN
        logger.info("Shutting down PeerPrep Matching Service")

        # Close DB
        try:
            from app.core.database import engine
            engine.dispose()
            logger.info("✓ Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database: {e}")

        # Close Redis
        try:
            from app.utils.matching_queue import matching_queue
            matching_queue.redis_client.close()
            logger.info("✓ Redis connections closed")
        except Exception as e:
            logger.error(f"Error closing Redis: {e}")

# App
app = FastAPI(
    title="PeerPrep Matching Service",
    description="User matching service for collaborative coding sessions based on difficulty and topic",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,  # <- use lifespan instead of on_event
)

# CORS (tighten origins in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(
    matching_router,
    prefix="/api/v1/matching",
    tags=["Matching"],
)

# Routes
@app.get("/")
async def root():
    return {
        "service": "PeerPrep Matching Service",
        "version": "1.0.0",
        "status": "running",
        "description": "Matches users for collaborative coding sessions",
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "service": "matching-service",
        "port": settings.PORT,
    }

# Exception Handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The endpoint {request.url.path} does not exist",
            "status_code": 404,
        },
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.exception("Internal server error")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500,
        },
    )