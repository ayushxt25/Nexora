from datetime import datetime, timedelta, timezone

from app.db_models import ActionLifecycleState, FollowUp, User
from app.services.action_lifecycle_service import get_lifecycle_state, upsert_lifecycle_state
from app.services.feedback_logger import log_feedback
from app.services.recommendation_service import build_recommendation_id


def test_lifecycle_row_creation_for_recommendation(db_session):
    user = User(username="lifecycle_rec", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    recommendation_id = build_recommendation_id(
        user.id,
        "strengthen_high_value_contact",
        11,
        None,
        None,
    )
    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        recommendation_id,
        entity_type="strengthen_high_value_contact",
        status="accepted",
    )

    assert state.entity_kind == "recommendation"
    assert state.entity_id == recommendation_id
    assert state.status == "accepted"
    assert state.accepted_at is not None


def test_lifecycle_row_creation_for_opportunity(db_session):
    user = User(username="lifecycle_opp", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "opportunity",
        "opp-123",
        entity_type="prepare_for_upcoming_event",
        status="dismissed",
    )

    assert state.entity_kind == "opportunity"
    assert state.entity_id == "opp-123"
    assert state.status == "dismissed"
    assert state.dismissed_at is not None


def test_repeated_accept_dismiss_updates_are_idempotent(db_session):
    user = User(username="lifecycle_idempotent", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        "rec-1",
        entity_type="follow_up_with_contact",
        status="accepted",
    )
    accepted_at = state.accepted_at

    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        "rec-1",
        entity_type="follow_up_with_contact",
        status="accepted",
    )
    assert state.accepted_at == accepted_at

    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        "rec-1",
        entity_type="follow_up_with_contact",
        status="dismissed",
    )
    dismissed_at = state.dismissed_at

    state = upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        "rec-1",
        entity_type="follow_up_with_contact",
        status="dismissed",
    )
    assert state.dismissed_at == dismissed_at

    rows = (
        db_session.query(ActionLifecycleState)
        .filter(ActionLifecycleState.user_id == user.id, ActionLifecycleState.entity_id == "rec-1")
        .all()
    )
    assert len(rows) == 1


def test_lifecycle_state_is_user_isolated(db_session):
    user_a = User(username="lifecycle_a", hashed_password="hashed")
    user_b = User(username="lifecycle_b", hashed_password="hashed")
    db_session.add_all([user_a, user_b])
    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    upsert_lifecycle_state(
        db_session,
        user_a.id,
        "recommendation",
        "shared-id",
        entity_type="strengthen_high_value_contact",
        status="accepted",
    )

    assert get_lifecycle_state(db_session, user_b.id, "recommendation", "shared-id") is None


def test_feedback_based_tuning_remains_independent_of_lifecycle_state(db_session):
    user = User(username="lifecycle_feedback", hashed_password="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    recommendation_id = build_recommendation_id(
        user.id,
        "strengthen_high_value_contact",
        7,
        None,
        None,
    )
    upsert_lifecycle_state(
        db_session,
        user.id,
        "recommendation",
        recommendation_id,
        entity_type="strengthen_high_value_contact",
        status="accepted",
    )
    log_feedback(
        db_session,
        user_id=user.id,
        suggestion="Helpful signal",
        category="helpful",
        target_type="recommendation",
        target_id=recommendation_id,
    )

    state = get_lifecycle_state(db_session, user.id, "recommendation", recommendation_id)
    feedback = db_session.query(ActionLifecycleState).filter(ActionLifecycleState.id == state.id).one()

    assert feedback.status == "accepted"


