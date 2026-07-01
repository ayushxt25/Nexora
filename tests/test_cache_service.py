import json

from app.db_models import User
from app.services.analytics_service import get_analytics_summary
from app.services.cache_service import (
    NoOpCacheBackend,
    RedisCacheBackend,
    cache_key_for_user,
    get_cache_backend,
    invalidate_user_cache,
    reset_cache_backend,
)
from app.services.recommendation_service import generate_recommendations


class FakeRedisClient:
    def __init__(self):
        self.store = {}

    def ping(self):
        return True

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, ex=None):
        self.store[key] = value
        return True

    def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.store:
                del self.store[key]
                deleted += 1
        return deleted

    def scan_iter(self, match=None):
        prefix = (match or "").rstrip("*")
        for key in list(self.store.keys()):
            if key.startswith(prefix):
                yield key


def test_noop_cache_fallback_when_disabled(monkeypatch):
    reset_cache_backend()
    monkeypatch.setattr("app.services.cache_service.get_cache_enabled", lambda: False)
    backend = get_cache_backend()
    assert isinstance(backend, NoOpCacheBackend)
    assert backend.get("missing") is None


def test_cache_get_set_behavior_with_fake_redis(monkeypatch):
    reset_cache_backend()
    fake_client = FakeRedisClient()
    monkeypatch.setattr("app.services.cache_service.get_cache_enabled", lambda: True)
    monkeypatch.setattr("app.services.cache_service.build_cache_backend", lambda: RedisCacheBackend(fake_client))

    backend = get_cache_backend()
    assert backend.set("demo", {"value": 1}, 60) is True
    assert backend.get("demo") == {"value": 1}


def test_analytics_cache_usage(db_session, monkeypatch):
    reset_cache_backend()
    monkeypatch.setattr("app.services.cache_service.build_cache_backend", lambda: RedisCacheBackend(FakeRedisClient()))
    calls = {"count": 0}
    original = __import__("app.services.analytics_service", fromlist=["_compute_analytics_summary"])._compute_analytics_summary

    def wrapped(db, user_id):
        calls["count"] += 1
        return original(db, user_id)

    monkeypatch.setattr("app.services.analytics_service._compute_analytics_summary", wrapped)

    user = User(username="cache_analytics", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    first = get_analytics_summary(db_session, user.id)
    second = get_analytics_summary(db_session, user.id)
    assert first.total_contacts == second.total_contacts
    assert calls["count"] == 1


def test_recommendation_cache_usage(db_session, monkeypatch):
    reset_cache_backend()
    monkeypatch.setattr("app.services.cache_service.build_cache_backend", lambda: RedisCacheBackend(FakeRedisClient()))
    calls = {"count": 0}
    original = __import__("app.services.recommendation_service", fromlist=["_generate_recommendations_uncached"])._generate_recommendations_uncached

    def wrapped(db, user_id):
        calls["count"] += 1
        return original(db, user_id)

    monkeypatch.setattr("app.services.recommendation_service._generate_recommendations_uncached", wrapped)

    user = User(username="cache_recommendations", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    first = generate_recommendations(db_session, user.id)
    second = generate_recommendations(db_session, user.id)
    assert first == second
    assert calls["count"] == 1


def test_cache_invalidation_on_relationship_data_changes(client, auth_headers, monkeypatch):
    fake_client = FakeRedisClient()
    monkeypatch.setattr("app.services.cache_service.build_cache_backend", lambda: RedisCacheBackend(fake_client))
    reset_cache_backend()

    user_id = 1
    fake_client.set(cache_key_for_user(user_id, "analytics_summary"), json.dumps({"cached": True}), ex=60)
    response = client.post(
        "/contacts",
        json={"name": "Invalidate", "company": "Acme", "role": "Founder"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert fake_client.get(cache_key_for_user(user_id, "analytics_summary")) is None


def test_app_works_without_redis(client, auth_headers, monkeypatch):
    reset_cache_backend()
    monkeypatch.setattr("app.services.cache_service.get_cache_enabled", lambda: True)
    monkeypatch.setattr("app.services.cache_service.build_cache_backend", lambda: NoOpCacheBackend())

    analytics = client.get("/analytics/summary", headers=auth_headers)
    recommendations = client.get("/recommendations", headers=auth_headers)

    assert analytics.status_code == 200
    assert recommendations.status_code == 200
