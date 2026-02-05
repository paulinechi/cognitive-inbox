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
    COMPLETED = "Completed"
    OTHER = "Other"
    
    @classmethod
    def from_string(cls, value: str):
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        return cls.OTHER

class MemoModel(Base):
    __tablename__ = "memos"

    id = Column(String, primary_key=True, index=True)
    original_input = Column(String)
    extracted_text = Column(String, nullable=True)
    summary = Column(String)
    memo_types = Column(String)  # Stored as JSON list
    original_memo_type = Column(String, nullable=True)  # NEW: Store original type before completion
    action_items = Column(String, nullable=True)  # JSON list
    completed_action_items = Column(String, nullable=True, default="[]")  # NEW: JSON list of completed indices
    tags = Column(String, nullable=True)  # JSON list
    emotional_tone = Column(String, nullable=True)
    confidence_score = Column(Float, default=0.0)
    created_at = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    media_type = Column(String, nullable=True)
    media_uri = Column(String, nullable=True)

class CollectionModel(Base):
    __tablename__ = "collections"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    is_custom = Column(Boolean, default=False)
    created_at = Column(String)


# Pydantic models
class MemoInput(BaseModel):
    text: Optional[str] = None
    source: str = "text"

class MemoProcessed(BaseModel):
    original_input: str
    extracted_text: str
    memo_types: List[str]  # Allow any string for config-driven types
    summary: str
    action_items: List[str] = []
    tags: List[str] = []
    emotional_tone: Optional[str] = None
    confidence_score: float = 0.0

class Memo(MemoProcessed):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    archived: bool = False
    completed_action_items: List[int] = []

    class Config:
        from_attributes = True


class Collection(BaseModel):
    id: str
    title: str
    type: str
    is_custom: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
