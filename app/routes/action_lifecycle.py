from typing import Optional, Type

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import Contact, Event, FollowUp, User
from app.dependencies import get_current_user
from app.models import (
    ActionLifecycleConvertToFollowUpRequest,
    ActionLifecycleConvertToFollowUpResponse,
    ActionLifecycleMutationRequest,
    ActionLifecycleStateResponse,
    FollowUpResponse,
)
from app.services.action_lifecycle_service import get_lifecycle_state, upsert_lifecycle_state
from app.services.task_dispatcher import dispatch_user_refreshes

router = APIRouter(tags=["action-lifecycle"])


def _get_owned_or_404(db: Session, model: Type, object_id: int, user_id: int):
    instance = db.query(model).filter(model.id == object_id, model.user_id == user_id).first()
    if instance is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return instance


def _validate_optional_links(
    db: Session, user_id: int, contact_id: Optional[int], event_id: Optional[int]
) -> None:
    if contact_id is not None:
        _get_owned_or_404(db, Contact, contact_id, user_id)
    if event_id is not None:
        _get_owned_or_404(db, Event, event_id, user_id)


def _follow_up_response(follow_up: FollowUp) -> FollowUpResponse:
    return FollowUpResponse(
        id=follow_up.id,
        user_id=follow_up.user_id,
        contact_id=follow_up.contact_id,
        event_id=follow_up.event_id,
        title=follow_up.title,
        description=follow_up.description,
        due_date=follow_up.due_date,
        status=follow_up.status,
        created_at=follow_up.created_at,
        updated_at=follow_up.updated_at,
    )


def _dispatch_refreshes(db: Session, user_id: int) -> None:
    try:
        dispatch_user_refreshes(user_id, db=db)
    except TypeError:
        dispatch_user_refreshes(user_id)


@router.post("/action-lifecycle", response_model=ActionLifecycleStateResponse)
def mutate_action_lifecycle(
    request: Request,
    body: ActionLifecycleMutationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActionLifecycleStateResponse:
    try:
        state = upsert_lifecycle_state(
            db,
            current_user.id,
            body.entity_kind,
            body.entity_id,
            entity_type=body.entity_type or body.entity_kind,
            status=body.status,
            converted_follow_up_id=body.converted_follow_up_id,
            notes=body.notes,
            mark_seen=body.status == "new",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ActionLifecycleStateResponse.model_validate(state)


@router.post(
    "/action-lifecycle/convert-to-follow-up",
    response_model=ActionLifecycleConvertToFollowUpResponse,
)
def convert_action_to_follow_up(
    request: Request,
    body: ActionLifecycleConvertToFollowUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActionLifecycleConvertToFollowUpResponse:
    try:
        _validate_optional_links(db, current_user.id, body.contact_id, body.event_id)

        existing_state = get_lifecycle_state(db, current_user.id, body.entity_kind, body.entity_id)
        if (
            existing_state is not None
            and existing_state.status == "converted_to_follow_up"
            and existing_state.converted_follow_up_id is not None
        ):
            existing_follow_up = (
                db.query(FollowUp)
                .filter(
                    FollowUp.id == existing_state.converted_follow_up_id,
                    FollowUp.user_id == current_user.id,
                )
                .first()
            )
            if existing_follow_up is not None:
                return ActionLifecycleConvertToFollowUpResponse(
                    follow_up=_follow_up_response(existing_follow_up),
                    lifecycle_state=ActionLifecycleStateResponse.model_validate(existing_state),
                    converted_follow_up_id=existing_follow_up.id,
                )

        follow_up = FollowUp(
            user_id=current_user.id,
            contact_id=body.contact_id,
            event_id=body.event_id,
            title=body.title,
            description=body.description,
            due_date=body.due_date,
            status=body.status,
        )
        db.add(follow_up)
        db.flush()

        lifecycle_state = upsert_lifecycle_state(
            db,
            current_user.id,
            body.entity_kind,
            body.entity_id,
            entity_type=body.entity_type or body.entity_kind,
            status="converted_to_follow_up",
            converted_follow_up_id=follow_up.id,
            notes=body.notes,
            commit=False,
        )
        db.commit()
        db.refresh(follow_up)
        db.refresh(lifecycle_state)
    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        db.rollback()
        raise

    _dispatch_refreshes(db, current_user.id)
    return ActionLifecycleConvertToFollowUpResponse(
        follow_up=_follow_up_response(follow_up),
        lifecycle_state=ActionLifecycleStateResponse.model_validate(lifecycle_state),
        converted_follow_up_id=follow_up.id,
    )
