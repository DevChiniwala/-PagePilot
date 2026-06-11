"""Vector store service using ChromaDB."""

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from typing import List, Dict, Any, Optional
import structlog

from app.services.embeddings import EmbeddingService, get_embedding_service

logger = structlog.get_logger(__name__)


@dataclass
class Chunk:
    """Document chunk with metadata."""

    id: str
    text: str
    metadata: Dict[str, Any]


@dataclass
class SearchResult:
    """Search result from vector store."""

    id: str
    text: str
    metadata: Dict[str, Any]
    distance: float


class VectorStoreService:
    """ChromaDB vector store service with embedded client."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8000,
        persist_dir: str = "./chroma_db",
        embedding_service: Optional[EmbeddingService] = None,
    ):
        self.host = host
        self.port = port
        self.persist_dir = persist_dir
        self.embedding_service = embedding_service or get_embedding_service()

        self._client: Optional[chromadb.Client] = None
        self._collections: Dict[str, chromadb.Collection] = {}

    async def initialize(self) -> None:
        """Initialize ChromaDB client."""
        if self._client is not None:
            return

        try:
            # Try HTTP client first (for Docker)
            self._client = chromadb.HttpClient(
                host=self.host,
                port=self.port,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            # Test connection
            self._client.heartbeat()
            logger.info("Connected to ChromaDB via HTTP", host=self.host, port=self.port)
        except Exception as e:
            logger.warning("HTTP ChromaDB failed, using embedded", error=str(e))
            # Fallback to embedded client
            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            logger.info("Using embedded ChromaDB", path=self.persist_dir)

    def _get_collection_name(self, session_id: str) -> str:
        """Generate collection name for session."""
        return f"session_{session_id}"

    def _get_or_create_collection(self, session_id: str) -> chromadb.Collection:
        """Get or create collection for session."""
        if session_id in self._collections:
            return self._collections[session_id]

        collection_name = self._get_collection_name(session_id)

        try:
            collection = self._client.get_collection(name=collection_name)
        except Exception:
            # Create new collection with custom embedding function
            collection = self._client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"},
            )

        self._collections[session_id] = collection
        return collection

    async def add_chunks(
        self,
        session_id: str,
        chunks: List[Chunk],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add chunks to vector store."""
        if not chunks:
            return

        collection = self._get_or_create_collection(session_id)

        # Prepare data
        ids = [chunk.id for chunk in chunks]
        texts = [chunk.text for chunk in chunks]
        metadatas = []

        for i, chunk in enumerate(chunks):
            meta = chunk.metadata.copy()
            meta["chunk_index"] = i
            if metadata:
                meta.update(metadata)
            metadatas.append(meta)

        # Generate embeddings
        logger.debug("Generating embeddings for chunks", session_id=session_id, count=len(chunks))
        embeddings = self.embedding_service.embed_texts(texts)

        # Add to collection
        collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        logger.info("Chunks added to vector store", session_id=session_id, count=len(chunks))

    async def query(
        self,
        session_id: str,
        query_text: str,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """Query vector store for similar chunks."""
        collection = self._get_or_create_collection(session_id)

        # Generate query embedding
        query_embedding = self.embedding_service.embed_text(query_text)

        # Query
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where=filter_metadata,
            include=["documents", "metadatas", "distances"],
        )

        # Format results
        search_results = []
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                search_results.append(SearchResult(
                    id=doc_id,
                    text=results["documents"][0][i],
                    metadata=results["metadatas"][0][i],
                    distance=results["distances"][0][i],
                ))

        return search_results

    async def query_mmr(
        self,
        session_id: str,
        query_text: str,
        k: int = 5,
        fetch_k: int = 20,
        lambda_mult: float = 0.5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """Query with Maximal Marginal Relevance for diversity."""
        collection = self._get_or_create_collection(session_id)

        query_embedding = self.embedding_service.embed_text(query_text)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_k,
            where=filter_metadata,
            include=["documents", "metadatas", "distances", "embeddings"],
        )

        if not results["ids"] or not results["ids"][0]:
            return []

        # Simple MMR implementation
        selected = []
        candidates = list(zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
            results["embeddings"][0],
        ))

        # Sort by distance (closest first)
        candidates.sort(key=lambda x: x[3])

        import numpy as np

        for _ in range(min(k, len(candidates))):
            best_score = -1
            best_idx = -1

            for idx, (doc_id, text, meta, dist, emb) in enumerate(candidates):
                if idx in selected:
                    continue

                # Relevance score (inverse distance)
                relevance = 1 - dist

                # Diversity score (max similarity to already selected)
                diversity = 0
                if selected:
                    max_sim = 0
                    for sel_idx in selected:
                        sel_emb = candidates[sel_idx][4]
                        sim = float(np.dot(emb, sel_emb) / (np.linalg.norm(emb) * np.linalg.norm(sel_emb)))
                        max_sim = max(max_sim, sim)
                    diversity = max_sim

                # MMR score
                mmr_score = lambda_mult * relevance - (1 - lambda_mult) * diversity

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx >= 0:
                selected.append(best_idx)

        # Return selected results in order
        search_results = []
        for idx in selected:
            doc_id, text, meta, dist, _ = candidates[idx]
            search_results.append(SearchResult(
                id=doc_id,
                text=text,
                metadata=meta,
                distance=dist,
            ))

        return search_results

    async def delete_session(self, session_id: str) -> None:
        """Delete all vectors for a session."""
        collection_name = self._get_collection_name(session_id)

        try:
            self._client.delete_collection(name=collection_name)
            if session_id in self._collections:
                del self._collections[session_id]
            logger.info("Session vectors deleted", session_id=session_id)
        except Exception as e:
            logger.warning("Failed to delete session vectors", session_id=session_id, error=str(e))

    async def get_collection_stats(self, session_id: str) -> Dict[str, Any]:
        """Get collection statistics."""
        collection = self._get_or_create_collection(session_id)
        count = collection.count()
        return {
            "session_id": session_id,
            "chunk_count": count,
        }

    async def close(self) -> None:
        """Close client connection."""
        if self._client:
            # ChromaDB HTTP client doesn't need explicit close
            self._client = None
            self._collections.clear()