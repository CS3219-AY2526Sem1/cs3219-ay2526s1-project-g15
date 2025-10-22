from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_session
from app.db.init_db import init_db
from app.routers import auth as auth_router
from app.routers import users as users_router
from app.routers import home

app = FastAPI(title="PeerPrep User Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # simple DB check
    async for s in get_session():
        await init_db(s)
        break

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(home.router)

@app.get("/healthz")
async def healthz():
    return {"ok": True}

@app.get("/readyz")
async def readyz(session: AsyncSession = Depends(get_session)):
    await session.execute("SELECT 1")
    return {"ok": True}