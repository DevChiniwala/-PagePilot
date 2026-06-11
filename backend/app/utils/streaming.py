"""Streaming utilities for Server-Sent Events (SSE)."""

import json
from collections.abc import AsyncGenerator
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def format_sse_event(event: str, data: dict[str, Any]) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def format_sse_chunk(event: str, data: str) -> str:
    """Format a raw SSE chunk."""
    return f"event: {event}\ndata: {data}\n\n"


async def sse_generator(
    event_stream: AsyncGenerator[dict[str, Any], None],
) -> AsyncGenerator[str, None]:
    """
    Convert event dicts to SSE formatted strings.
    """
    try:
        async for event in event_stream:
            yield format_sse_event(event["event"], event["data"])
    except Exception as e:
        logger.exception("SSE generator error")
        yield format_sse_event("error", {"error": str(e)})


def parse_sse_event(line: str) -> tuple[str, str]:
    """Parse a single SSE line."""
    if line.startswith("event: "):
        return "event", line[7:]
    elif line.startswith("data: "):
        return "data", line[6:]
    return "", ""


def decode_sse_stream(lines) -> AsyncGenerator[dict[str, Any], None]:
    """Decode SSE stream from lines."""
    event = None
    data_lines = []

    for line in lines:
        line = line.rstrip("\n")

        if not line:
            # Empty line = end of event
            if event and data_lines:
                try:
                    data = json.loads("\n".join(data_lines))
                    yield {"event": event, "data": data}
                except json.JSONDecodeError:
                    yield {"event": event, "data": {"raw": "\n".join(data_lines)}}
            event = None
            data_lines = []
            continue

        field, value = parse_sse_event(line)
        if field == "event":
            event = value
        elif field == "data":
            data_lines.append(value)

    # Handle last event if no trailing newline
    if event and data_lines:
        try:
            data = json.loads("\n".join(data_lines))
            yield {"event": event, "data": data}
        except json.JSONDecodeError:
            yield {"event": event, "data": {"raw": "\n".join(data_lines)}}


# Pre-defined event creators for common patterns
def create_start_event(chunk_count: int = 0) -> dict[str, Any]:
    return {"event": "start", "data": {"chunk_count": chunk_count}}


def create_content_chunk(delta: str) -> dict[str, Any]:
    return {"event": "chunk", "data": {"type": "content", "delta": delta}}


def create_citation_event(citations: list) -> dict[str, Any]:
    return {"event": "citation", "data": {"citations": citations}}


def create_done_event(payload: dict[str, Any]) -> dict[str, Any]:
    return {"event": "done", "data": {**payload, "type": "complete"}}


def create_error_event(error: str) -> dict[str, Any]:
    return {"event": "error", "data": {"error": error}}
