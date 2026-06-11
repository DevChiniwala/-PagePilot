"""RAG Pipeline - Orchestrates retrieval and generation."""

import json
from collections.abc import AsyncGenerator
from typing import Any

import structlog

from app.config import Settings
from app.services.llm_service import LLMService, get_llm_service
from app.services.vector_store import VectorStoreService
from app.utils.prompts import (
    build_context_chunks,
    get_chat_prompt,
    get_summary_prompt,
)

logger = structlog.get_logger(__name__)


class RAGPipeline:
    """Main RAG pipeline for summarization and chat."""

    def __init__(
        self,
        vector_store: VectorStoreService,
        settings: Settings,
        llm: LLMService | None = None,
    ):
        self.vector_store = vector_store
        self.settings = settings
        self.llm = llm or get_llm_service()

    async def summarize_stream(
        self,
        session_id: str,
        mode: str,
        url: str,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Generate streaming summary for a session.
        Yields SSE-compatible events.
        """
        try:
            # Retrieve relevant chunks using MMR for diversity
            logger.info("Retrieving chunks for summary", session_id=session_id, mode=mode)
            chunks = await self.vector_store.query_mmr(
                session_id=session_id,
                query_text=f"Summarize the main content of this page: {url}",
                k=8,
                fetch_k=20,
            )

            if not chunks:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": "No content found for this session"}),
                }
                return

            # Build context
            context = build_context_chunks(
                [{"text": c.text, "metadata": c.metadata} for c in chunks],
                max_chunks=8,
            )

            # Get prompt
            prompt = get_summary_prompt(mode, context)

            # Stream response
            yield {"event": "start", "data": json.dumps({"mode": mode, "chunk_count": len(chunks)})}

            full_response = ""
            async for chunk_text in self.llm.generate_stream(prompt):
                full_response += chunk_text
                yield {
                    "event": "chunk",
                    "data": json.dumps({"type": "content", "delta": chunk_text}),
                }

            # Parse structured response
            structured = self._parse_summary(full_response, mode)

            yield {
                "event": "done",
                "data": json.dumps({
                    "type": "complete",
                    "summary": structured,
                    "citations": [{"chunk_id": c.id, "metadata": c.metadata} for c in chunks],
                }),
            }

        except Exception as e:
            logger.exception("Summarization failed", session_id=session_id)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    async def chat_stream(
        self,
        session_id: str,
        message: str,
        history: list[dict[str, Any]],
        mode: str,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Generate streaming chat response with RAG.
        Yields SSE-compatible events.
        """
        try:
            # Retrieve relevant chunks for the query
            logger.info("Retrieving chunks for chat", session_id=session_id, query=message[:100])
            chunks = await self.vector_store.query_mmr(
                session_id=session_id,
                query_text=message,
                k=6,
                fetch_k=15,
            )

            # Build context
            context = build_context_chunks(
                [{"text": c.text, "metadata": c.metadata} for c in chunks],
                max_chunks=6,
            )

            # Build history string
            history_str = ""
            if history:
                for msg in history[-6:]:  # Last 6 messages
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    history_str += f"{role.capitalize()}: {content}\n"

            # Get prompt
            prompt = get_chat_prompt(mode, context, message, history_str)

            # Stream response
            yield {"event": "start", "data": json.dumps({"chunk_count": len(chunks)})}

            full_response = ""
            async for chunk_text in self.llm.generate_stream(prompt):
                full_response += chunk_text
                yield {
                    "event": "chunk",
                    "data": json.dumps({"type": "content", "delta": chunk_text}),
                }

            # Send citations
            citations = [
                {
                    "chunk_id": c.id,
                    "text": c.text[:200] + "..." if len(c.text) > 200 else c.text,
                    "metadata": c.metadata,
                    "distance": c.distance,
                }
                for c in chunks
            ]

            yield {
                "event": "citation",
                "data": json.dumps({"citations": citations}),
            }

            yield {
                "event": "done",
                "data": json.dumps({
                    "type": "complete",
                    "content": full_response,
                    "citations": citations,
                }),
            }

        except Exception as e:
            logger.exception("Chat failed", session_id=session_id)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    def _parse_summary(self, response: str, mode: str) -> dict[str, Any]:
        """Parse structured summary from response."""
        # Try to extract sections from markdown
        sections = {}
        current_section = None
        current_content = []

        for line in response.split("\n"):
            if line.startswith("## "):
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = line[3:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)

        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        # Build cards based on mode
        cards = []
        if mode == "fast":
            card_mapping = {
                "TL;DR": "TL;DR",
                "Key Insights": "Key Insights",
                "Action Items": "Action Items",
            }
        elif mode == "deep":
            card_mapping = {
                "Overview": "Overview",
                "Key Points": "Key Points",
                "Structure & Organization": "Structure",
                "Implications & Significance": "Implications",
                "Gaps & Questions": "Gaps",
                "Action Items": "Action Items",
            }
        elif mode == "eli5":
            card_mapping = {
                "The Big Idea": "Big Idea",
                "Simple Explanation": "Explanation",
                "Why It Matters": "Why It Matters",
                "Key Takeaways": "Takeaways",
            }
        else:  # expert
            card_mapping = {
                "Technical Summary": "Technical Summary",
                "Architecture & Implementation Details": "Architecture",
                "Critical Analysis": "Analysis",
                "Technical Specifications": "Specs",
                "Implementation Guidance": "Guidance",
            }

        for section_title, card_title in card_mapping.items():
            if section_title in sections and sections[section_title]:
                cards.append({
                    "title": card_title,
                    "content": sections[section_title],
                })

        # If no sections parsed, treat whole response as one card
        if not cards:
            cards.append({
                "title": "Summary",
                "content": response,
            })

        return {
            "mode": mode,
            "cards": cards,
            "raw": response,
        }
