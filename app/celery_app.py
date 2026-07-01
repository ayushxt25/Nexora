from typing import Any

from app.config import (
    get_celery_broker_url,
    get_celery_enabled,
    get_celery_result_backend,
)

try:
    from celery import Celery
except Exception:  # pragma: no cover - depends on optional install
    Celery = None  # type: ignore[assignment]


def get_celery_app() -> Any | None:
    if not get_celery_enabled() or Celery is None:
        return None

    app = Celery(
        "networking_assistant",
        broker=get_celery_broker_url(),
        backend=get_celery_result_backend(),
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
    )
    return app


celery_app = get_celery_app()
