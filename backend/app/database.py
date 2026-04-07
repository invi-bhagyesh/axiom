import aiomysql
from contextlib import asynccontextmanager
from app.config import settings

pool = None


async def init_pool():
    global pool
    pool = await aiomysql.create_pool(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        autocommit=True,
        minsize=2,
        maxsize=10,
    )


async def close_pool():
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()


@asynccontextmanager
async def get_conn():
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            yield conn, cur
