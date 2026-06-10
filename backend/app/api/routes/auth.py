"""Authentication routes - Google OAuth + JWT."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from prisma import Prisma
import httpx
import structlog

from app.api.deps import get_current_user, get_db, get_settings
from app.config import Settings
from app.models.schemas import (
    ErrorResponse,
    GoogleAuthRequest,
    TokenData,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer(auto_error=False)


@router.post(
    "/google",
    response_model=TokenResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
)
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    db: Prisma = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    """
    Exchange Google OAuth authorization code for JWT tokens.
    Creates or updates user in database.
    """
    auth_service = AuthService(db, settings)

    try:
        # Exchange code for Google tokens
        google_tokens = await auth_service.exchange_google_code(request.code)

        # Get user info from Google
        google_user = await auth_service.get_google_user(google_tokens["access_token"])

        # Upsert user in database
        user = await auth_service.upsert_user(
            google_id=google_user["id"],
            email=google_user["email"],
            name=google_user.get("name"),
            avatar_url=google_user.get("picture"),
        )

        # Create JWT tokens
        access_token = auth_service.create_access_token(user.id, user.email)
        refresh_token = await auth_service.create_refresh_token(user.id)

        # Set refresh token as httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=not settings.is_development,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

        logger.info("User authenticated", user_id=user.id, email=user.email)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except httpx.HTTPStatusError as e:
        logger.error("Google OAuth failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization code",
        )
    except Exception as e:
        logger.exception("Authentication error")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> UserResponse:
    """Get current authenticated user profile."""
    user = await db.user.find_unique(where={"id": current_user.sub})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: Prisma = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    """Refresh access token using refresh token."""
    # Get refresh token from cookie or header
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header[7:]

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    auth_service = AuthService(db, settings)

    try:
        # Verify refresh token
        token_data = auth_service.verify_token(refresh_token, token_type="refresh")

        # Check if refresh token exists in DB and not revoked
        stored_token = await db.refreshtoken.find_unique(where={"token": refresh_token})
        if not stored_token or stored_token.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired or revoked",
            )

        # Create new access token
        new_access_token = auth_service.create_access_token(token_data.sub, token_data.email)

        # Rotate refresh token (optional - create new one)
        new_refresh_token = await auth_service.create_refresh_token(token_data.sub)

        # Revoke old refresh token
        await db.refreshtoken.delete(where={"token": refresh_token})

        # Set new refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=not settings.is_development,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Prisma = Depends(get_db),
) -> dict:
    """Logout - revoke refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await db.refreshtoken.delete_many(where={"token": refresh_token})

    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}