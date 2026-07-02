from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import RelationshipScoreListResponse
from app.services.relationship_scoring_service import get_relationship_scores

router = APIRouter(tags=["relationships"])


@router.get("/relationships/scores", response_model=RelationshipScoreListResponse)
def relationship_scores(
    request: Request,
    contact_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RelationshipScoreListResponse:
    scores = get_relationship_scores(db, current_user.id, contact_id=contact_id)
    return RelationshipScoreListResponse(
        scores=[
            {
                "contact_id": item.contact_id,
                "name": item.name,
                "score": item.score,
                "relationship_strength": item.relationship_strength,
                "relationship_risk": item.relationship_risk,
                "factors": item.factors.__dict__,
            }
            for item in scores.scores
        ],
        created_at=scores.created_at,
    )
