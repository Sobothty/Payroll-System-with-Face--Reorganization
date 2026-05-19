import json

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def record_audit(
    db: Session,
    *,
    action: str,
    table_name: str,
    record_id: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
    actor: User | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=actor.id if actor else None,
        action=action,
        table_name=table_name,
        record_id=str(record_id),
        old_value=json.dumps(old_value, default=str) if old_value is not None else None,
        new_value=json.dumps(new_value, default=str) if new_value is not None else None,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
