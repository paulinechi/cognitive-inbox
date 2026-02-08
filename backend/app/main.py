import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os
import mimetypes
from .config import get_settings
from .database import engine, Base
from .routers import memos, collections
from .database import SessionLocal
from .models import CollectionModel
import uuid
from datetime import datetime

settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup - Verifying database schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if db.query(CollectionModel).count() == 0:
            logger.info("Seeding default collections...")
            default_collections = settings.DEFAULT_COLLECTIONS
            for title in default_collections:
                db.add(CollectionModel(
                    id=str(uuid.uuid4()),
                    title=title, 
                    type=title, 
                    is_custom=False,
                    created_at=datetime.utcnow().isoformat()
                ))
            db.commit()
    except Exception as e:
        logger.error(f"Error seeding collections: {e}")
    finally:
        db.close()
        
    yield
    logger.info("Shutdown - Cleaning up resources...")

app = FastAPI(
    title=settings.PROJECT_NAME, 
    version=settings.VERSION,
    lifespan=lifespan
)

mimetypes.add_type('audio/mp4', '.m4a')
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(memos.router)
app.include_router(collections.router)

@app.get("/")
def read_root():
    return {
        "message": f"{settings.PROJECT_NAME} is running", 
        "version": settings.VERSION
    }
