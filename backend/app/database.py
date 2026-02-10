from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from .config import get_settings

settings = get_settings()


def _ensure_sqlite_parent_dir(db_url: str) -> None:
    if not db_url.startswith("sqlite"):
        return

    path_part = db_url.replace("sqlite:///", "", 1)
    if not path_part or path_part == ':memory:':
        return

    if db_url.startswith("sqlite:////"):
        db_path = "/" + path_part.lstrip("/")
    else:
        db_path = path_part

    parent = os.path.dirname(db_path)
    if parent and parent != ".":
        os.makedirs(parent, exist_ok=True)


_ensure_sqlite_parent_dir(settings.DATABASE_URL)

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
