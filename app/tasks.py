from typing import Any, Callable, Optional

from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database import SessionLocal
from app.services.analytics_service import get_analytics_summary
from app.services.recommendation_service import generate_recommendations
from app.services.semantic_memory_service import sync_user_memories


def _run_with_session(callback: Callable[[Session], Any], db: Optional[Session] = None) -> Any:
    if db is not None:
        return callback(db)

    session = SessionLocal()
    try:
        return callback(session)
    finally:
        session.close()


def sync_user_semantic_memory(user_id: int, db: Optional[Session] = None) -> int:
    documents = _run_with_session(lambda session: sync_user_memories(session, user_id), db=db)
    return len(documents)


def refresh_user_analytics(user_id: int, db: Optional[Session] = None) -> dict[str, Any]:
    summary = _run_with_session(lambda session: get_analytics_summary(session, user_id), db=db)
    return summary.__dict__


def refresh_user_recommendations(user_id: int, db: Optional[Session] = None) -> list[dict[str, Any]]:
    recommendations = _run_with_session(lambda session: generate_recommendations(session, user_id), db=db)
    return [recommendation.__dict__ for recommendation in recommendations]


if celery_app is not None:
    sync_user_semantic_memory_task = celery_app.task(name="app.tasks.sync_user_semantic_memory")(
        sync_user_semantic_memory
    )
    refresh_user_analytics_task = celery_app.task(name="app.tasks.refresh_user_analytics")(
        refresh_user_analytics
    )
    refresh_user_recommendations_task = celery_app.task(name="app.tasks.refresh_user_recommendations")(
        refresh_user_recommendations
    )
else:
    sync_user_semantic_memory_task = None
    refresh_user_analytics_task = None
    refresh_user_recommendations_task = None
