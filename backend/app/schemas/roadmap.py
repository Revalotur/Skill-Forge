from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RoadmapGenerateRequest(BaseModel):
    user_id: UUID
    assessment_id: UUID | None = None
    instructions: str | None = Field(default=None, description="Instruksi tambahan untuk regenerate")


class RoadmapTaskCreate(BaseModel):
    week: int
    title: str
    description: str = ""
    resources: list[str] = []


class RoadmapTaskRead(BaseModel):
    id: UUID
    roadmap_id: UUID
    week: int
    title: str
    description: str
    resources: list[str]
    is_completed: bool
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class RoadmapTaskPatch(BaseModel):
    is_completed: bool | None = None
    title: str | None = None
    description: str | None = None


class RoadmapRead(BaseModel):
    id: UUID
    user_id: UUID
    assessment_id: UUID | None
    target_career: str
    duration_weeks: int
    content: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime
    tasks: list[RoadmapTaskRead] = []

    model_config = {"from_attributes": True}


class RoadmapSummary(BaseModel):
    id: UUID
    target_career: str
    duration_weeks: int
    status: str
    created_at: datetime
    total_tasks: int
    completed_tasks: int
    progress_percent: int

    model_config = {"from_attributes": True}


class AssessmentBasic(BaseModel):
    id: UUID
    user_id: UUID
    target_career: str
    current_skills: str
    learning_hours: str | None
    deadline: date | None
    experience: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
