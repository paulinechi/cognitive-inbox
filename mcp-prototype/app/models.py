from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MemoType(str, Enum):
    TASK = "Task"
    NOTE = "Note"
    OTHER = "Other"

class WorkflowStep(BaseModel):
    step: int
    description: str
    action_type: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None
    status: str = "pending"

class MemoProcessed(BaseModel):
    original_input: str
    extracted_text: str
    memo_type: MemoType
    summary: str
    action_items: List[str] = []
    next_steps: List[str] = []
    prioritization_suggestion: Optional[str] = None
    workflow: List[WorkflowStep] = []
    tags: List[str] = []
    emotional_tone: Optional[str] = None
    confidence_score: float = 0.0

class Memo(MemoProcessed):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
