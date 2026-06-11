"""Chat routes with streaming RAG responses."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user, get_db
from app.config import get_settings
from app.models.schemas import ChatRequest, ErrorResponse
from app.services.rag_pipeline import RAGPipeline
from app.services.vector_store import VectorStoreService
from prisma import Prisma

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "",
    responses={
        200: {"description": "Streaming chat response (text/event-stream)"},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
    db: Prisma = Depends(get_db),
) -> StreamingResponse:
    """
    Chat with the page content using RAG.
    Returns Server-Sent Events (SSE) stream.
    """
    settings = get_settings()

    # Verify session ownership
    session = await db.session.find_first(
        where={"id": request.session_id, "user_id": current_user.sub}
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_message = await db.message.create(
        data={
            "session_id": request.session_id,
            "role": "user",
            "content": request.message,
            "metadata": {"mode": request.mode},
        }
    )

    # Initialize services
    vector_store = VectorStoreService(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        persist_dir=settings.CHROMA_PERSIST_DIR,
    )
    await vector_store.initialize()

    rag = RAGPipeline(vector_store=vector_store, settings=settings)

    async def event_generator():
        """Generate SSE events for streaming chat."""
        full_response = ""
        citations = []

        try:
            async for event in rag.chat_stream(
                session_id=request.session_id,
                message=request.message,
                history=request.history or [],
                mode=request.mode,
            ):
                if event["type"] == "content":
                    full_response += event["delta"]
                    yield f"event: chunk\ndata: {event['data']}\n\n"
                elif event["type"] == "citation":
                    citations.extend(event["citations"])
                    yield f"event: citation\ndata: {event['data']}\n\n"
                elif event["type"] == "done":
                    # Save assistant message
                    await db.message.create(
                        data={
                            "session_id": request.session_id,
                            "role": "assistant",
                            "content": full_response,
                            "metadata": {
                                "mode": request.mode,
                                "citations": citations,
                                "user_message_id": user_message.id,
                            },
                        }
                    )
                    yield f"event: done\ndata: {event['data']}\n\n"
                    break
                elif event["type"] == "error":
                    yield f"event: error\ndata: {event['data']}\n\n"
                    break

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
