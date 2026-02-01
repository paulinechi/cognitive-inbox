from datetime import datetime
from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from .database import Base
import json

class MemoType(str, Enum):
    BRAINSTORMING = "Brainstorming"
    TASK = "Task"
    WISHLIST = "Wishlist"
    COLLECTION = "Collection"
    DRAFT = "Draft"
    NOTE = "Note"
    REFLECTION = "Reflection"
    OTHER = "Other"

class MemoModel(Base):
    __tablename__ = "memos"

    id = Column(String, primary_key=True, index=True)
    original_input = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    memo_type = Column(String, default="Other")
    summary = Column(Text, nullable=True)
    action_items = Column(Text, default="[]")
    tags = Column(Text, default="[]")
    emotional_tone = Column(String, nullable=True)
    confidence_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    archived = Column(Boolean, default=False)

class MemoInput(BaseModel):
    text: Optional[str] = None
    source: str = "text"

class MemoProcessed(BaseModel):
    original_input: str
    extracted_text: str
    memo_type: MemoType
    summary: str
    action_items: List[str] = []
    tags: List[str] = []
    emotional_tone: Optional[str] = None
    confidence_score: float = 0.0

class Memo(MemoProcessed):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    archived: bool = False

    class Config:
        from_attributes = True
