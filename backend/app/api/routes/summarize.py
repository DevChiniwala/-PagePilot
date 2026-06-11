"""Summarization routes with streaming support."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user, get_db
from app.config import get_settings
from app.models.schemas import ErrorResponse, SummarizeRequest
from app.services.rag_pipeline import RAGPipeline
from app.services.vector_store import VectorStoreService
from prisma import Prisma

router = APIRouter(prefix="/summarize", tags=["Summarization"])


@router.post(
    "",
    responses={
        200: {"description": "Streaming summary (text/event-stream)"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def summarize(
    request: SummarizeRequest,
    http_request: Request,
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> StreamingResponse:
    """
    Generate structured summary for a session.
    Returns Server-Sent Events (SSE) stream.
    """
    settings = get_settings()

    # Verify session ownership
    session = await db.session.find_first(
        where={"id": request.session_id, "user_id": current_user.sub}
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Initialize services
    vector_store = VectorStoreService(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        persist_dir=settings.CHROMA_PERSIST_DIR,
    )
    await vector_store.initialize()

    rag = RAGPipeline(vector_store=vector_store, settings=settings)

    async def event_generator():
        """Generate SSE events for streaming summary."""
        try:
            async for event in rag.summarize_stream(
                session_id=request.session_id,
                mode=request.mode,
                url=session.url,
            ):
                yield f"event: {event['event']}\ndata: {event['data']}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
