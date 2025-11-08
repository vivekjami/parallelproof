import asyncpg
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)


class DatabasePool:
    """Async PostgreSQL connection pool manager"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self, dsn: str):
        """Create connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                dsn=dsn,
                min_size=10,
                max_size=50,
                command_timeout=60,
                timeout=30
            )
            logger.info("✅ Database pool connected")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise
    
    async def disconnect(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Database pool disconnected")
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query without returning results"""
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args) -> List[asyncpg.Record]:
        """Fetch multiple rows"""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """Fetch a single row"""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def fetchval(self, query: str, *args):
        """Fetch a single value"""
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)


# Global database pool instance
db = DatabasePool()
