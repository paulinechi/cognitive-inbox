from pydantic_settings import BaseSettings
import os
from functools import lru_cache
import yaml
from typing import List
import logging

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

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognitive Inbox API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = ""
    
    # Database
    DATABASE_URL: str = app_config.get('database_url', "sqlite:///./cognitive_inbox.db")
    
    # AI
    GOOGLE_API_KEY: str | None = None
    GEMINI_MODEL_NAME: str = app_config.get('gemini_model', "gemini-flash-lite-latest")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = app_config.get('cors_origins', ["*"])
    
    # Defaults
    DEFAULT_COLLECTIONS: List[str] = app_config.get('collections', [])
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()
