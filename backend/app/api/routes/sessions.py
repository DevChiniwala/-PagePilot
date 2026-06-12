"""Session management routes."""


import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_db
from app.models.schemas import ChatMessage as ChatMessageSchema
from app.models.schemas import (
    ErrorResponse,
    SessionCreate,
    SessionDetailResponse,
    SessionListResponse,
    SessionResponse,
    SummaryResponse,
)
from app.services.scraper import ScraperService
from app.services.vector_store import VectorStoreService
from prisma import Prisma

logger = structlog.get_logger(__name__)

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

    logger.info("[POST /sessions] ENTER", url=str(session_data.url), user_id=current_user.sub)

    # Initialize services
    scraper = ScraperService()
    vector_store = VectorStoreService(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        persist_dir=settings.CHROMA_PERSIST_DIR,
    )
    logger.info("[POST /sessions] VectorStore initializing...")
    await vector_store.initialize()
    logger.info("[POST /sessions] VectorStore initialized")

    try:
        import time
        # Scrape and clean content
        logger.info("[POST /sessions] Scraping URL", url=str(session_data.url))
        t0 = time.time()
        content = await scraper.extract(str(session_data.url))
        logger.info("[POST /sessions] Scrape complete", url=str(session_data.url), text_len=len(content.text), elapsed=round(time.time() - t0, 2))

        # Create session in database
        logger.info("[POST /sessions] Creating DB record...")
        session = await db.session.create(
            data={
                "user_id": current_user.sub,
                "url": str(session_data.url),
                "title": content.title,
                "favicon": content.favicon,
                "mode": session_data.mode,
            }
        )
        logger.info("[POST /sessions] DB record created", session_id=session.id)

        # Chunk content
        from app.utils.chunking import chunk_text

        logger.info("[POST /sessions] Chunking...")
        t1 = time.time()
        chunks = chunk_text(
            content.text,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        logger.info("[POST /sessions] Chunking complete", chunk_count=len(chunks), elapsed=round(time.time() - t1, 2))

        # Generate embeddings and store in ChromaDB
        logger.info("[POST /sessions] Indexing chunks", session_id=session.id, chunk_count=len(chunks))
        t2 = time.time()
        await vector_store.add_chunks(session.id, chunks, content.metadata)
        logger.info("[POST /sessions] Embedding + storage complete", session_id=session.id, elapsed=round(time.time() - t2, 2))

        logger.info("[POST /sessions] Session created, returning response", session_id=session.id, total_elapsed=round(time.time() - t0, 2))

        response = SessionResponse(
            id=session.id,
            url=session.url,
            title=session.title,
            favicon=session.favicon,
            mode=session.mode,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
        logger.info("[POST /sessions] Response ready", status=201)
        return response

    except Exception as e:
        logger.exception("[POST /sessions] Failed", url=str(session_data.url))
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
