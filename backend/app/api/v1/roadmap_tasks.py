from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.ratelimit import limiter
from app.core.security import require_internal_key
from app.models import Roadmap, RoadmapTask
from app.schemas.roadmap import RoadmapTaskCreate, RoadmapTaskPatch, RoadmapTaskRead

router = APIRouter(
    prefix="/roadmap_tasks",
    tags=["roadmap_tasks"],
    dependencies=[Depends(require_internal_key)],
)


@router.post("", response_model=RoadmapTaskRead, status_code=201)
@limiter.limit("30/minute")
def create_task(
    request: Request,
    payload: RoadmapTaskCreate,
    db: Session = Depends(get_db),
):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Judul task wajib diisi")

    roadmap = db.get(Roadmap, payload.roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap tidak ditemukan")

    task = RoadmapTask(
        roadmap_id=payload.roadmap_id,
        week=payload.week,
        title=title,
        description=payload.description.strip(),
        resources=payload.resources,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


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


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.get(RoadmapTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")
    db.delete(task)
    db.commit()
