"""Database connection and Prisma client management."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from app.config import settings
from prisma import Prisma


class Database:
    """Database connection manager with Prisma client."""

    def __init__(self) -> None:
        self._client: Prisma | None = None
        self._connected = False

    async def connect(self) -> None:
        """Initialize database connection."""
        if self._connected and self._client:
            return

        self._client = Prisma(
            datasource={
                "url": settings.DATABASE_URL,
            },
            auto_register=True,
        )
        await self._client.connect()
        self._connected = True

    async def disconnect(self) -> None:
        """Close database connection."""
        if self._client and self._connected:
            await self._client.disconnect()
            self._connected = False
            self._client = None

    @property
    def client(self) -> Prisma:
        """Get Prisma client instance."""
        if not self._client or not self._connected:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._client

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[Prisma, None]:
        """Context manager for database transactions."""
        async with self.client.tx() as transaction:
            yield transaction


# Global database instance
db = Database()


async def get_db() -> Prisma:
    """FastAPI dependency for database client."""
    return db.client


async def init_db() -> None:
    """Initialize database connection on startup."""
    await db.connect()


async def close_db() -> None:
    """Close database connection on shutdown."""
    await db.disconnect()
