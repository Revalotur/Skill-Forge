from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, Roadmap, RoadmapTask
from app.services.career_skills import required_skills_for


def _tokenize(text: str) -> set[str]:
    return {re.sub(r"[^a-z0-9]", "", w.lower()) for w in re.split(r"[\s,;|/]+", text or "") if w}


def _extract_user_skills(assessment: Assessment | None, tasks: list[RoadmapTask]) -> set[str]:
    tokens: set[str] = set()
    if assessment:
        tokens |= _tokenize(assessment.current_skills)
    for t in tasks:
        if t.is_completed:
            tokens |= _tokenize(t.title)
    return tokens


def _matches_skill(skill: str, user_tokens: set[str]) -> bool:
    for tok in _tokenize(skill):
        if tok in user_tokens:
            return True
    return any(t in _tokenize(skill) for t in user_tokens if len(t) >= 3)


def compute_career_gap(db: Session, user_id: str) -> dict[str, Any]:
    assessment = db.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(Assessment.created_at.desc())
    ).scalars().first()

    roadmap = db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "ready")
        .order_by(Roadmap.created_at.desc())
    ).scalars().first()

    tasks: list[RoadmapTask] = []
    if roadmap:
        tasks = db.execute(
            select(RoadmapTask).where(RoadmapTask.roadmap_id == roadmap.id)
        ).scalars().all()

    total = len(tasks)
    done = sum(1 for t in tasks if t.is_completed)
    roadmap_progress = round((done / total) * 100) if total else 0

    target_career = (assessment.target_career if assessment else "") or (
        roadmap.target_career if roadmap else ""
    )
    required = required_skills_for(target_career)
    user_tokens = _extract_user_skills(assessment, tasks)

    current = [s for s in required if _matches_skill(s, user_tokens)]
    missing = [s for s in required if s not in current]

    skill_coverage = round((len(current) / len(required)) * 100) if required else 0
    readiness_score = round((roadmap_progress * 0.6) + (skill_coverage * 0.4))

    recommendations: list[str] = []
    if missing:
        recommendations.append(
            "Fokus pelajari skill yang masih kurang: " + ", ".join(missing[:5]) + "."
        )
    if roadmap_progress < 100 and roadmap:
        recommendations.append(
            f"Progres roadmap baru {roadmap_progress}%. Selesaikan task tersisa untuk menaikkan skor kesiapan."
        )
    if not assessment:
        recommendations.append("Lengkapi assessment agar analisis lebih akurat.")
    if roadmap_progress == 100 and not missing:
        recommendations.append("Kamu siap melamar kerja untuk posisi ini. 🎯")

    return {
        "target_career": target_career or "Belum ditentukan",
        "readiness_score": min(100, max(0, readiness_score)),
        "required_skills": required,
        "current_skills": current,
        "missing_skills": missing,
        "roadmap_progress": roadmap_progress,
        "recommendations": recommendations,
    }
