from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AssessmentCreate(BaseModel):
    user_id: UUID
    target_career: str = Field(min_length=1)
    current_skills: str = Field(default="", min_length=2)
    learning_hours: str | None = None
    deadline: date | None = None
    experience: str | None = None


class AssessmentRead(BaseModel):
    id: UUID
    user_id: UUID
    target_career: str
    current_skills: str
    learning_hours: str | None
    deadline: date | None
    experience: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
