from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import AuditLogResponse
from app.services.audit_logger import load_audit_logs

router = APIRouter(tags=["audit"])


@router.get("/audit/logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[AuditLogResponse]:
    return [AuditLogResponse(**entry.__dict__) for entry in load_audit_logs(db, current_user.id)]
