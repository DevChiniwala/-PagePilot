"""Application configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ===========================================
    # DATABASE (PostgreSQL)
    # ===========================================
    DATABASE_URL: str = Field(
        default="postgresql://pagepilot:password@localhost:5432/pagepilot",
        description="PostgreSQL connection URL",
    )

    # ===========================================
    # VECTOR STORE (ChromaDB)
    # ===========================================
    CHROMA_HOST: str = Field(default="localhost", description="ChromaDB host")
    CHROMA_PORT: int = Field(default=8000, description="ChromaDB port")
    CHROMA_PERSIST_DIR: str = Field(
        default="./chroma_db", description="ChromaDB persistence directory"
    )

    # ===========================================
    # LLM PROVIDER (Google Gemini)
    # ===========================================
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")
    GEMINI_MODEL: str = Field(default="gemini-1.5-flash", description="Gemini model name")

    # ===========================================
    # AUTHENTICATION (JWT + Google OAuth)
    # ===========================================
    JWT_SECRET: str = Field(..., description="JWT signing secret")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15, description="Access token expiry in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="Refresh token expiry in days"
    )
    GOOGLE_CLIENT_ID: str = Field(..., description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: str = Field(..., description="Google OAuth client secret")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:8000/auth/google/callback",
        description="Google OAuth redirect URI",
    )

    # ===========================================
    # EMBEDDINGS (HuggingFace Local)
    # ===========================================
    EMBEDDING_MODEL: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Sentence transformer model for embeddings",
    )
    EMBEDDING_DIM: int = Field(default=384, description="Embedding dimension")

    # ===========================================
    # CHUNKING CONFIGURATION
    # ===========================================
    CHUNK_SIZE: int = Field(default=1000, description="Text chunk size in tokens")
    CHUNK_OVERLAP: int = Field(default=200, description="Chunk overlap in tokens")

    # ===========================================
    # APPLICATION
    # ===========================================
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    CORS_ORIGINS: list[str] = Field(
        default=["chrome-extension://*", "http://localhost:3000"],
        description="Allowed CORS origins",
    )

    # ===========================================
    # RATE LIMITING
    # ===========================================
    RATE_LIMIT_REQUESTS: int = Field(
        default=10, description="Requests per window"
    )
    RATE_LIMIT_WINDOW: int = Field(default=60, description="Rate limit window in seconds")

    # ===========================================
    # COMPUTED PROPERTIES
    # ===========================================
    @property
    def chroma_url(self) -> str:
        """Get full ChromaDB URL."""
        return f"http://{self.CHROMA_HOST}:{self.CHROMA_PORT}"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
