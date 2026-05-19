from sqlalchemy.orm import Session

from app.models import SystemSetting


def get_settings(db: Session) -> SystemSetting:
    settings = db.query(SystemSetting).first()
    if settings:
        return settings

    settings = SystemSetting()
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings
