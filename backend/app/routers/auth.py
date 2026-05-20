from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models import User
from app.security import create_access_token, create_refresh_token, decode_token, get_current_user
from app.schema import ChangePasswordRequest, TokenResponse, UserLogin
from app.services.auth_service import change_password, login_user


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return login_user(db, payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    user = db.query(User).filter(User.username == payload.sub).first()
    return TokenResponse(
        access_token=create_access_token(payload.sub, payload.role),
        refresh_token=create_refresh_token(payload.sub, payload.role),
        role=payload.role,
        username=payload.sub,
        must_change_password=user.must_change_password if user else False,
    )


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    employee = current_user.employee
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "must_change_password": current_user.must_change_password,
        "employee": {
            "id": employee.id,
            "full_name": employee.full_name,
            "department": employee.department,
            "position": employee.position,
            "email": employee.email,
            "phone": employee.phone,
            "telegram_username": employee.telegram_username,
            "telegram_chat_id": employee.telegram_chat_id,
            "telegram_notifications_enabled": employee.telegram_notifications_enabled,
            "hire_date": employee.hire_date,
        }
        if employee
        else None,
    }


@router.post("/change-password", response_model=TokenResponse)
def change_password_route(payload: ChangePasswordRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return change_password(db, user=current_user, current_password=payload.current_password, new_password=payload.new_password)
