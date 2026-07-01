import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.config import (
    get_ml_ranker_blend_weight,
    get_ml_ranker_enabled,
    get_ml_ranker_min_labeled_rows,
    get_ml_ranker_model_dir,
)
from app.services.audit_logger import log_audit_event
from app.services.ranking_data_service import build_recommendation_training_data
from app.services.ranking_feature_service import extract_ranker_features

MAX_ML_ADJUSTMENT = 6.0


@dataclass
class LocalRankerModel:
    weights: list[float]
    bias: float
    labeled_rows: int


@dataclass
class RankerStatus:
    enabled: bool
    model_available: bool
    trained: bool
    labeled_rows: int
    min_labeled_rows: int


@dataclass
class TrainRankerResult:
    status: str
    trained: bool
    labeled_rows: int
    min_labeled_rows: int


def _sigmoid(value: float) -> float:
    if value > 20:
        return 1.0
    if value < -20:
        return 0.0
    return 1.0 / (1.0 + pow(2.718281828459045, -value))


def _model_path_for_user(user_id: int) -> Path:
    model_dir = get_ml_ranker_model_dir()
    model_dir.mkdir(parents=True, exist_ok=True)
    return model_dir / f"recommendation_ranker_user_{user_id}.json"


def _load_model(user_id: int) -> Optional[LocalRankerModel]:
    path = _model_path_for_user(user_id)
    if not path.exists():
        return None
    payload = json.loads(path.read_text())
    return LocalRankerModel(**payload)


def _save_model(user_id: int, model: LocalRankerModel) -> None:
    path = _model_path_for_user(user_id)
    path.write_text(json.dumps(asdict(model)))


def get_ranker_status(db: Session, user_id: int) -> RankerStatus:
    labeled_rows = len([row for row in build_recommendation_training_data(db, user_id) if row.label is not None])
    model = _load_model(user_id)
    return RankerStatus(
        enabled=get_ml_ranker_enabled(),
        model_available=model is not None,
        trained=model is not None,
        labeled_rows=labeled_rows,
        min_labeled_rows=get_ml_ranker_min_labeled_rows(),
    )


def train_ranker(db: Session, user_id: int) -> TrainRankerResult:
    log_audit_event(
        event_type="ml_ranker_training",
        status="attempted",
        user_id=user_id,
        entity_type="recommendation_ranker",
        message="Ranker training started",
        db=db,
    )
    rows = [row for row in build_recommendation_training_data(db, user_id) if row.label is not None]
    min_rows = get_ml_ranker_min_labeled_rows()
    if len(rows) < min_rows:
        log_audit_event(
            event_type="ml_ranker_training",
            status="failed",
            user_id=user_id,
            entity_type="recommendation_ranker",
            message="Insufficient labeled rows for training",
            metadata={"labeled_rows": len(rows), "min_labeled_rows": min_rows},
            db=db,
        )
        return TrainRankerResult(
            status="insufficient_data",
            trained=False,
            labeled_rows=len(rows),
            min_labeled_rows=min_rows,
        )

    positives = []
    negatives = []
    for row in rows:
        features = extract_ranker_features(
            recommendation_type=row.recommendation_type,
            base_priority_score=row.priority_score,
            has_contact=row.has_contact,
            has_event=row.has_event,
            has_follow_up=row.has_follow_up,
            created_at=row.created_at,
            feedback_label=row.label,
        ).to_vector()
        if row.label == 1:
            positives.append(features)
        else:
            negatives.append(features)

    if not positives or not negatives:
        log_audit_event(
            event_type="ml_ranker_training",
            status="failed",
            user_id=user_id,
            entity_type="recommendation_ranker",
            message="Insufficient label variety for training",
            metadata={"labeled_rows": len(rows)},
            db=db,
        )
        return TrainRankerResult(
            status="insufficient_label_variety",
            trained=False,
            labeled_rows=len(rows),
            min_labeled_rows=min_rows,
        )

    pos_mean = [sum(values) / len(values) for values in zip(*positives)]
    neg_mean = [sum(values) / len(values) for values in zip(*negatives)]
    weights = [pos - neg for pos, neg in zip(pos_mean, neg_mean)]
    midpoint = [(pos + neg) / 2 for pos, neg in zip(pos_mean, neg_mean)]
    bias = -sum(weight * value for weight, value in zip(weights, midpoint))

    _save_model(user_id, LocalRankerModel(weights=weights, bias=bias, labeled_rows=len(rows)))
    log_audit_event(
        event_type="ml_ranker_training",
        status="completed",
        user_id=user_id,
        entity_type="recommendation_ranker",
        message="Ranker training completed",
        metadata={"labeled_rows": len(rows)},
        db=db,
    )
    return TrainRankerResult(
        status="trained",
        trained=True,
        labeled_rows=len(rows),
        min_labeled_rows=min_rows,
    )


def score_recommendation_with_ranker(
    user_id: int,
    recommendation_type: str,
    base_priority_score: float,
    has_contact: bool,
    has_event: bool,
    has_follow_up: bool,
    created_at,
) -> tuple[float, Optional[str]]:
    if not get_ml_ranker_enabled():
        return base_priority_score, None

    model = _load_model(user_id)
    if model is None:
        return base_priority_score, None

    features = extract_ranker_features(
        recommendation_type=recommendation_type,
        base_priority_score=base_priority_score,
        has_contact=has_contact,
        has_event=has_event,
        has_follow_up=has_follow_up,
        created_at=created_at,
    ).to_vector()
    raw_score = sum(weight * value for weight, value in zip(model.weights, features)) + model.bias
    probability = _sigmoid(raw_score)
    adjustment = ((probability - 0.5) * 2.0) * MAX_ML_ADJUSTMENT * get_ml_ranker_blend_weight()
    blended_score = base_priority_score + adjustment
    return blended_score, f"ML ranker adjusted score by {adjustment:.2f} from learned feedback patterns."
