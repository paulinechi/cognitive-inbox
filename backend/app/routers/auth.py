import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..config import get_settings
from ..database import get_db
from ..models import CollectionModel, TokenResponse, UserCredentials, UserModel, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)


def seed_default_collections(db: Session, user_id: str) -> None:
    settings = get_settings()
    for title in settings.DEFAULT_COLLECTIONS:
        db.add(
            CollectionModel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=title,
                type=title,
                is_custom=False,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        )


@router.post("/register", response_model=TokenResponse)
def register(credentials: UserCredentials, db: Session = Depends(get_db)):
    email = credentials.email.strip().lower()
    existing = db.query(UserModel).filter(UserModel.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = UserModel(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(credentials.password),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    seed_default_collections(db, user.id)
    db.commit()
    db.refresh(user)

    logger.info(f"AUTH - Registered new user {user.id}")
    return TokenResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserCredentials, db: Session = Depends(get_db)):
    email = credentials.email.strip().lower()
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: UserModel = Depends(get_current_user)):
    return current_user
