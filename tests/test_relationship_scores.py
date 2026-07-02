from datetime import datetime, timedelta, timezone


def test_relationship_scores_empty_state(client, auth_headers):
    response = client.get("/relationships/scores", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["scores"] == []


def test_relationship_scores_normalization_and_ordering(client, auth_headers):
    strong = client.post(
        "/contacts",
        json={"name": "Strong", "company": "Orbit", "role": "Founder", "tags": ["ai"], "relationship_strength": 5},
        headers=auth_headers,
    ).json()
    weak = client.post(
        "/contacts",
        json={"name": "Weak", "company": "Solo", "role": "Advisor", "tags": ["health"], "relationship_strength": 1},
        headers=auth_headers,
    ).json()
    client.post(
        "/interactions",
        json={"contact_id": strong["id"], "interaction_type": "coffee", "notes": "Met recently"},
        headers=auth_headers,
    )
    client.post(
        "/interactions",
        json={"contact_id": strong["id"], "interaction_type": "email", "notes": "Followed up"},
        headers=auth_headers,
    )

    response = client.get("/relationships/scores", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()["scores"]
    assert body[0]["name"] == "Strong"
    assert 0.0 <= body[0]["score"] <= 100.0
    assert 0.0 <= body[1]["score"] <= 100.0


def test_relationship_scores_explainability_and_single_contact_filter(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Explained", "company": "North", "role": "Founder", "tags": ["climate"], "relationship_strength": 4},
        headers=auth_headers,
    ).json()

    response = client.get(f"/relationships/scores?contact_id={contact['id']}", headers=auth_headers)
    assert response.status_code == 200
    scores = response.json()["scores"]
    assert len(scores) == 1
    assert set(scores[0]["factors"].keys()) == {
        "interaction_score",
        "recency_score",
        "graph_score",
        "recommendation_score",
        "interest_overlap_score",
    }


def test_relationship_scores_risk_and_strength_classification(client, auth_headers):
    strong = client.post(
        "/contacts",
        json={"name": "Strategic", "company": "Orbit", "role": "Founder", "tags": ["ai"], "relationship_strength": 5},
        headers=auth_headers,
    ).json()
    weak = client.post(
        "/contacts",
        json={"name": "At Risk", "company": "Quiet", "role": "Advisor", "tags": ["ops"], "relationship_strength": 1},
        headers=auth_headers,
    ).json()
    client.post(
        "/interactions",
        json={"contact_id": strong["id"], "interaction_type": "coffee", "notes": "Great relationship"},
        headers=auth_headers,
    )
    client.post(
        "/interactions",
        json={"contact_id": strong["id"], "interaction_type": "email", "notes": "Helpful follow-up"},
        headers=auth_headers,
    )
    client.post(
        "/follow-ups",
        json={
            "contact_id": strong["id"],
            "title": "Completed intro",
            "status": "done",
            "due_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
        headers=auth_headers,
    )
    client.post(
        "/follow-ups",
        json={
            "contact_id": weak["id"],
            "title": "Missed follow-up",
            "status": "pending",
            "due_date": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
        },
        headers=auth_headers,
    )

    response = client.get("/relationships/scores", headers=auth_headers)
    body = {item["name"]: item for item in response.json()["scores"]}
    assert body["Strategic"]["relationship_strength"] in {"strong", "strategic"}
    assert body["Strategic"]["relationship_risk"] == "low"
    assert body["At Risk"]["relationship_strength"] == "weak"
    assert body["At Risk"]["relationship_risk"] == "high"


def test_relationship_scores_user_isolation(client):
    client.post("/auth/register", json={"username": "score_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "score_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    client.post(
        "/contacts",
        json={"name": "Private Score", "company": "Hidden", "role": "CEO", "relationship_strength": 5},
        headers=headers_a,
    )

    client.post("/auth/register", json={"username": "score_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "score_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    response = client.get("/relationships/scores", headers=headers_b)
    assert response.status_code == 200
    assert response.json()["scores"] == []
