from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.schemas.career_gap import CareerGapRead
from app.services.career_gap import compute_career_gap

router = APIRouter(
    prefix="/career-gap",
    tags=["career-gap"],
    dependencies=[Depends(require_internal_key)],
)


@router.get("", response_model=CareerGapRead)
def get_career_gap(user_id: UUID, db: Session = Depends(get_db)):
    return compute_career_gap(db, user_id)
