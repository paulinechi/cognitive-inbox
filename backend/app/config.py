from pydantic_settings import BaseSettings
from pydantic import field_validator
import os
from functools import lru_cache
import yaml
from typing import List
import logging
import json

logger = logging.getLogger(__name__)


def load_app_config():
    try:
        yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'application.yaml')
        with open(yaml_path, 'r') as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        logger.warning(f"Warning: Could not load application.yaml: {e}")
        return {}


app_config = load_app_config()

DEFAULT_COLLECTIONS_FALLBACK = [
    "Memo",
    "Task",
    "Wishlist",
    "Journal",
    "Ideas",
    "Other",
    "Completed",
]


def _normalize_database_url(raw_url: str | None) -> str:
    """Normalize DB URL for local and serverless runtimes.

    - keep non-sqlite URLs unchanged
    - for sqlite relative paths on Vercel, move DB file into `/tmp`
      to avoid read-only app filesystem errors.
    """
    url = (raw_url or "").strip() or "sqlite:///./cognitive_inbox.db"

    # Hosted Postgres providers hand out postgres:// URLs; SQLAlchemy needs postgresql://
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]

    if not url.startswith("sqlite"):
        return url

    is_vercel = os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV") is not None
    if not is_vercel:
        return url

    if url.startswith("sqlite:///./"):
        filename = os.path.basename(url[len("sqlite:///./"):]) or "cognitive_inbox.db"
        return f"sqlite:////tmp/{filename}"

    if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
        filename = os.path.basename(url[len("sqlite:///"):]) or "cognitive_inbox.db"
        return f"sqlite:////tmp/{filename}"

    return url


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognitive Inbox API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = ""

    # Database
    DATABASE_URL: str = _normalize_database_url(app_config.get('database_url', "sqlite:///./cognitive_inbox.db"))


    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        return _normalize_database_url(str(value) if value is not None else None)

    # AI
    GOOGLE_API_KEY: str | None = None
    GEMINI_MODEL_NAME: str = app_config.get('gemini_model', "gemini-flash-lite-latest")

    # Auth
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Uploads
    MAX_UPLOAD_MB: int = 20
    MAX_IMPORT_MB: int = 50

    # Keep as string to avoid pydantic-settings JSON-decoding errors for comma-separated env vars.
    # Accepts either JSON array string (e.g. '["https://a.com"]') or CSV string.
    BACKEND_CORS_ORIGINS: str = (
        json.dumps(app_config.get('cors_origins', ["*"]))
        if isinstance(app_config.get('cors_origins', ["*"]), list)
        else str(app_config.get('cors_origins', "*"))
    )

    # Defaults
    DEFAULT_COLLECTIONS: List[str] = app_config.get('collections', DEFAULT_COLLECTIONS_FALLBACK)

    def parsed_backend_cors_origins(self) -> List[str]:
        raw = (self.BACKEND_CORS_ORIGINS or "").strip()
        if not raw:
            return ["*"]

        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    cleaned = [str(item).strip() for item in parsed if str(item).strip()]
                    return cleaned or ["*"]
            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON in BACKEND_CORS_ORIGINS; falling back to CSV parsing."
                )

        parts = [part.strip() for part in raw.split(",") if part.strip()]
        return parts or ["*"]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        case_sensitive = True


@lru_cache()
def get_settings():
    return Settings()
