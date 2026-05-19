from app.database import Base, SessionLocal, engine
from app.models import User
from app.schema_bootstrap import bootstrap_phase2a_schema
from app.security import hash_password
from app.services.settings_service import get_settings


def main() -> None:
    bootstrap_phase2a_schema(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        get_settings(db)
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(User(username="admin", hashed_password=hash_password("admin123"), role="admin"))
            db.commit()
    finally:
        db.close()
    print("Database initialized successfully.")


if __name__ == "__main__":
    main()
