from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.dependencies import get_current_user
from app.models import OpportunityResponse
from app.services.opportunity_detection_service import detect_opportunities

router = APIRouter(tags=["opportunities"])


@router.get("/opportunities", response_model=List[OpportunityResponse])
def list_opportunities(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[OpportunityResponse]:
    return [OpportunityResponse(**item.__dict__) for item in detect_opportunities(db, current_user.id)]
