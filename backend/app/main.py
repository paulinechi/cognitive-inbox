import os
import uuid
import json
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .models import MemoInput, Memo, MemoProcessed, MemoModel
from .database import engine, Base, get_db
from .services.gemini import analyze_content
from .services.whisper import transcribe_audio

load_dotenv()

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
    if not text and not file:
         raise HTTPException(status_code=400, detail="Input (text or file) is empty")

    file_bytes = None
    mime_type = None
    transcribed_text = None

    if file:
        file_bytes = await file.read()
        mime_type = file.content_type
        
        if mime_type and "audio" in mime_type:
            print(f"Transcribing audio with Whisper...")
            transcribed_text = transcribe_audio(file_bytes, mime_type)
            print(f"Transcription: {transcribed_text}")
            
            if transcribed_text:
                text = transcribed_text
                file_bytes = None
                mime_type = None

    try:
        parsed_tags = json.loads(available_tags)
    except:
        parsed_tags = []

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
        memo_type=processed_data.memo_type,
        summary=processed_data.summary,
        action_items=json.dumps(processed_data.action_items),
        tags=json.dumps(processed_data.tags),
        emotional_tone=processed_data.emotional_tone,
        confidence_score=processed_data.confidence_score
    )
    
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    
    return Memo(
        id=db_memo.id,
        original_input=db_memo.original_input,
        extracted_text=db_memo.extracted_text,
        memo_type=db_memo.memo_type,
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
            memo_type=memo.memo_type,
            summary=memo.summary,
            action_items=json.loads(memo.action_items),
            tags=json.loads(memo.tags),
            emotional_tone=memo.emotional_tone,
            confidence_score=memo.confidence_score,
            created_at=memo.created_at,
            archived=memo.archived
        ) for memo in memos
    ]
