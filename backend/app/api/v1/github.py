from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.ratelimit import limiter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import GithubAnalysis
from app.schemas.github import GithubAnalyzeRequest, GithubRead
from app.services.github_analyzer import GithubFetchError, fetch_github_profile

router = APIRouter(
    prefix="/github",
    tags=["github"],
    dependencies=[Depends(require_internal_key)],
)


@router.post("/analyze", response_model=GithubRead, status_code=201)
@limiter.limit("10/minute")
async def analyze(request: Request, payload: GithubAnalyzeRequest, db: Session = Depends(get_db)):
    try:
        analysis = await fetch_github_profile(payload.username.strip())
    except GithubFetchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    record = GithubAnalysis(
        user_id=payload.user_id,
        username=analysis["username"],
        analysis=analysis,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/latest", response_model=GithubRead)
def latest(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(GithubAnalysis)
        .where(GithubAnalysis.user_id == user_id)
        .order_by(GithubAnalysis.created_at.desc())
    )
    record = db.execute(stmt).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Belum ada analisis GitHub")
    return record
