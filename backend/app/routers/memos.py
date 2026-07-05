from fastapi import APIRouter, Depends, UploadFile, File, Form, Body, HTTPException
from sqlalchemy.orm import Session
import json
import logging
from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..models import Memo, UserModel
from ..rate_limit import capture_limiter, import_limiter
from ..services.memo_service import MemoService
from ..services.keep_importer import KeepImporter

router = APIRouter(
    prefix="/memos",
    tags=["memos"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

@router.post("/import/keep")
async def import_keep_notes(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Import Google Keep notes from a Takeout ZIP file.
    """
    import_limiter.check(current_user.id)

    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    settings = get_settings()
    max_bytes = settings.MAX_IMPORT_MB * 1024 * 1024
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Archive too large (max {settings.MAX_IMPORT_MB}MB)",
        )

    try:
        result = await KeepImporter.import_takeout_zip(file, db, current_user.id)
        return {"message": "Import successful", "details": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during import")

@router.post("/capture", response_model=Memo)
async def capture_thought(
    text: str = Form(None),
    file: UploadFile = File(None),
    available_tags: str = Form("[]"), # JSON string of tags
    preferred_language: str = Form("en"), # fallback language for AI output ("en" | "zh")
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Capture a thought (Text, Audio, or Image) and process it via Gemini.
    """
    capture_limiter.check(current_user.id)

    try:
        parsed_tags = json.loads(available_tags)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse available_tags: {available_tags}. Defaulting to empty list.")
        parsed_tags = []

    return await MemoService.process_entry(db, text, file, parsed_tags, current_user.id, preferred_language)

@router.get("/", response_model=list[Memo])
def get_memos(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Retrieve all organized memos.
    """
    return MemoService.get_all_memos(db, current_user.id)

@router.patch("/{memo_id}/toggle-action/{action_index}")
def toggle_action_item(
    memo_id: str,
    action_index: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Toggle the completion status of an action item at the given index.
    Automatically adds/removes 'Completed' tag based on completion status.
    """
    return MemoService.toggle_action_item(db, memo_id, action_index, current_user.id)

@router.delete("/{memo_id}")
def delete_memo(
    memo_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Delete a memo by ID.
    """
    return MemoService.delete_memo(db, memo_id, current_user.id)

@router.put("/{memo_id}")
async def update_memo(
    memo_id: str,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Update a memo's content (summary, tags, action items).
    """
    return MemoService.update_memo(db, memo_id, updates, current_user.id)
