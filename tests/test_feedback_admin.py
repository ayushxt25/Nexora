def test_admin_can_access_feedback_summary_and_list(client, admin_headers):
    client.post(
        "/feedback",
        json={
            "suggestion": "Reconnect with Mina",
            "category": "helpful",
            "target_type": "recommendation",
            "target_id": "rec-1",
        },
        headers=admin_headers,
    )
    client.post(
        "/feedback",
        json={
            "suggestion": "App feedback: Bug",
            "category": "not_helpful",
            "target_type": "app_experience",
            "target_id": "/help",
            "notes": "Bug: dashboard card spacing feels off on mobile",
        },
        headers=admin_headers,
    )

    summary_response = client.get("/admin/feedback/summary", headers=admin_headers)
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_feedback_count"] >= 2
    assert summary["counts_by_target_type"]["recommendation"] >= 1
    assert summary["counts_by_target_type"]["app_experience"] >= 1
    assert summary["app_experience_feedback_count"] >= 1
    assert summary["app_feedback_signal_counts"]["bug"] >= 1
    assert len(summary["recent_feedback_items"]) >= 2
    assert "user_id" in summary["recent_feedback_items"][0]

    list_response = client.get(
        "/admin/feedback?target_type=app_experience&category=not_helpful&limit=10",
        headers=admin_headers,
    )
    assert list_response.status_code == 200
    body = list_response.json()
    assert len(body) == 1
    assert body[0]["target_type"] == "app_experience"
    assert body[0]["category"] == "not_helpful"
    assert body[0]["target_id"] == "/help"


def test_non_admin_gets_403_on_feedback_admin_endpoints(client, auth_headers):
    summary_response = client.get("/admin/feedback/summary", headers=auth_headers)
    assert summary_response.status_code == 403

    list_response = client.get("/admin/feedback", headers=auth_headers)
    assert list_response.status_code == 403


def test_feedback_admin_invalid_filters_are_rejected(client, admin_headers):
    invalid_target = client.get("/admin/feedback?target_type=unsupported", headers=admin_headers)
    assert invalid_target.status_code == 400

    invalid_category = client.get("/admin/feedback?category=confusing", headers=admin_headers)
    assert invalid_category.status_code == 400


def test_user_scoped_feedback_history_remains_scoped(client):
    client.post("/auth/register", json={"username": "feedback_hist_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "feedback_hist_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    client.post(
        "/feedback",
        json={
            "suggestion": "Private app feedback",
            "category": "helpful",
            "target_type": "app_experience",
            "target_id": "global",
        },
        headers=headers_a,
    )

    client.post("/auth/register", json={"username": "feedback_hist_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "feedback_hist_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    history_b = client.get("/feedback-history", headers=headers_b)
    assert history_b.status_code == 200
    assert history_b.json() == []
