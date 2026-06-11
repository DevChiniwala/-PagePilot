"""Text chunking utilities for RAG."""

import re
from dataclasses import dataclass
from typing import Any

import structlog
import tiktoken

logger = structlog.get_logger(__name__)


@dataclass
class TextChunk:
    """A chunk of text with metadata."""

    text: str
    index: int
    start_char: int
    end_char: int
    token_count: int
    metadata: dict[str, Any]


def get_tokenizer(model_name: str = "cl100k_base"):
    """Get tiktoken tokenizer."""
    return tiktoken.get_encoding(model_name)


def count_tokens(text: str, model_name: str = "cl100k_base") -> int:
    """Count tokens in text."""
    tokenizer = get_tokenizer(model_name)
    return len(tokenizer.encode(text))


def split_by_headings(text: str) -> list[dict[str, Any]]:
    """
    Split text by markdown headings, preserving hierarchy.
    Returns list of sections with level, title, content, and heading_path.
    """
    lines = text.split("\n")
    sections = []
    current_section = {
        "level": 0,
        "title": "Document Start",
        "content": [],
        "heading_path": [],
    }
    heading_stack = []  # Stack of (level, title)

    for line in lines:
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)

        if heading_match:
            # Save previous section
            if current_section["content"]:
                current_section["heading_path"] = [h[1] for h in heading_stack]
                sections.append(current_section)

            # Start new section
            level = len(heading_match.group(1))
            title = heading_match.group(2).strip()

            # Update heading stack
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, title))

            current_section = {
                "level": level,
                "title": title,
                "content": [],
                "heading_path": [h[1] for h in heading_stack],
            }
        else:
            current_section["content"].append(line)

    # Add last section
    if current_section["content"]:
        current_section["heading_path"] = [h[1] for h in heading_stack]
        sections.append(current_section)

    return sections


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    model_name: str = "cl100k_base",
    min_chunk_size: int = 100,
) -> list[TextChunk]:
    """
    Split text into overlapping chunks using recursive character splitting
    with heading-aware boundaries.
    """
    if not text or not text.strip():
        return []

    tokenizer = get_tokenizer(model_name)
    tokens = tokenizer.encode(text)

    if len(tokens) <= chunk_size:
        return [TextChunk(
            text=text,
            index=0,
            start_char=0,
            end_char=len(text),
            token_count=len(tokens),
            metadata={},
        )]

    chunks = []
    start = 0
    chunk_index = 0

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))

        # Try to find a good break point (sentence, paragraph)
        chunk_tokens = tokens[start:end]
        chunk_text = tokenizer.decode(chunk_tokens)

        # If not at end, try to break at sentence boundary
        if end < len(tokens):
            # Look for sentence endings in the last 200 tokens
            search_text = tokenizer.decode(tokens[max(0, end - 200):end])
            sentence_ends = [m.end() for m in re.finditer(r"[.!?]\s+", search_text)]
            if sentence_ends:
                # Adjust end to last sentence boundary
                last_end = sentence_ends[-1]
                adjusted_end = end - len(search_text) + last_end
                if adjusted_end > start + min_chunk_size:
                    end = adjusted_end
                    chunk_tokens = tokens[start:end]
                    chunk_text = tokenizer.decode(chunk_tokens)

        chunk = TextChunk(
            text=chunk_text,
            index=chunk_index,
            start_char=0,  # Will be calculated if needed
            end_char=len(chunk_text),
            token_count=len(chunk_tokens),
            metadata={},
        )
        chunks.append(chunk)

        # Move start with overlap
        start = end - chunk_overlap
        if start >= len(tokens):
            break
        chunk_index += 1

    logger.debug("Text chunked", original_tokens=len(tokens), chunks=len(chunks))
    return chunks


def chunk_text_with_headings(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    model_name: str = "cl100k_base",
) -> list[TextChunk]:
    """
    Chunk text preserving heading structure.
    Each chunk includes heading path in metadata.
    """
    sections = split_by_headings(text)
    all_chunks = []
    global_index = 0

    for section in sections:
        section_text = "\n".join(section["content"]).strip()
        if not section_text:
            continue

        # Add heading as context
        heading_context = " > ".join(section["heading_path"]) if section["heading_path"] else ""
        if heading_context:
            full_text = f"{heading_context}\n\n{section_text}"
        else:
            full_text = section_text

        section_chunks = chunk_text(
            full_text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            model_name=model_name,
        )

        for chunk in section_chunks:
            chunk.index = global_index
            chunk.metadata = {
                "heading_path": section["heading_path"],
                "section_title": section["title"],
                "section_level": section["level"],
            }
            all_chunks.append(chunk)
            global_index += 1

    return all_chunks


def create_chunks_from_extracted(
    extracted_content,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[TextChunk]:
    """Create chunks from ExtractedContent object."""
    from app.services.scraper import ExtractedContent

    if isinstance(extracted_content, ExtractedContent):
        text = extracted_content.text
        metadata = {
            "url": extracted_content.url,
            "title": extracted_content.title,
            "favicon": extracted_content.favicon,
            "headings": extracted_content.headings,
        }
    else:
        text = str(extracted_content)
        metadata = {}

    chunks = chunk_text_with_headings(
        text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    for chunk in chunks:
        chunk.metadata.update(metadata)

    return chunks
