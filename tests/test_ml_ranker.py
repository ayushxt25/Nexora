from datetime import datetime, timedelta, timezone

from app.services.ranking_feature_service import extract_ranker_features


def test_feature_extraction():
    features = extract_ranker_features(
        recommendation_type="strengthen_high_value_contact",
        base_priority_score=82.5,
        has_contact=True,
        has_event=False,
        has_follow_up=True,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        feedback_label=1,
    )
    assert features.base_priority_score == 82.5
    assert features.has_contact == 1.0
    assert features.has_event == 0.0
    assert features.has_follow_up == 1.0
    assert features.impression_age_hours >= 2.0
    assert len(features.to_vector()) == 6


def test_insufficient_data_fallback(client, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_enabled", lambda: True)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_model_dir", lambda: tmp_path)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_min_labeled_rows", lambda: 3)

    response = client.post("/recommendations/train-ranker", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["trained"] is False
    assert response.json()["status"] == "insufficient_data"


def test_training_with_labeled_data_and_ranker_status(client, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_enabled", lambda: True)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_model_dir", lambda: tmp_path)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_min_labeled_rows", lambda: 2)

    contact = client.post(
        "/contacts",
        json={"name": "Asha", "company": "Orbit", "role": "Founder", "relationship_strength": 5},
        headers=admin_headers,
    ).json()
    client.post(
        "/events",
        json={
            "title": "Mixer",
            "event_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
        headers=admin_headers,
    )

    recommendations = client.get("/recommendations", headers=admin_headers).json()
    strong = next(
        item
        for item in recommendations
        if item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact["id"]
    )
    event = next(item for item in recommendations if item["recommendation_type"] == "prepare_for_upcoming_event")

    client.post(
        "/feedback",
        json={
            "suggestion": strong["title"],
            "category": "accepted",
            "target_type": "recommendation",
            "target_id": strong["recommendation_id"],
        },
        headers=admin_headers,
    )
    client.post(
        "/feedback",
        json={
            "suggestion": event["title"],
            "category": "dismissed",
            "target_type": "recommendation",
            "target_id": event["recommendation_id"],
        },
        headers=admin_headers,
    )

    train_response = client.post("/recommendations/train-ranker", headers=admin_headers)
    assert train_response.status_code == 200
    assert train_response.json()["trained"] is True

    status_response = client.get("/recommendations/ranker-status", headers=admin_headers)
    assert status_response.status_code == 200
    status = status_response.json()
    assert status["enabled"] is True
    assert status["trained"] is True
    assert status["model_available"] is True


def test_scoring_fallback_when_model_missing(client, auth_headers, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_enabled", lambda: True)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_model_dir", lambda: tmp_path)

    client.post(
        "/contacts",
        json={"name": "Fallback", "company": "Nova", "role": "Founder", "relationship_strength": 5},
        headers=auth_headers,
    )

    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
    assert all("ML ranker adjusted" not in item["reason"] for item in response.json())


def test_ranker_user_isolation(client, monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_USERNAMES", "rank_a,rank_b")
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_enabled", lambda: True)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_model_dir", lambda: tmp_path)
    monkeypatch.setattr("app.services.ml_ranker_service.get_ml_ranker_min_labeled_rows", lambda: 2)

    client.post("/auth/register", json={"username": "rank_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "rank_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    contact_a = client.post(
        "/contacts",
        json={"name": "Alpha", "company": "Scope", "role": "Founder", "relationship_strength": 5},
        headers=headers_a,
    ).json()
    client.post(
        "/events",
        json={
            "title": "Alpha Event",
            "event_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
        headers=headers_a,
    )
    recs_a = client.get("/recommendations", headers=headers_a).json()
    strong_a = next(
        item
        for item in recs_a
        if item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact_a["id"]
    )
    event_a = next(item for item in recs_a if item["recommendation_type"] == "prepare_for_upcoming_event")
    client.post(
        "/feedback",
        json={
            "suggestion": strong_a["title"],
            "category": "accepted",
            "target_type": "recommendation",
            "target_id": strong_a["recommendation_id"],
        },
        headers=headers_a,
    )
    client.post(
        "/feedback",
        json={
            "suggestion": event_a["title"],
            "category": "dismissed",
            "target_type": "recommendation",
            "target_id": event_a["recommendation_id"],
        },
        headers=headers_a,
    )
    client.post("/recommendations/train-ranker", headers=headers_a)

    client.post("/auth/register", json={"username": "rank_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "rank_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    status_b = client.get("/recommendations/ranker-status", headers=headers_b)
    assert status_b.status_code == 200
    assert status_b.json()["trained"] is False
