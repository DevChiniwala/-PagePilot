"""Main API router aggregating all route modules."""

from fastapi import APIRouter

from app.api.routes import auth, chat, health, sessions, summarize

api_router = APIRouter()

# Health (no prefix, no auth)
api_router.include_router(health.router, prefix="", tags=["Health"])

# Auth (prefix /auth, no auth required)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Sessions (prefix /sessions, auth required)
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])

# Summarize (prefix /summarize, auth required)
api_router.include_router(summarize.router, prefix="/summarize", tags=["Summarization"])

# Chat (prefix /chat, auth required)
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])