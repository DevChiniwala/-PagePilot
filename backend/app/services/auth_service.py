"""Authentication service - JWT tokens and Google OAuth."""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import structlog
from jose import JWTError, jwt

from app.config import Settings
from app.models.schemas import TokenData
from prisma import Prisma

logger = structlog.get_logger(__name__)


class AuthService:
    """Handles authentication: JWT tokens and Google OAuth."""

    def __init__(self, db: Prisma, settings: Settings):
        self.db = db
        self.settings = settings

    def create_access_token(self, user_id: str, email: str) -> str:
        """Create short-lived access token."""
        expire = datetime.now(UTC) + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expire,
            "iat": datetime.now(UTC),
            "type": "access",
        }
        return jwt.encode(payload, self.settings.JWT_SECRET, algorithm=self.settings.JWT_ALGORITHM)

    async def create_refresh_token(self, user_id: str) -> str:
        """Create and store long-lived refresh token."""
        token = secrets.token_urlsafe(32)
        expire = datetime.now(UTC) + timedelta(days=self.settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.db.refreshtoken.create(
            data={
                "user_id": user_id,
                "token": token,
                "expires_at": expire,
            }
        )

        return token

    def verify_token(self, token: str, token_type: str = "access") -> TokenData:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.JWT_SECRET,
                algorithms=[self.settings.JWT_ALGORITHM],
            )

            token_data = TokenData(**payload)

            if token_data.type != token_type:
                raise JWTError(f"Invalid token type: expected {token_type}, got {token_data.type}")

            return token_data

        except JWTError as e:
            logger.warning("Token verification failed", error=str(e))
            raise

    async def exchange_google_code(self, code: str) -> dict[str, Any]:
        """Exchange Google OAuth authorization code for tokens."""
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            return response.json()

    async def get_google_user(self, access_token: str) -> dict[str, Any]:
        """Get user info from Google using access token."""
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(userinfo_url, headers=headers)
            response.raise_for_status()
            return response.json()

    async def upsert_user(
        self,
        google_id: str,
        email: str,
        name: str | None = None,
        avatar_url: str | None = None,
    ):
        """Create or update user from Google profile."""
        user = await self.db.user.find_unique(where={"google_id": google_id})

        if user:
            # Update existing user
            user = await self.db.user.update(
                where={"id": user.id},
                data={
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                },
            )
        else:
            # Create new user
            user = await self.db.user.create(
                data={
                    "google_id": google_id,
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                },
            )

        return user

    async def revoke_refresh_token(self, token: str) -> bool:
        """Revoke a refresh token."""
        try:
            await self.db.refreshtoken.delete(where={"token": token})
            return True
        except Exception:
            return False

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens for a user."""
        result = await self.db.refreshtoken.delete_many(where={"user_id": user_id})
        return result.count if hasattr(result, "count") else 0

    async def cleanup_expired_tokens(self) -> int:
        """Clean up expired refresh tokens."""
        result = await self.db.refreshtoken.delete_many(
            where={"expires_at": {"lt": datetime.now(UTC)}}
        )
        return result.count if hasattr(result, "count") else 0
