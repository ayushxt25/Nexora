from app.db_models import User
from app.services.audit_logger import load_audit_logs, log_audit_event
from app.services.task_dispatcher import dispatch_optional_task


def test_audit_log_creation(db_session):
    user = User(username="audit_user", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    log_audit_event(
        event_type="generation_request",
        status="completed",
        user_id=user.id,
        entity_type="conversation",
        message="done",
        metadata={"count": 1},
        db=db_session,
    )

    logs = load_audit_logs(db_session, user.id)
    assert len(logs) == 1
    assert logs[0].event_type == "generation_request"
    assert logs[0].status == "completed"


def test_audit_log_fail_open(monkeypatch):
    class BrokenSession:
        def add(self, *args, **kwargs):
            raise RuntimeError("db unavailable")

        def commit(self):
            raise RuntimeError("db unavailable")

        def rollback(self):
            pass

        def close(self):
            pass

    monkeypatch.setattr("app.services.audit_logger.SessionLocal", lambda: BrokenSession())
    log_audit_event(event_type="test", status="failed", message="should not raise")


def test_audit_logs_endpoint_and_user_isolation(client):
    client.post("/auth/register", json={"username": "audit_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "audit_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    client.post(
        "/generate-conversation",
        json={"description": "AI summit", "interests": ["climate"]},
        headers=headers_a,
    )

    client.post("/auth/register", json={"username": "audit_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "audit_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    response_a = client.get("/audit/logs", headers=headers_a)
    response_b = client.get("/audit/logs", headers=headers_b)
    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert response_a.json()
    assert response_b.json() == []


def test_generation_creates_audit_log(client, auth_headers):
    response = client.post(
        "/generate-conversation",
        json={"description": "Healthcare dinner", "interests": ["ai"]},
        headers=auth_headers,
    )
    assert response.status_code == 200

    logs = client.get("/audit/logs", headers=auth_headers).json()
    assert any(log["event_type"] == "generation_request" for log in logs)


def test_recommendation_creates_audit_log(client, auth_headers):
    client.post(
        "/contacts",
        json={"name": "Reco", "company": "Orbit", "role": "Founder", "relationship_strength": 5},
        headers=auth_headers,
    )
    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200

    logs = client.get("/audit/logs", headers=auth_headers).json()
    assert any(log["event_type"] == "recommendation_generation" for log in logs)


def test_task_dispatch_creates_audit_log(db_session, monkeypatch):
    user = User(username="dispatch_audit", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    class FakeTask:
        def delay(self, *args, **kwargs):
            return None

    monkeypatch.setattr("app.services.task_dispatcher.get_celery_enabled", lambda: True)
    monkeypatch.setitem(
        __import__("app.services.task_dispatcher", fromlist=["TASK_REGISTRY"]).TASK_REGISTRY,
        "sync_user_semantic_memory",
        FakeTask(),
    )

    result = dispatch_optional_task(
        "sync_user_semantic_memory",
        user.id,
        user_id=user.id,
        db=db_session,
    )
    assert result is True
    logs = load_audit_logs(db_session, user.id)
    assert any(log.event_type == "background_task_dispatch" and log.status == "completed" for log in logs)
