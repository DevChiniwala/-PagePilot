"""Main API router aggregating all route modules."""

from fastapi import APIRouter

from app.api.routes import auth, chat, health, sessions, summarize

api_router = APIRouter()

# Health (no prefix, no auth)
api_router.include_router(health.router, tags=["Health"])

# Auth (prefix /auth, no auth required)
api_router.include_router(auth.router, tags=["Authentication"])

# Sessions (prefix /sessions, auth required)
api_router.include_router(sessions.router, tags=["Sessions"])

# Summarize (prefix /summarize, auth required)
api_router.include_router(summarize.router, tags=["Summarization"])

# Chat (prefix /chat, auth required)
api_router.include_router(chat.router, tags=["Chat"])
