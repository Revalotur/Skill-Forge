from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Assessment
from app.schemas.assessment import AssessmentCreate, AssessmentRead

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("", response_model=AssessmentRead, status_code=201)
def create_assessment(payload: AssessmentCreate, db: Session = Depends(get_db)):
    assessment = Assessment(
        user_id=payload.user_id,
        target_career=payload.target_career,
        current_skills=payload.current_skills,
        learning_hours=payload.learning_hours,
        deadline=payload.deadline,
        experience=payload.experience,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(assessment_id: str, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Assessment tidak ditemukan")
    return assessment