def test_recommendation_conversion_creates_follow_up_and_lifecycle_state(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Convert Rec", "company": "Orbit", "role": "Founder", "relationship_strength": 5},
        headers=auth_headers,
    ).json()
    recommendation = next(
        item
        for item in client.get("/recommendations", headers=auth_headers).json()
        if item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact["id"]
    )

    response = client.post(
        "/action-lifecycle/convert-to-follow-up",
        json={
            "entity_kind": "recommendation",
            "entity_id": recommendation["recommendation_id"],
            "entity_type": recommendation["recommendation_type"],
            "contact_id": contact["id"],
            "title": "Prepare follow-up",
            "description": "Reach back out this week",
            "status": "pending",
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["converted_follow_up_id"] == body["follow_up"]["id"]
    assert body["lifecycle_state"]["status"] == "converted_to_follow_up"
    assert body["lifecycle_state"]["converted_follow_up_id"] == body["follow_up"]["id"]
    assert body["follow_up"]["contact_id"] == contact["id"]


def test_opportunity_conversion_creates_follow_up_and_lifecycle_state(client, auth_headers):
    contact = client.post(
        "/contacts",
        json={"name": "Convert Opp", "company": "Quiet", "role": "Advisor", "relationship_strength": 2},
        headers=auth_headers,
    ).json()
    opportunity = next(
        item
        for item in client.get("/opportunities", headers=auth_headers).json()
        if item["opportunity_type"] == "reconnect_with_cold_contact"
        and item["related_contact_id"] == contact["id"]
    )

    response = client.post(
        "/action-lifecycle/convert-to-follow-up",
        json={
            "entity_kind": "opportunity",
            "entity_id": opportunity["opportunity_id"],
            "entity_type": opportunity["opportunity_type"],
            "contact_id": contact["id"],
            "title": "Reconnect next week",
            "status": "pending",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["follow_up"]["id"] == body["converted_follow_up_id"]
    assert body["lifecycle_state"]["entity_kind"] == "opportunity"
    assert body["lifecycle_state"]["status"] == "converted_to_follow_up"


def test_repeated_conversion_does_not_create_duplicate_follow_ups(client, auth_headers, db_session):
    contact = client.post(
        "/contacts",
        json={"name": "Convert Once", "company": "North", "role": "Founder", "relationship_strength": 5},
        headers=auth_headers,
    ).json()
    recommendation = next(
        item
        for item in client.get("/recommendations", headers=auth_headers).json()
        if item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact["id"]
    )
    payload = {
        "entity_kind": "recommendation",
        "entity_id": recommendation["recommendation_id"],
        "entity_type": recommendation["recommendation_type"],
        "contact_id": contact["id"],
        "title": "Single conversion follow-up",
        "status": "pending",
    }

    first = client.post("/action-lifecycle/convert-to-follow-up", json=payload, headers=auth_headers)
    second = client.post("/action-lifecycle/convert-to-follow-up", json=payload, headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["follow_up"]["id"] == first.json()["follow_up"]["id"]

    follow_ups = db_session.query(FollowUp).filter(FollowUp.title == "Single conversion follow-up").all()
    assert len(follow_ups) == 1


def test_conversion_is_user_isolated(client):
    client.post("/auth/register", json={"username": "convert_a", "password": "passwordA123"})
    token_a = client.post(
        "/auth/login", json={"username": "convert_a", "password": "passwordA123"}
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    client.post("/auth/register", json={"username": "convert_b", "password": "passwordB123"})
    token_b = client.post(
        "/auth/login", json={"username": "convert_b", "password": "passwordB123"}
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    contact_a = client.post(
        "/contacts",
        json={"name": "Private Convert", "company": "Orbit", "role": "Founder", "relationship_strength": 5},
        headers=headers_a,
    ).json()
    recommendation_a = next(
        item
        for item in client.get("/recommendations", headers=headers_a).json()
        if item["recommendation_type"] == "strengthen_high_value_contact"
        and item["related_contact_id"] == contact_a["id"]
    )

    response = client.post(
        "/action-lifecycle/convert-to-follow-up",
        json={
            "entity_kind": "recommendation",
            "entity_id": recommendation_a["recommendation_id"],
            "entity_type": recommendation_a["recommendation_type"],
            "contact_id": contact_a["id"],
            "title": "Should fail",
            "status": "pending",
        },
        headers=headers_b,
    )

    assert response.status_code == 404


def test_invalid_lifecycle_inputs_are_rejected(client, auth_headers):
    invalid_kind = client.post(
        "/action-lifecycle/convert-to-follow-up",
        json={
            "entity_kind": "invalid",
            "entity_id": "abc",
            "title": "Bad request",
            "status": "pending",
        },
        headers=auth_headers,
    )
    assert invalid_kind.status_code == 422

    invalid_status = client.post(
        "/action-lifecycle",
        json={
            "entity_kind": "recommendation",
            "entity_id": "rec-invalid",
            "entity_type": "strengthen_high_value_contact",
            "status": "not-a-status",
        },
        headers=auth_headers,
    )
    assert invalid_status.status_code == 422
