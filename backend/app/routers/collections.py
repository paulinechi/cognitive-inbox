from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from ..database import get_db
from ..models import Collection, CollectionModel

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/", response_model=List[Collection])
def get_collections(db: Session = Depends(get_db)):
    """Get all collections"""
    collections = db.query(CollectionModel).all()
    return collections


@router.post("/", response_model=Collection)
def create_collection(title: str, db: Session = Depends(get_db)):
    """Create a new custom collection"""
    # Check for duplicates
    existing = db.query(CollectionModel).filter(CollectionModel.title == title).first()
    if existing:
        raise HTTPException(status_code=400, detail="Collection already exists")
    
    collection = CollectionModel(
        id=str(uuid.uuid4()),
        title=title,
        type=title,
        is_custom=True,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(collection)
    db.commit()
    db.refresh(collection)
    
    return collection


@router.put("/{collection_id}", response_model=Collection)
def update_collection(collection_id: str, title: str, db: Session = Depends(get_db)):
    """Update a collection's title"""
    collection = db.query(CollectionModel).filter(CollectionModel.id == collection_id).first()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if not collection.is_custom:
        raise HTTPException(status_code=400, detail="Cannot edit default collections")
    
    # Check for duplicates
    existing = db.query(CollectionModel).filter(
        CollectionModel.title == title,
        CollectionModel.id != collection_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Collection name already exists")
    
    collection.title = title
    collection.type = title
    db.commit()
    db.refresh(collection)
    
    return collection


@router.delete("/{collection_id}")
def delete_collection(collection_id: str, db: Session = Depends(get_db)):
    """Delete a custom collection"""
    collection = db.query(CollectionModel).filter(CollectionModel.id == collection_id).first()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if not collection.is_custom:
        raise HTTPException(status_code=400, detail="Cannot delete default collections")
    
    db.delete(collection)
    db.commit()
    
    return {"message": "Collection deleted successfully"}
