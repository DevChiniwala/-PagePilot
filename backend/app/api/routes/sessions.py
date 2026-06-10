"""Session management routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from prisma import Prisma

from app.api.deps import get_current_user, get_db
from app.models.schemas import (
    ErrorResponse,
    SessionCreate,
    SessionDetailResponse,
    SessionListResponse,
    SessionResponse,
)
from app.models.schemas import ChatMessage as ChatMessageSchema
from app.models.schemas import SummaryResponse
from app.services.rag_pipeline import RAGPipeline
from app.services.scraper import ScraperService
from app.services.vector_store import VectorStoreService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get(
    "",
    response_model=SessionListResponse,
    responses={401: {"model": ErrorResponse}},
)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> SessionListResponse:
    """List user's sessions with pagination."""
    skip = (page - 1) * page_size

    sessions = await db.session.find_many(
        where={"user_id": current_user.sub},
        order={"created_at": "desc"},
        skip=skip,
        take=page_size + 1,  # Fetch one extra to check has_more
    )

    has_more = len(sessions) > page_size
    if has_more:
        sessions = sessions[:page_size]

    total = await db.session.count(where={"user_id": current_user.sub})

    return SessionListResponse(
        sessions=[
            SessionResponse(
                id=s.id,
                url=s.url,
                title=s.title,
                favicon=s.favicon,
                mode=s.mode,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in sessions
        ],
        total=total,
        page=page,
        page_size=page_size,
        has_more=has_more,
    )


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def create_session(
    session_data: SessionCreate,
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> SessionResponse:
    """Create new session - scrape URL, chunk, embed, and store."""
    from app.config import get_settings

    settings = get_settings()

    # Initialize services
    scraper = ScraperService()
    vector_store = VectorStoreService(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        persist_dir=settings.CHROMA_PERSIST_DIR,
    )
    # Initialize vector store (loads embedding model)
    await vector_store.initialize()

    try:
        # Scrape and clean content
        logger.info("Scraping URL", url=str(session_data.url))
        content = await scraper.extract(str(session_data.url))

        # Create session in database
        session = await db.session.create(
            data={
                "user_id": current_user.sub,
                "url": str(session_data.url),
                "title": content.title,
                "favicon": content.favicon,
                "mode": session_data.mode,
            }
        )

        # Chunk content
        from app.utils.chunking import chunk_text

        chunks = chunk_text(
            content.text,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        # Generate embeddings and store in ChromaDB
        logger.info("Indexing chunks", session_id=session.id, chunk_count=len(chunks))
        await vector_store.add_chunks(session.id, chunks, content.metadata)

        logger.info("Session created", session_id=session.id)

        return SessionResponse(
            id=session.id,
            url=session.url,
            title=session.title,
            favicon=session.favicon,
            mode=session.mode,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    except Exception as e:
        logger.exception("Failed to create session", url=str(session_data.url))
        # Cleanup on failure
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process URL: {str(e)}",
        )


@router.get(
    "/{session_id}",
    response_model=SessionDetailResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_session(
    session_id: str,
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> SessionDetailResponse:
    """Get session with messages and summaries."""
    session = await db.session.find_first(
        where={"id": session_id, "user_id": current_user.sub},
        include={"messages": True, "summaries": True},
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionDetailResponse(
        session=SessionResponse(
            id=session.id,
            url=session.url,
            title=session.title,
            favicon=session.favicon,
            mode=session.mode,
            created_at=session.created_at,
            updated_at=session.updated_at,
        ),
        messages=[
            ChatMessageSchema(
                id=m.id,
                role=m.role,
                content=m.content,
                metadata=m.metadata,
                created_at=m.created_at,
            )
            for m in session.messages
        ],
        summaries=[
            SummaryResponse(
                id=s.id,
                session_id=s.session_id,
                mode=s.mode,
                content=s.content,
                created_at=s.created_at,
            )
            for s in session.summaries
        ],
    )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def delete_session(
    session_id: str,
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> None:
    """Delete session and associated vector data."""
    from app.config import get_settings

    settings = get_settings()

    session = await db.session.find_first(
        where={"id": session_id, "user_id": current_user.sub}
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete from vector store
    vector_store = VectorStoreService(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        persist_dir=settings.CHROMA_PERSIST_DIR,
    )
    await vector_store.initialize()
    await vector_store.delete_session(session_id)

    # Delete from database (cascades to messages and summaries)
    await db.session.delete(where={"id": session_id})

    logger.info("Session deleted", session_id=session_id)