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

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(String)

class MemoModel(Base):
    __tablename__ = "memos"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
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
    html_content = Column(Text, nullable=True)  # Store Markdown-converted HTML content

class CollectionModel(Base):
    __tablename__ = "collections"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
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
    archived: bool = False
    completed_action_items: List[int] = []
    
    # Media
    media_uri: Optional[str] = None
    media_type: Optional[str] = None
    original_memo_type: Optional[str] = None
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

# Auth schemas
class UserCredentials(BaseModel):
    email: str = Field(..., min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=72)

class UserOut(BaseModel):
    id: str
    email: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
