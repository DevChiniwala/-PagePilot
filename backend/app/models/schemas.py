"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl

# ===========================================
# COMMON
# ===========================================

class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    message: str
    details: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    environment: str
    services: dict[str, str] = {}


# ===========================================
# AUTHENTICATION
# ===========================================

class GoogleAuthRequest(BaseModel):
    """Google OAuth authorization code request."""

    code: str = Field(..., description="Authorization code from Google OAuth")
    redirect_uri: str | None = None


class TokenData(BaseModel):
    """JWT token payload."""

    sub: str  # user_id
    email: str
    exp: int
    iat: int
    type: Literal["access", "refresh"] = "access"


class UserResponse(BaseModel):
    """User profile response."""

    id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


# ===========================================
# SESSIONS
# ===========================================

class SessionCreate(BaseModel):
    """Create session request."""

    url: HttpUrl = Field(..., description="URL to analyze")
    mode: Literal["fast", "deep", "eli5", "expert"] = Field(
        default="fast", description="Analysis mode"
    )


class SessionResponse(BaseModel):
    """Session response."""

    id: str
    url: str
    title: str | None = None
    favicon: str | None = None
    mode: str
    created_at: datetime
    updated_at: datetime


class SessionListResponse(BaseModel):
    """Paginated session list response."""

    sessions: list[SessionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class SessionDetailResponse(BaseModel):
    """Session with messages and summaries."""

    session: SessionResponse
    messages: list["ChatMessage"] = []
    summaries: list["SummaryResponse"] = []


# ===========================================
# SUMMARIZE
# ===========================================

class SummarizeRequest(BaseModel):
    """Summarize request."""

    session_id: str = Field(..., description="Session ID")
    mode: Literal["fast", "deep", "eli5", "expert"] = Field(
        default="fast", description="Summary mode"
    )


class SummaryCard(BaseModel):
    """Individual summary card."""

    title: str
    content: str
    icon: str | None = None
    metadata: dict[str, Any] | None = None


class SummarizeResponse(BaseModel):
    """Structured summary response."""

    session_id: str
    mode: str
    url: str
    title: str | None = None
    cards: list[SummaryCard]
    generated_at: datetime
    token_usage: dict[str, int] | None = None


class SummaryResponse(BaseModel):
    """Stored summary response."""

    id: str
    session_id: str
    mode: str
    content: str
    created_at: datetime


# ===========================================
# CHAT
# ===========================================

class ChatMessage(BaseModel):
    """Chat message."""

    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


class ChatRequest(BaseModel):
    """Chat request."""

    session_id: str = Field(..., description="Session ID")
    message: str = Field(..., min_length=1, max_length=8000, description="User message")
    mode: Literal["fast", "deep", "eli5", "expert"] = Field(
        default="fast", description="Chat mode"
    )
    history: list[ChatMessage] | None = None


class ChatResponse(BaseModel):
    """Chat response (non-streaming)."""

    message: ChatMessage
    citations: list[dict[str, Any]] = []


# ===========================================
# STREAMING EVENTS
# ===========================================

class StreamEvent(BaseModel):
    """Server-Sent Event."""

    event: str
    data: dict[str, Any]


class StreamChunk(BaseModel):
    """Streaming content chunk."""

    type: Literal["content", "citation", "done", "error"]
    delta: str | None = None
    content: str | None = None
    citations: list[dict[str, Any]] | None = None
    metadata: dict[str, Any] | None = None
    error: str | None = None


# Forward references
SessionDetailResponse.model_rebuild()
SummarizeResponse.model_rebuild()
SummaryResponse.model_rebuild()
ChatMessage.model_rebuild()
ChatResponse.model_rebuild()
