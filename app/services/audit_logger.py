import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import AuditLog


def log_audit_event(
    event_type: str,
    status: str,
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    message: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    db: Optional[Session] = None,
) -> None:
    own_session = db is None
    session = db or SessionLocal()
    try:
        entry = AuditLog(
            user_id=user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            status=status,
            message=message,
            metadata_json=json.dumps(metadata) if metadata is not None else None,
        )
        session.add(entry)
        session.commit()
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    finally:
        if own_session:
            session.close()


def load_audit_logs(db: Session, user_id: int, limit: int = 50) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(limit)
        .all()
    )
