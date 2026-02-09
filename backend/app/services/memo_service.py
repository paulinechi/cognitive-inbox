import uuid
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from ..models import Memo, MemoModel, MemoProcessed, MemoInput
from ..services.gemini import analyze_content
import shutil
import os

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def save_upload_file(file: UploadFile) -> str:
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else "bin"
    safe_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return f"/uploads/{safe_filename}"

class MemoService:
    @staticmethod
    async def process_entry(
        db: Session,
        text: str | None,
        file: UploadFile | None,
        available_tags: list[str]
    ) -> Memo:
        logger.info("START - note submission")
        
        if not text and not file:
             logger.error("ERROR - Submission failed: No input provided")
             raise HTTPException(status_code=400, detail="Input (text or file) is empty")

        file_bytes = None
        mime_type = None
        if file:
            file_bytes = await file.read()
            mime_type = file.content_type
            logger.info(f"FILE - uploaded: {file.filename}, MIME type: {mime_type}, Size: {len(file_bytes)} bytes")
            
            if mime_type and "audio" in mime_type:
                logger.info("AUDIO - Skipping local transcription; Gemini will transcribe.")
                
        # Save file if present
        media_uri = None
        media_type_db = None
        
        if file:
            # We need to reset file cursor because we read it above
            await file.seek(0)
            media_uri = save_upload_file(file)
            media_type_db = mime_type
            logger.info(f"FILE - Saved to disk: {media_uri}")

        logger.info("AI - Sending content to Gemini for analysis...")
        processed_data = analyze_content(
            text_input=text, 
            file_data=file_bytes, 
            mime_type=mime_type,
            available_tags=available_tags
        )
        
        new_id = str(uuid.uuid4())
        
        db_memo = MemoModel(
            id=new_id,
            original_input=processed_data.original_input,
            extracted_text=processed_data.extracted_text,
            memo_types=json.dumps([t.value if hasattr(t, 'value') else t for t in processed_data.memo_types]),
            summary=processed_data.summary,
            action_items=json.dumps(processed_data.action_items),
            tags=json.dumps(processed_data.tags),
            emotional_tone=processed_data.emotional_tone,
            confidence_score=processed_data.confidence_score,
            created_at=datetime.now(timezone.utc).isoformat(),
            media_uri=media_uri,
            media_type=media_type_db
        )
        
        logger.info(f"DB - Saving memo to database with ID: {new_id}")
        db.add(db_memo)
        db.commit()
        db.refresh(db_memo)
        logger.info(f"DONE - Memo saved successfully - ID: {db_memo.id}")
        
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
            updated_at=db_memo.updated_at.isoformat() if db_memo.updated_at else db_memo.created_at,
            archived=False,

            completed_action_items=json.loads(db_memo.completed_action_items or "[]"),
            media_uri=db_memo.media_uri,
            media_type=db_memo.media_type,
            original_memo_type=db_memo.original_memo_type
        )

    @staticmethod
    def get_all_memos(db: Session) -> list[Memo]:
        memos = db.query(MemoModel).order_by(MemoModel.created_at.desc()).all()
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
                updated_at=memo.updated_at.isoformat() if memo.updated_at else memo.created_at,
                archived=False,

                completed_action_items=json.loads(getattr(memo, 'completed_action_items', '[]') or '[]'),
                media_uri=memo.media_uri,
                media_type=memo.media_type,
                original_memo_type=memo.original_memo_type
            ) for memo in memos
        ]

    @staticmethod
    def toggle_action_item(db: Session, memo_id: str, action_index: int):
        """
        Toggle completion status of an action item.
        Automatically adds 'Completed' as a MemoType when all actions are done,
        removes it when any action becomes incomplete.
        """
        from ..models import MemoType
        
        memo = db.query(MemoModel).filter(MemoModel.id == memo_id).first()
        if not memo:
            raise HTTPException(status_code=404, detail="Memo not found")
        
        action_items = json.loads(memo.action_items or "[]")
        if action_index >= len(action_items):
            raise HTTPException(status_code=400, detail="Invalid action item index")
        
        # Get completed action items list
        completed = json.loads(memo.completed_action_items or "[]")
        
        # Toggle the action item
        if action_index in completed:
            completed.remove(action_index)
        else:
            completed.append(action_index)
        
        # Update memo_types based on completion status
        memo_types = json.loads(memo.memo_types or '["Other"]')
        all_completed = len(completed) == len(action_items) and len(action_items) > 0
        
        if all_completed:
            # Store original type if not already stored
            if not memo.original_memo_type:
                memo.original_memo_type = memo_types[0] if memo_types else "Task"
            # Replace with Completed
            memo_types = ["Completed"]
        else:
            # Restore original type
            if "Completed" in memo_types and memo.original_memo_type:
                memo_types = [memo.original_memo_type]
                memo.original_memo_type = None  # Clear the stored original
        
        # Save changes
        memo.completed_action_items = json.dumps(completed)
        memo.memo_types = json.dumps(memo_types)
        db.commit()
        db.refresh(memo)
        
        logger.info(f"Toggled action item {action_index} for memo {memo_id}. Completed: {completed}, Type: {memo_types}")
        
        # Return updated data
        tags = json.loads(memo.tags or "[]")
        return {
            "id": memo.id,
            "completed_action_items": completed,
            "memo_types": memo_types,
            "tags": tags,
            "all_completed": all_completed,
            "updated_at": memo.updated_at.isoformat() if memo.updated_at else memo.created_at
        }

    @staticmethod
    def delete_memo(db: Session, memo_id: str):
        memo = db.query(MemoModel).filter(MemoModel.id == memo_id).first()
        if not memo:
            raise HTTPException(status_code=404, detail="Memo not found")
        
        db.delete(memo)
        db.commit()
        return {"ok": True}

    @staticmethod
    def update_memo(db: Session, memo_id: str, updates: dict):
        memo = db.query(MemoModel).filter(MemoModel.id == memo_id).first()
        if not memo:
            raise HTTPException(status_code=404, detail="Memo not found")
        
        # Apply updates
        if "summary" in updates:
            memo.summary = updates["summary"]
        if "original_input" in updates:
            memo.original_input = updates["original_input"]
        if "action_items" in updates:
            memo.action_items = json.dumps(updates["action_items"])
        if "tags" in updates:
            memo.tags = json.dumps(updates["tags"])
        if "memo_types" in updates:
            memo.memo_types = json.dumps(updates["memo_types"])
        if "emotional_tone" in updates:
            memo.emotional_tone = updates["emotional_tone"]
        if "completed_action_items" in updates:
             memo.completed_action_items = json.dumps(updates["completed_action_items"])
        
        db.commit()
        db.refresh(memo)
        
        # Return complete object with proper parsing
        return {
            "id": memo.id,
            "summary": memo.summary,
            "original_input": memo.original_input,
            "extracted_text": memo.extracted_text,
            "memo_types": json.loads(memo.memo_types or "[]"),
            "action_items": json.loads(memo.action_items or "[]"),
            "tags": json.loads(memo.tags or "[]"),
            "completed_action_items": json.loads(memo.completed_action_items or "[]"),
            "emotional_tone": memo.emotional_tone,
            "confidence_score": memo.confidence_score,
            "created_at": memo.created_at,
            "updated_at": memo.updated_at.isoformat() if memo.updated_at else memo.created_at,
            "archived": False,
            "original_memo_type": memo.original_memo_type
        }
