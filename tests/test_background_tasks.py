import app.services.task_dispatcher as task_dispatcher

from app.db_models import Contact, FollowUp, User
from app.tasks import (
    refresh_user_analytics,
    refresh_user_recommendations,
    sync_user_semantic_memory,
)


def test_task_functions_run_synchronously(db_session):
    user = User(username="worker_user", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    contact = Contact(
        user_id=user.id,
        name="Leena",
        company="Orbit",
        role="Founder",
        notes="Interested in AI partnerships",
        relationship_strength=4,
    )
    db_session.add(contact)
    db_session.commit()
    db_session.refresh(contact)

    db_session.add(
        FollowUp(
            user_id=user.id,
            contact_id=contact.id,
            title="Send follow-up note",
            status="pending",
        )
    )
    db_session.commit()

    synced_count = sync_user_semantic_memory(user.id, db=db_session)
    analytics = refresh_user_analytics(user.id, db=db_session)
    recommendations = refresh_user_recommendations(user.id, db=db_session)

    assert synced_count >= 1
    assert analytics["total_contacts"] == 1
    assert isinstance(recommendations, list)


def test_dispatch_helper_fails_open_when_celery_disabled(monkeypatch):
    monkeypatch.setattr("app.services.task_dispatcher.get_celery_enabled", lambda: False)
    assert task_dispatcher.dispatch_optional_task("sync_user_semantic_memory", 1) is False


def test_dispatch_helper_fails_open_when_celery_unavailable(monkeypatch):
    class BrokenTask:
        def delay(self, *args, **kwargs):
            raise RuntimeError("broker unavailable")

    monkeypatch.setattr("app.services.task_dispatcher.get_celery_enabled", lambda: True)
    monkeypatch.setitem(task_dispatcher.TASK_REGISTRY, "sync_user_semantic_memory", BrokenTask())

    assert task_dispatcher.dispatch_optional_task("sync_user_semantic_memory", 1) is False
