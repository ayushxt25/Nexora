from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api_utils import pagination_limit
from app.database import get_db
from app.db_models import User
from app.dependencies import require_admin_user
from app.models import AdminFeedbackItemResponse, AdminFeedbackSummaryResponse
from app.services.feedback_logger import (
    VALID_CATEGORIES,
    VALID_TARGET_TYPES,
    load_feedback_admin,
    summarize_feedback_admin,
)

router = APIRouter(tags=["feedback-admin"])


@router.get("/admin/feedback/summary", response_model=AdminFeedbackSummaryResponse)
def get_admin_feedback_summary(
    request: Request,
    recent_limit: int = pagination_limit(default=10),
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AdminFeedbackSummaryResponse:
    summary = summarize_feedback_admin(db, recent_limit=recent_limit)
    return AdminFeedbackSummaryResponse(
        total_feedback_count=summary.total_feedback_count,
        counts_by_target_type=summary.counts_by_target_type,
        counts_by_category=summary.counts_by_category,
        helpful_signal_count=summary.helpful_signal_count,
        negative_signal_count=summary.negative_signal_count,
        app_experience_feedback_count=summary.app_experience_feedback_count,
        app_feedback_signal_counts=summary.app_feedback_signal_counts,
        recent_feedback_items=[
            AdminFeedbackItemResponse(**item.__dict__) for item in summary.recent_feedback_items
        ],
    )


@router.get("/admin/feedback", response_model=List[AdminFeedbackItemResponse])
def list_admin_feedback(
    request: Request,
    limit: int = pagination_limit(default=50),
    target_type: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> List[AdminFeedbackItemResponse]:
    if target_type is not None and target_type not in VALID_TARGET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"target_type must be one of {VALID_TARGET_TYPES}",
        )
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"category must be one of {VALID_CATEGORIES}",
        )

    return [
        AdminFeedbackItemResponse(**entry.__dict__)
        for entry in load_feedback_admin(db, limit=limit, target_type=target_type, category=category)
    ]
