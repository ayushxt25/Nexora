from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import RecommendationResponse, RecommendationTrainingDataResponse
from app.services.ranking_data_service import build_recommendation_training_data
from app.services.recommendation_impression_service import log_recommendation_impressions
from app.services.recommendation_service import generate_recommendations

router = APIRouter(tags=["recommendations"])


def _serialize_recommendations(
    db: Session,
    user_id: int,
    recommendations,
) -> List[RecommendationResponse]:
    try:
        log_recommendation_impressions(db, user_id, recommendations)
    except Exception:
        db.rollback()

    return [RecommendationResponse(**recommendation.__dict__) for recommendation in recommendations]


@router.get("/recommendations", response_model=List[RecommendationResponse])
def list_recommendations(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    recommendations = generate_recommendations(db, current_user.id)
    return _serialize_recommendations(db, current_user.id, recommendations)


@router.get("/recommendations/next-best-actions", response_model=List[RecommendationResponse])
def next_best_actions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    recommendations = generate_recommendations(db, current_user.id)[:5]
    return _serialize_recommendations(db, current_user.id, recommendations)


@router.get("/recommendations/training-data", response_model=List[RecommendationTrainingDataResponse])
def recommendation_training_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationTrainingDataResponse]:
    return [
        RecommendationTrainingDataResponse(**row.__dict__)
        for row in build_recommendation_training_data(db, current_user.id)
    ]
