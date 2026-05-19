from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SettingsPayload
from app.security import require_role
from app.services.settings_service import get_settings


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def show(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    settings = get_settings(db)
    return {
        "company_name": settings.company_name,
        "logo_url": settings.logo_url,
        "address": settings.address,
        "currency": settings.currency,
        "hours_per_day": settings.hours_per_day,
        "days_per_week": settings.days_per_week,
        "overtime_multiplier": settings.overtime_multiplier,
        "income_tax_rate": settings.income_tax_rate,
        "insurance_rate": settings.insurance_rate,
        "pension_rate": settings.pension_rate,
        "annual_leave_days": settings.annual_leave_days,
        "sick_leave_days": settings.sick_leave_days,
        "unpaid_leave_allowed": settings.unpaid_leave_allowed,
        "pay_cycle": settings.pay_cycle,
        "confidence_threshold": settings.confidence_threshold,
        "kiosk_reset_timer": settings.kiosk_reset_timer,
    }


@router.put("")
def update(payload: SettingsPayload, db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    settings = get_settings(db)
    for field, value in payload.model_dump().items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return {"status": "success"}
