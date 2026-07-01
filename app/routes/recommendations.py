from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import RecommendationResponse
from app.services.recommendation_service import generate_recommendations

router = APIRouter(tags=["recommendations"])


@router.get("/recommendations", response_model=List[RecommendationResponse])
def list_recommendations(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    return [
        RecommendationResponse(**recommendation.__dict__)
        for recommendation in generate_recommendations(db, current_user.id)
    ]


@router.get("/recommendations/next-best-actions", response_model=List[RecommendationResponse])
def next_best_actions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    return [
        RecommendationResponse(**recommendation.__dict__)
        for recommendation in generate_recommendations(db, current_user.id)[:5]
    ]
