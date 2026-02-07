import os
import uuid
import logging
from fastapi import FastAPI, Depends, Form
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.models import Memo, MemoProcessed
from app.database import engine, Base, get_db
from app.services.gemini_mcp import analyze_with_mcp

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MCP Prototype API")

@app.get("/")
def read_root():
    return {"message": "MCP Prototype API is running"}

@app.post("/capture", response_model=Memo)
async def capture_thought(
    text: str = Form(...),
):
    """
    Capture a thought and analyze it using Gemini + MCP.
    """
    logger.info(f"CAPTURING - {text[:50]}...")
    
    # Analyze with MCP
    processed_data = await analyze_with_mcp(text)
    
    new_id = str(uuid.uuid4())
    
    memo = Memo(
        id=new_id,
        **processed_data.model_dump()
    )
    
    logger.info(f"DONE - Processed memo {new_id} as {memo.memo_type}")
    return memo

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
