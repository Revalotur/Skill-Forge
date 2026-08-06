from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import DailyMission, Roadmap, RoadmapTask
from app.schemas.analytics import AnalyticsRead
from app.services.ai_mission import compute_streak

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_internal_key)],
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("", response_model=AnalyticsRead)
def get_analytics(user_id: UUID, db: Session = Depends(get_db)):
    # Roadmap terbaru + task
    roadmap = db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "ready")
        .order_by(Roadmap.created_at.desc())
    ).scalars().first()

    tasks: list[RoadmapTask] = []
    if roadmap:
        tasks = db.execute(
            select(RoadmapTask)
            .where(RoadmapTask.roadmap_id == roadmap.id)
            .order_by(RoadmapTask.week, RoadmapTask.created_at)
        ).scalars().all()

    total = len(tasks)
    done = [t for t in tasks if t.is_completed]
    progress = round((len(done) / total) * 100) if total else 0

    # Streak
    streak = compute_streak(db, user_id)

    # Aktivitas 7 hari terakhir: jumlah task selesai per hari
    today = _utc_now().date()
    last_7 = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        count = 0
        for t in done:
            if t.completed_at and start <= t.completed_at < end:
                count += 1
        last_7.append({"date": day.isoformat(), "label": day.strftime("%a"), "completed": count})

    # Distribusi per minggu roadmap
    weekly = []
    if tasks:
        weeks = sorted({int(t.week) for t in tasks})
        for w in weeks:
            wt = [t for t in tasks if int(t.week) == w]
            wd = [t for t in wt if t.is_completed]
            weekly.append(
                {
                    "week": w,
                    "label": f"W{w}",
                    "total": len(wt),
                    "completed": len(wd),
                }
            )

    # Aktivitas terakhir: 5 task terakhir yang selesai
    recent = []
    sorted_done = sorted(
        [t for t in done if t.completed_at],
        key=lambda t: t.completed_at,
        reverse=True,
    )
    for t in sorted_done[:5]:
        recent.append(
            {
                "title": t.title,
                "week": int(t.week),
                "completed_at": t.completed_at.isoformat(),
            }
        )

    return AnalyticsRead(
        total_tasks=total,
        completed_tasks=len(done),
        progress_percent=progress,
        current_streak=streak["current_streak"],
        longest_streak=streak["longest_streak"],
        missions_completed=streak["missions_completed"],
        last_7_days=last_7,
        weekly_distribution=weekly,
        recent_activity=recent,
    )
