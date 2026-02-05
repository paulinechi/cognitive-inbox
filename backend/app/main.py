import os
import uuid
import json
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .models import MemoInput, Memo, MemoProcessed, MemoModel
from .database import engine, Base, get_db
from .services.gemini import analyze_content
from .services.whisper import transcribe_audio

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Configure logging to console and file (using UTF-8 for Windows compatibility)
log_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cognitive Inbox API", version="0.1.0")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Cognitive Inbox Layer 1 API is running"}

@app.post("/capture", response_model=Memo)
async def capture_thought(
    text: str = Form(None), 
    file: UploadFile = File(None),
    available_tags: str = Form("[]"), # JSON string of tags
    db: Session = Depends(get_db)
):
    """
    Capture a thought (Text, Audio, or Image) and process it via Gemini.
    Saves the result to the SQLite database.
    """
    logger.info("START - note submission")
    logger.info(f"Input type: {'text' if text else 'file'}")
    
    if not text and not file:
         logger.error("ERROR - Submission failed: No input provided")
         raise HTTPException(status_code=400, detail="Input (text or file) is empty")

    file_bytes = None
    mime_type = None
    transcribed_text = None

    if file:
        file_bytes = await file.read()
        mime_type = file.content_type
        logger.info(f"FILE - uploaded: {file.filename}, MIME type: {mime_type}, Size: {len(file_bytes)} bytes")
        
        if mime_type and "audio" in mime_type:
            logger.info("AUDIO - Transcribing with Whisper...")
            transcribed_text = transcribe_audio(file_bytes, mime_type)
            logger.info(f"OK - Transcription complete: {transcribed_text[:100]}..." if len(transcribed_text) > 100 else f"OK - Transcription complete: {transcribed_text}")
            
            if transcribed_text:
                text = transcribed_text
                file_bytes = None
                mime_type = None

    logger.info("AI - Sending content to Gemini for analysis...")
    processed_data = analyze_content(
        text_input=text, 
        file_data=file_bytes, 
        mime_type=mime_type,
        available_tags=parsed_tags
    )
    new_id = str(uuid.uuid4())
    
    db_memo = MemoModel(
        id=new_id,
        original_input=processed_data.original_input,
        extracted_text=processed_data.extracted_text,
        memo_types=json.dumps([t.value for t in processed_data.memo_types]),
        summary=processed_data.summary,
        action_items=json.dumps(processed_data.action_items),
        tags=json.dumps(processed_data.tags),
        emotional_tone=processed_data.emotional_tone,
        confidence_score=processed_data.confidence_score
    )
    
    logger.info(f"DB - Saving memo to database with ID: {new_id}")
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    logger.info(f"DONE - Memo saved successfully - ID: {db_memo.id}, Types: {db_memo.memo_types}")
    
    return Memo(
        id=db_memo.id,
        original_input=db_memo.original_input,
        extracted_text=db_memo.extracted_text,
        memo_types=json.loads(db_memo.memo_types),
        summary=db_memo.summary,
        action_items=json.loads(db_memo.action_items),
        tags=json.loads(db_memo.tags),
        emotional_tone=db_memo.emotional_tone,
        confidence_score=db_memo.confidence_score,
        created_at=db_memo.created_at,
        archived=db_memo.archived
    )

@app.get("/memos", response_model=list[Memo])
def get_memos(db: Session = Depends(get_db)):
    """
    Retrieve all organized memos from the database.
    """
    memos = db.query(MemoModel).filter(MemoModel.archived == False).order_by(MemoModel.created_at.desc()).all()
    
    return [
        Memo(
            id=memo.id,
            original_input=memo.original_input,
            extracted_text=memo.extracted_text,
            memo_types=json.loads(memo.memo_types),
            summary=memo.summary,
            action_items=json.loads(memo.action_items),
            tags=json.loads(memo.tags),
            emotional_tone=memo.emotional_tone,
            confidence_score=memo.confidence_score,
            created_at=memo.created_at,
            archived=memo.archived
        ) for memo in memos
    ]
