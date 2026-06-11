"""FastAPI dependencies."""


from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import Settings, get_settings
from app.database import db as db_instance
from app.models.schemas import TokenData
from prisma import Prisma

# Security
security = HTTPBearer(auto_error=False)


async def get_db() -> Prisma:
    """Get database client."""
    return db_instance.client


async def get_settings_dep() -> Settings:
    """Get application settings."""
    return get_settings()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings_dep),
) -> TokenData:
    """Extract and validate current user from JWT token."""
    token = None

    # Try Authorization header first
    if credentials:
        token = credentials.credentials
    # Fallback to cookie
    elif request.cookies.get("access_token"):
        token = request.cookies["access_token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )

        token_data = TokenData(**payload)

        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        return token_data

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings_dep),
) -> TokenData | None:
    """Get current user if authenticated, otherwise None."""
    try:
        return await get_current_user(request, credentials, settings)
    except HTTPException:
        return None
