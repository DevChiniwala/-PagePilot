"""Embeddings service using HuggingFace sentence-transformers."""

import logging
from typing import List, Optional

import torch
from sentence_transformers import SentenceTransformer
import structlog

logger = structlog.get_logger(__name__)


class EmbeddingService:
    """Singleton service for generating text embeddings."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: Optional[str] = None,
        batch_size: int = 32,
    ):
        if self._model is not None:
            return

        self.model_name = model_name
        self.batch_size = batch_size

        # Determine device
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        logger.info("Loading embedding model", model=model_name, device=self.device)

        # Load model
        self._model = SentenceTransformer(model_name, device=self.device)
        self._model.eval()

        # Get embedding dimension
        self.dimension = self._model.get_sentence_embedding_dimension()

        logger.info("Embedding model loaded", dimension=self.dimension)

    @classmethod
    def get_instance(cls, *args, **kwargs) -> "EmbeddingService":
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls(*args, **kwargs)
        return cls._instance

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        Returns list of embedding vectors.
        """
        if not texts:
            return []

        # Filter empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return [[] for _ in texts]

        logger.debug("Generating embeddings", count=len(valid_texts))

        with torch.no_grad():
            embeddings = self._model.encode(
                valid_texts,
                batch_size=self.batch_size,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )

        # Convert to list of lists
        result = embeddings.tolist()

        # Map back to original positions (empty texts get empty embeddings)
        output = []
        valid_idx = 0
        for text in texts:
            if text and text.strip():
                output.append(result[valid_idx])
                valid_idx += 1
            else:
                output.append([0.0] * self.dimension)

        return output

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        return self.embed_texts([text])[0]

    def similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts."""
        import numpy as np
        emb1 = self.embed_text(text1)
        emb2 = self.embed_text(text2)
        return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

    def get_dimension(self) -> int:
        """Get embedding dimension."""
        return self.dimension


# Global instance getter
def get_embedding_service(
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
    device: Optional[str] = None,
    batch_size: int = 32,
) -> EmbeddingService:
    """Get or create embedding service instance."""
    return EmbeddingService.get_instance(model_name, device, batch_size)