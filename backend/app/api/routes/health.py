"""Health check routes."""

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_db
from app.models.schemas import HealthResponse
from prisma import Prisma

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    request: Request,
    db: Prisma = Depends(get_db),
) -> HealthResponse:
    """Comprehensive health check."""
    services = {}

    # Check database
    try:
        await db.query_raw("SELECT 1")
        services["database"] = "healthy"
    except Exception:
        services["database"] = "unhealthy"

    # Check ChromaDB (will be added when service is initialized)
    services["chroma"] = "unknown"

    return HealthResponse(
        status="ok" if all(v == "healthy" for v in services.values()) else "degraded",
        version="0.1.0",
        environment=request.app.state.settings.ENVIRONMENT if hasattr(request.app.state, "settings") else "unknown",
        services=services,
    )
