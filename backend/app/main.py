import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os
import mimetypes
from sqlalchemy import inspect, text
from .config import get_settings
from .database import engine, Base
from .routers import memos, collections, auth

settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_schema_migrations():
    """Add columns introduced after initial release (no Alembic yet)."""
    inspector = inspect(engine)
    added = []
    with engine.begin() as conn:
        for table in ("memos", "collections"):
            if table not in inspector.get_table_names():
                continue
            columns = {col["name"] for col in inspector.get_columns(table)}
            if "user_id" not in columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR"))
                added.append(f"{table}.user_id")
    if added:
        logger.info(f"Schema migration - added columns: {', '.join(added)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup - Verifying database schema...")
    Base.metadata.create_all(bind=engine)
    try:
        run_schema_migrations()
    except Exception as e:
        logger.error(f"Schema migration failed: {e}")

    # Default collections are seeded per-user at registration (see routers/auth.py)
    yield
    logger.info("Shutdown - Cleaning up resources...")

app = FastAPI(
    title=settings.PROJECT_NAME, 
    version=settings.VERSION,
    lifespan=lifespan
)

mimetypes.add_type('audio/mp4', '.m4a')
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except OSError as e:
    logger.warning(f"Uploads directory unavailable; /uploads static route disabled: {e}")

# Auth uses bearer tokens in the Authorization header, not cookies, so
# credentials support is unnecessary (and invalid in combination with "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_backend_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (support both direct and /api-prefixed paths on Vercel)
app.include_router(auth.router)
app.include_router(memos.router)
app.include_router(collections.router)
app.include_router(auth.router, prefix="/api")
app.include_router(memos.router, prefix="/api")
app.include_router(collections.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": f"{settings.PROJECT_NAME} is running", 
        "version": settings.VERSION
    }


@app.get("/api")
def read_api_root():
    return read_root()
