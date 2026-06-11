"""LLM service for Google Gemini."""

import asyncio
from collections.abc import AsyncGenerator

import structlog
from google import genai
from google.genai import types

from app.config import get_settings

logger = structlog.get_logger(__name__)


class LLMService:
    """Gemini service with streaming support using google.genai."""

    def __init__(self, api_key: str | None = None, model_name: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL

        self.client = genai.Client(api_key=self.api_key)

        logger.info("LLM service initialized", model=self.model_name)

    async def generate_stream(
        self,
        prompt: str,
        system_instruction: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from Gemini."""
        try:
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"

            logger.debug("Generating stream", prompt_length=len(full_prompt))

            loop = asyncio.get_event_loop()

            def _stream():
                return self.client.models.generate_content_stream(
                    model=self.model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(temperature=0.3, top_p=0.9),
                )

            iterator = await loop.run_in_executor(None, _stream)
            _SENTINEL = object()

            def _next():
                try:
                    return next(iterator)
                except StopIteration:
                    return _SENTINEL

            while True:
                chunk = await loop.run_in_executor(None, _next)
                if chunk is _SENTINEL:
                    break
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            raise

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
    ) -> str:
        """Generate complete response (non-streaming)."""
        try:
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"

            def _generate():
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                )
                return response.text or ""

            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _generate)

        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            raise

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        try:
            response = self.client.models.count_tokens(
                model=self.model_name,
                contents=text,
            )
            return response.total_tokens or len(text) // 4
        except Exception:
            return len(text) // 4

    async def generate_with_config(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        system_instruction: str | None = None,
    ) -> str:
        """Generate with custom config."""
        try:
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"

            def _generate():
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        top_p=0.9,
                        max_output_tokens=max_tokens,
                    ),
                )
                return response.text or ""

            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _generate)

        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            raise


# Singleton instance
_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    """Get or create LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
