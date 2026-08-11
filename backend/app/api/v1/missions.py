from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.ratelimit import limiter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import DailyMission
from app.schemas.mission import MissionPatch, MissionRead, StreakRead
from app.services.ai_mission import (
    _NoMissionError,
    compute_streak,
    ensure_today_mission,
)

router = APIRouter(
    prefix="/missions",
    tags=["missions"],
    dependencies=[Depends(require_internal_key)],
)


@router.get("/today", response_model=MissionRead)
@limiter.limit("10/minute")
def get_today_mission(request: Request, user_id: UUID, db: Session = Depends(get_db)):
    try:
        return ensure_today_mission(db, user_id)
    except _NoMissionError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{mission_id}", response_model=MissionRead)
def update_mission(
    mission_id: UUID,
    payload: MissionPatch,
    db: Session = Depends(get_db),
):
    mission = db.get(DailyMission, mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Misi tidak ditemukan")

    if payload.is_completed is not None:
        mission.is_completed = payload.is_completed
        mission.completed_at = (
            datetime.now(timezone.utc) if payload.is_completed else None
        )
    db.commit()
    db.refresh(mission)
    return mission


@router.get("/streak", response_model=StreakRead)
def get_streak(user_id: UUID, db: Session = Depends(get_db)):
    return compute_streak(db, user_id)


@router.get("/history", response_model=list[MissionRead])
def get_mission_history(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(DailyMission)
        .where(DailyMission.user_id == user_id)
        .order_by(DailyMission.date.desc())
        .limit(60)
    )
    return db.execute(stmt).scalars().all()
