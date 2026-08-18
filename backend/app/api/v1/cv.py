from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.ratelimit import limiter
from app.core.security import require_internal_key
from app.models import CvAnalysis
from app.schemas.cv import CvRead
from app.services.cv_analyzer import analyze_cv, extract_pdf_text

router = APIRouter(
    prefix="/cv",
    tags=["cv"],
    dependencies=[Depends(require_internal_key)],
)

MAX_FILE_BYTES = 5 * 1024 * 1024


@router.post("/analyze", response_model=CvRead, status_code=201)
@limiter.limit("5/minute")
async def analyze(
    request: Request,
    user_id: UUID = Form(...),
    target_career: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Hanya file PDF yang didukung")

    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File terlalu besar (maks 5MB)")

    try:
        text = extract_pdf_text(content)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="PDF tidak bisa dibaca. Pastikan file tidak rusak.") from exc

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="Tidak ada teks yang bisa dibaca (kemungkinan hasil scan). Gunakan CV dengan teks.",
        )

    analysis = await analyze_cv(text, target_career)

    record = CvAnalysis(
        user_id=user_id,
        filename=filename,
        analysis=analysis,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/latest", response_model=CvRead)
def latest(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(CvAnalysis)
        .where(CvAnalysis.user_id == user_id)
        .order_by(CvAnalysis.created_at.desc())
    )
    record = db.execute(stmt).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Belum ada analisis CV")
    return record