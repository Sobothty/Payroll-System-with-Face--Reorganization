from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import TokenResponse, UserLogin
from app.security import create_access_token, create_refresh_token, hash_password, verify_password


def login_user(db: Session, payload: UserLogin) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if user.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is locked")
    user.last_login = datetime.utcnow()
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.username, user.role),
        refresh_token=create_refresh_token(user.username, user.role),
        role=user.role,
        username=user.username,
        must_change_password=user.must_change_password,
    )


def change_password(db: Session, *, user: User, current_password: str, new_password: str) -> TokenResponse:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(new_password)
    user.must_change_password = False
    user.password_changed_at = datetime.utcnow()
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.username, user.role),
        refresh_token=create_refresh_token(user.username, user.role),
        role=user.role,
        username=user.username,
        must_change_password=False,
    )
