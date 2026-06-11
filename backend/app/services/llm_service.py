"""LLM service for Google Gemini."""

import google.generativeai as genai
from google.generativeai.types import GenerationConfig, HarmCategory, HarmBlockThreshold
from typing import AsyncGenerator, Optional, Dict, Any
import structlog

from app.config import get_settings

logger = structlog.get_logger(__name__)


class LLMService:
    """Gemini 1.5 Flash service with streaming support."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL

        genai.configure(api_key=self.api_key)

        # Safety settings - we control via prompts
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        # Generation config
        self.generation_config = GenerationConfig(
            temperature=0.3,
            top_p=0.9,
            top_k=40,
            max_output_tokens=4096,
            candidate_count=1,
        )

        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=self.generation_config,
            safety_settings=self.safety_settings,
        )

        logger.info("LLM service initialized", model=self.model_name)

    async def generate_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming response from Gemini.
        Yields text chunks as they arrive.
        """
        try:
            # Combine system instruction with prompt
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"

            logger.debug("Generating stream", prompt_length=len(full_prompt))

            response = self.model.generate_content(
                full_prompt,
                stream=True,
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error("LLM generation failed", error=str(e))
            raise

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> str:
        """Generate complete response (non-streaming)."""
        full_response = ""
        async for chunk in self.generate_stream(prompt, system_instruction):
            full_response += chunk
        return full_response

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        try:
            return self.model.count_tokens(text).total_tokens
        except Exception:
            # Rough estimate: ~4 chars per token
            return len(text) // 4

    async def generate_with_config(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        system_instruction: Optional[str] = None,
    ) -> str:
        """Generate with custom config."""
        config = GenerationConfig(
            temperature=temperature,
            top_p=0.9,
            top_k=40,
            max_output_tokens=max_tokens,
        )

        full_prompt = prompt
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"

        response = self.model.generate_content(
            full_prompt,
            generation_config=config,
            safety_settings=self.safety_settings,
        )

        return response.text


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service