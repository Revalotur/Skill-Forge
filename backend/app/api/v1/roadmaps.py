from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import Assessment, Roadmap, RoadmapTask
from app.schemas.roadmap import (
    RoadmapGenerateRequest,
    RoadmapRead,
    RoadmapSummary,
    RoadmapTaskPatch,
    RoadmapTaskRead,
)
from app.services.ai_roadmap import generate_roadmap

router = APIRouter(
    prefix="/roadmaps",
    tags=["roadmaps"],
    dependencies=[Depends(require_internal_key)],
)


def _get_roadmap_with_tasks(roadmap_id: UUID, db: Session) -> Roadmap:
    stmt = (
        select(Roadmap)
        .options(joinedload(Roadmap.tasks))
        .where(Roadmap.id == roadmap_id)
    )
    roadmap = db.execute(stmt).scalars().unique().one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap tidak ditemukan")
    return roadmap


def _build_content(assessment: Assessment, instructions: str | None = None) -> dict:
    return {
        "assessment": {
            "target_career": assessment.target_career,
            "current_skills": assessment.current_skills,
            "learning_hours": assessment.learning_hours,
            "deadline": str(assessment.deadline) if assessment.deadline else None,
            "experience": assessment.experience,
        },
        "instructions": instructions,
    }


@router.post("/generate", response_model=RoadmapRead, status_code=201)
async def generate(payload: RoadmapGenerateRequest, db: Session = Depends(get_db)):
    if payload.assessment_id:
        assessment = db.get(Assessment, payload.assessment_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment tidak ditemukan")
        if assessment.user_id != payload.user_id:
            raise HTTPException(status_code=403, detail="Bukan assessment milik user ini")
    else:
        stmt = (
            select(Assessment)
            .where(Assessment.user_id == payload.user_id)
            .order_by(Assessment.created_at.desc())
        )
        assessment = db.execute(stmt).scalars().first()
        if not assessment:
            raise HTTPException(status_code=400, detail="Belum ada assessment. Isi assessment dulu.")

    roadmap = Roadmap(
        user_id=payload.user_id,
        assessment_id=assessment.id,
        target_career=assessment.target_career,
        status="generating",
        content=_build_content(assessment, payload.instructions),
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    try:
        data = await generate_roadmap(
            {
                "target_career": assessment.target_career,
                "current_skills": assessment.current_skills,
                "learning_hours": assessment.learning_hours,
                "deadline": str(assessment.deadline) if assessment.deadline else None,
                "experience": assessment.experience,
                "instructions": payload.instructions,
            }
        )

        roadmap.target_career = data["target_career"] or assessment.target_career
        roadmap.duration_weeks = data["duration_weeks"]
        roadmap.content = data
        roadmap.status = "ready"

        for week in data["weeks"]:
            for task in week["tasks"]:
                db.add(
                    RoadmapTask(
                        roadmap_id=roadmap.id,
                        week=int(week["week"]),
                        title=task["title"],
                        description=task.get("description", ""),
                        resources=task.get("resources", []),
                    )
                )
        db.commit()
    except Exception:
        roadmap.status = "failed"
        db.commit()
        db.refresh(roadmap)
        raise HTTPException(status_code=500, detail="Gagal generate roadmap")

    db.refresh(roadmap)
    return _get_roadmap_with_tasks(roadmap.id, db)


@router.get("/latest", response_model=RoadmapRead)
def get_latest_roadmap(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(Roadmap)
        .where(Roadmap.user_id == user_id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmap = db.execute(stmt).scalars().first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Belum ada roadmap")
    return _get_roadmap_with_tasks(roadmap.id, db)


@router.get("/summary", response_model=RoadmapSummary)
def get_roadmap_summary(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(Roadmap)
        .where(Roadmap.user_id == user_id)
        .order_by(Roadmap.created_at.desc())
    )
    roadmap = db.execute(stmt).scalars().first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Belum ada roadmap")

    total = db.execute(
        select(func.count(RoadmapTask.id)).where(RoadmapTask.roadmap_id == roadmap.id)
    ).scalar_one()
    done = db.execute(
        select(func.count(RoadmapTask.id)).where(
            RoadmapTask.roadmap_id == roadmap.id,
            RoadmapTask.is_completed.is_(True),
        )
    ).scalar_one()
    progress = round((done / total) * 100) if total else 0

    return RoadmapSummary(
        id=roadmap.id,
        target_career=roadmap.target_career,
        duration_weeks=roadmap.duration_weeks,
        status=roadmap.status,
        created_at=roadmap.created_at,
        total_tasks=total,
        completed_tasks=done,
        progress_percent=progress,
    )


@router.get("/{roadmap_id}", response_model=RoadmapRead)
def get_roadmap(roadmap_id: UUID, db: Session = Depends(get_db)):
    return _get_roadmap_with_tasks(roadmap_id, db)



