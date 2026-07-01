from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import (
    RankerStatusResponse,
    RankerTrainResponse,
    RecommendationResponse,
    RecommendationTrainingDataResponse,
)
from app.services.audit_logger import log_audit_event
from app.services.ml_ranker_service import get_ranker_status, train_ranker
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
    log_audit_event(
        event_type="recommendation_generation",
        status="completed",
        user_id=current_user.id,
        entity_type="recommendation",
        message="Recommendations generated",
        metadata={"count": len(recommendations)},
        db=db,
    )
    return _serialize_recommendations(db, current_user.id, recommendations)


@router.get("/recommendations/next-best-actions", response_model=List[RecommendationResponse])
def next_best_actions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    recommendations = generate_recommendations(db, current_user.id)[:5]
    log_audit_event(
        event_type="recommendation_generation",
        status="completed",
        user_id=current_user.id,
        entity_type="recommendation",
        message="Next best actions generated",
        metadata={"count": len(recommendations)},
        db=db,
    )
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


@router.post("/recommendations/train-ranker", response_model=RankerTrainResponse)
def train_recommendation_ranker(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RankerTrainResponse:
    result = train_ranker(db, current_user.id)
    return RankerTrainResponse(**result.__dict__)


@router.get("/recommendations/ranker-status", response_model=RankerStatusResponse)
def recommendation_ranker_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RankerStatusResponse:
    status = get_ranker_status(db, current_user.id)
    return RankerStatusResponse(**status.__dict__)
