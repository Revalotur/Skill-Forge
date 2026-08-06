from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import Roadmap, RoadmapTask
from app.schemas.roadmap import RoadmapTaskPatch, RoadmapTaskRead

router = APIRouter(
    prefix="/roadmap_tasks",
    tags=["roadmap_tasks"],
    dependencies=[Depends(require_internal_key)],
)


@router.patch("/{task_id}", response_model=RoadmapTaskRead)
def update_task_status(
    task_id: UUID,
    payload: RoadmapTaskPatch,
    db: Session = Depends(get_db),
):
    task = db.get(RoadmapTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    roadmap = db.execute(
        select(Roadmap).where(Roadmap.id == task.roadmap_id)
    ).scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap tidak ditemukan")

    if payload.is_completed is not None:
        task.is_completed = payload.is_completed
        task.completed_at = (
            datetime.now(timezone.utc) if payload.is_completed else None
        )
    if payload.title is not None and payload.title.strip():
        task.title = payload.title.strip()
    if payload.description is not None:
        task.description = payload.description.strip()
    db.commit()
    db.refresh(task)
    return task
