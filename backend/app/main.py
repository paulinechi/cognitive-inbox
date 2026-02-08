import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import get_settings
from .database import engine, Base
from .routers import memos, collections

# Setup Logging
settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Lifecycle Management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    # In production, use Alembic/migrations instead.
    logger.info("Startup - Verifying database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize default collections if empty
    from .database import SessionLocal
    from .models import CollectionModel
    import uuid
    from datetime import datetime
    
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

# Middleware
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
