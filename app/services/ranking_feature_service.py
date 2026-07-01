import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_datetime(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _encode_recommendation_type(value: str) -> float:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    integer = int.from_bytes(digest[:4], "big")
    return integer / 4294967295


@dataclass
class RankerFeatures:
    base_priority_score: float
    recommendation_type_signal: float
    has_contact: float
    has_event: float
    has_follow_up: float
    impression_age_hours: float
    feedback_label: Optional[int]

    def to_vector(self) -> list[float]:
        return [
            self.base_priority_score,
            self.recommendation_type_signal,
            self.has_contact,
            self.has_event,
            self.has_follow_up,
            self.impression_age_hours,
        ]


def extract_ranker_features(
    recommendation_type: str,
    base_priority_score: float,
    has_contact: bool,
    has_event: bool,
    has_follow_up: bool,
    created_at: datetime,
    feedback_label: Optional[int] = None,
    now: Optional[datetime] = None,
) -> RankerFeatures:
    current_time = _normalize_datetime(now or _utcnow())
    created_time = _normalize_datetime(created_at)
    age_hours = max(0.0, (current_time - created_time).total_seconds() / 3600)

    return RankerFeatures(
        base_priority_score=base_priority_score,
        recommendation_type_signal=_encode_recommendation_type(recommendation_type),
        has_contact=1.0 if has_contact else 0.0,
        has_event=1.0 if has_event else 0.0,
        has_follow_up=1.0 if has_follow_up else 0.0,
        impression_age_hours=age_hours,
        feedback_label=feedback_label,
    )
