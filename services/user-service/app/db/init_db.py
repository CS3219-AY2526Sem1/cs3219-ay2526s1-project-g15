from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def init_db(session: AsyncSession) -> None:
    await session.execute(text("SELECT 1"))