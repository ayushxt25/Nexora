from datetime import datetime, timedelta, timezone


def test_recommendations_from_overdue_followups(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Mina", "company": "Orbit", "role": "Founder", "relationship_strength": 4},
        headers=auth_headers,
    ).json()

    client.post(
        "/follow-ups",
        json={
            "contact_id": contact["id"],
            "title": "Send intro",
            "status": "pending",
            "due_date": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        },
        headers=auth_headers,
    )

    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert any(item["recommendation_type"] == "complete_overdue_follow_up" for item in body)


def test_recommendations_from_cold_contacts(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Raj", "company": "Delta", "role": "Investor", "relationship_strength": 2},
        headers=auth_headers,
    ).json()

    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
    assert any(
        item["recommendation_type"] == "reconnect_with_cold_relationship"
        and item["related_contact_id"] == contact["id"]
        for item in response.json()
    )


def test_recommendations_using_user_goals_and_interests(client, auth_headers):
    client.put(
        "/profile",
        json={"goals": ["healthcare"], "interests": ["community"]},
        headers=auth_headers,
    )
    contact = client.post(
        "/contacts",
        json={
            "name": "Sara",
            "company": "MedAI",
            "role": "Founder",
            "notes": "Building healthcare AI tools",
            "relationship_strength": 4,
        },
        headers=auth_headers,
    ).json()

    response = client.get("/recommendations/next-best-actions", headers=auth_headers)
    assert response.status_code == 200
    assert any(
        item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact["id"]
        for item in response.json()
    )


def test_recommendations_empty_state(client, auth_headers):
    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_recommendations_user_isolation(client):
    client.post("/auth/register", json={"username": "rec_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "rec_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    client.post(
        "/contacts",
        json={"name": "Private", "company": "Secret", "role": "CEO", "relationship_strength": 5},
        headers=headers_a,
    )

    client.post("/auth/register", json={"username": "rec_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "rec_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    response = client.get("/recommendations", headers=headers_b)
    assert response.status_code == 200
    assert response.json() == []


def test_recommendations_priority_ordering(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Ava", "company": "North", "role": "Founder", "relationship_strength": 5},
        headers=auth_headers,
    ).json()
    client.post(
        "/follow-ups",
        json={
            "contact_id": contact["id"],
            "title": "Urgent follow-up",
            "status": "pending",
            "due_date": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        },
        headers=auth_headers,
    )

    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
    scores = [item["priority_score"] for item in response.json()]
    assert scores == sorted(scores, reverse=True)
