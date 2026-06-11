"""Web scraping and content extraction service."""

import asyncio
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
import structlog
import trafilatura
from bs4 import BeautifulSoup
from readability import Document

logger = structlog.get_logger(__name__)


@dataclass
class ExtractedContent:
    """Extracted content from a webpage."""

    url: str
    title: str
    text: str
    html: str
    favicon: str | None = None
    meta_description: str | None = None
    meta_keywords: str | None = None
    headings: list[dict] = None
    metadata: dict = None

    def __post_init__(self):
        if self.headings is None:
            self.headings = []
        if self.metadata is None:
            self.metadata = {}


class ScraperService:
    """Service for extracting clean content from webpages."""

    def __init__(
        self,
        timeout: int = 30,
        max_content_size: int = 500_000,
        user_agent: str = "PagePilot/0.1 (+https://pagepilot.ai)",
    ):
        self.timeout = timeout
        self.max_content_size = max_content_size
        self.user_agent = user_agent
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers={"User-Agent": self.user_agent},
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def fetch_html(self, url: str) -> str:
        """Fetch raw HTML from URL."""
        client = await self._get_client()
        try:
            response = await client.get(url)
            response.raise_for_status()

            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > self.max_content_size:
                raise ValueError(f"Content too large: {content_length} bytes")

            html = response.text
            if len(html) > self.max_content_size:
                raise ValueError(f"Content too large: {len(html)} bytes")

            return html

        except httpx.HTTPStatusError as e:
            logger.error("HTTP error fetching URL", url=url, status=e.response.status_code)
            raise ValueError(f"Failed to fetch URL: HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("Request error fetching URL", url=url, error=str(e))
            raise ValueError(f"Failed to fetch URL: {str(e)}")

    def extract_with_trafilatura(self, html: str, url: str) -> ExtractedContent:
        """Extract content using trafilatura (best for articles)."""
        # Extract main content
        extracted = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,
            include_formatting=True,
            include_links=True,
            include_images=False,
            favor_precision=True,
            with_metadata=True,
            output_format="json",
        )

        if extracted:
            import json
            data = json.loads(extracted)
            text = data.get("text", "")
            title = data.get("title", "")
        else:
            text = ""
            title = ""

        # Extract metadata using BeautifulSoup as fallback
        soup = BeautifulSoup(html, "lxml")

        # Get title
        if not title:
            title_tag = soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else ""

        # Get favicon
        favicon = None
        icon_link = soup.find("link", rel=lambda x: x and "icon" in x.lower())
        if icon_link and icon_link.get("href"):
            favicon = icon_link["href"]
            if favicon.startswith("//"):
                favicon = "https:" + favicon
            elif favicon.startswith("/"):
                parsed = urlparse(url)
                favicon = f"{parsed.scheme}://{parsed.netloc}{favicon}"

        # Get meta tags
        meta_description = None
        meta_keywords = None
        for meta in soup.find_all("meta"):
            name = meta.get("name", "").lower()
            property_ = meta.get("property", "").lower()
            if name == "description" or property_ == "og:description":
                meta_description = meta.get("content", "")
            if name == "keywords":
                meta_keywords = meta.get("content", "")

        # Extract headings
        headings = []
        for i, heading in enumerate(soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])):
            headings.append({
                "level": int(heading.name[1]),
                "text": heading.get_text(strip=True),
                "id": heading.get("id", ""),
            })

        return ExtractedContent(
            url=url,
            title=title or "Untitled",
            text=text,
            html=html,
            favicon=favicon,
            meta_description=meta_description,
            meta_keywords=meta_keywords,
            headings=headings,
            metadata={"extractor": "trafilatura"},
        )

    def extract_with_readability(self, html: str, url: str) -> ExtractedContent:
        """Extract content using readability-lxml (fallback)."""
        doc = Document(html)
        title = doc.title()
        content_html = doc.summary()

        # Parse with BeautifulSoup for clean text
        soup = BeautifulSoup(content_html, "lxml")

        # Remove unwanted elements
        for elem in soup(["script", "style", "nav", "footer", "aside", "header", "iframe", "noscript"]):
            elem.decompose()

        # Get text
        text = soup.get_text(separator="\n", strip=True)

        # Get favicon
        favicon = None
        full_soup = BeautifulSoup(html, "lxml")
        icon_link = full_soup.find("link", rel=lambda x: x and "icon" in x.lower())
        if icon_link and icon_link.get("href"):
            favicon = icon_link["href"]
            if favicon.startswith("//"):
                favicon = "https:" + favicon
            elif favicon.startswith("/"):
                parsed = urlparse(url)
                favicon = f"{parsed.scheme}://{parsed.netloc}{favicon}"

        # Extract headings
        headings = []
        for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
            headings.append({
                "level": int(heading.name[1]),
                "text": heading.get_text(strip=True),
                "id": heading.get("id", ""),
            })

        return ExtractedContent(
            url=url,
            title=title or "Untitled",
            text=text,
            html=content_html,
            favicon=favicon,
            headings=headings,
            metadata={"extractor": "readability"},
        )

    async def extract(self, url: str) -> ExtractedContent:
        """
        Extract clean content from URL.
        Tries trafilatura first, falls back to readability.
        """
        logger.info("Extracting content", url=url)

        html = await self.fetch_html(url)

        # Try trafilatura first (better for articles)
        try:
            content = self.extract_with_trafilatura(html, url)
            if content.text and len(content.text) > 100:
                logger.info("Extraction successful", url=url, method="trafilatura", length=len(content.text))
                return content
        except Exception as e:
            logger.warning("Trafilatura extraction failed", url=url, error=str(e))

        # Fallback to readability
        try:
            content = self.extract_with_readability(html, url)
            logger.info("Extraction successful", url=url, method="readability", length=len(content.text))
            return content
        except Exception as e:
            logger.error("All extraction methods failed", url=url, error=str(e))
            raise ValueError(f"Failed to extract content: {str(e)}")

    async def extract_multiple(self, urls: list[str]) -> list[ExtractedContent]:
        """Extract content from multiple URLs concurrently."""
        tasks = [self.extract(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        contents = []
        for url, result in zip(urls, results):
            if isinstance(result, Exception):
                logger.error("Failed to extract", url=url, error=str(result))
                contents.append(ExtractedContent(url=url, title="Error", text="", html="", metadata={"error": str(result)}))
            else:
                contents.append(result)

        return contents
