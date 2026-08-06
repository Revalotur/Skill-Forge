"""Generator misi harian berbasis materi roadmap yang belum selesai.

Sesuai issue #12: ambil materi berikutnya yang belum selesai sebagai misi
hari ini. Rule-based sehingga tidak bergantung pada AI (fallback yang
disetujui di task list issue).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DailyMission, Roadmap, RoadmapTask


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_today_start() -> datetime:
    now = _utc_now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_incomplete_task(db: Session, user_id: UUID) -> RoadmapTask | None:
    """Ambil task pertama (per minggu) yang belum selesai dari roadmap terbaru."""
    stmt_roadmap = (
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "ready")
        .order_by(Roadmap.created_at.desc())
    )
    roadmap = db.execute(stmt_roadmap).scalars().first()
    if not roadmap:
        return None

    stmt_task = (
        select(RoadmapTask)
        .where(RoadmapTask.roadmap_id == roadmap.id, RoadmapTask.is_completed.is_(False))
        .order_by(RoadmapTask.week, RoadmapTask.created_at)
    )
    return db.execute(stmt_task).scalars().first()


def ensure_today_mission(db: Session, user_id: UUID) -> DailyMission:
    """Pastikan ada misi untuk hari ini. Buat dari task berikutnya bila belum ada."""
    today_start = get_today_start()
    today_end = today_start + timedelta(days=1)

    stmt = (
        select(DailyMission)
        .where(
            DailyMission.user_id == user_id,
            DailyMission.date >= today_start,
            DailyMission.date < today_end,
        )
        .order_by(DailyMission.created_at.desc())
    )
    existing = db.execute(stmt).scalars().first()
    if existing:
        return existing

    task = _next_incomplete_task(db, user_id)
    if not task:
        raise _NoMissionError("Semua materi sudah selesai. Tunggu roadmap berikutnya!")

    mission = DailyMission(
        user_id=user_id,
        task_id=task.id,
        title=task.title,
        date=_utc_now(),
        is_completed=False,
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


def compute_streak(db: Session, user_id: UUID) -> dict:
    """Hitung streak berdasarkan hari-hari dengan misi selesai berturut-turut."""
    stmt = (
        select(func.date(DailyMission.completed_at))
        .where(DailyMission.user_id == user_id, DailyMission.is_completed.is_(True))
        .distinct()
        .order_by(func.date(DailyMission.completed_at).desc())
    )
    dates = [row[0] for row in db.execute(stmt).all()]

    total_completed = len(dates)
    today_completed = bool(dates and dates[0] == _utc_now().date())

    if not dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "missions_completed": 0,
            "today_completed": False,
        }

    # Streak saat ini: mulai dari hari ini (atau kemarin jika hari ini belum selesai)
    anchor = _utc_now().date()
    if not today_completed:
        anchor = anchor - timedelta(days=1)

    current = 0
    expected = anchor
    for d in dates:
        if d == expected:
            current += 1
            expected = expected - timedelta(days=1)
        else:
            break

    # Longest streak
    longest = 0
    run = 0
    prev = None
    for d in dates:
        if prev is None or (prev - d).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = d

    return {
        "current_streak": current,
        "longest_streak": longest,
        "missions_completed": total_completed,
        "today_completed": today_completed,
    }


class _NoMissionError(Exception):
    pass
