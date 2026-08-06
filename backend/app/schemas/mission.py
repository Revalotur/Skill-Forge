from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MissionRead(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None
    title: str
    date: datetime
    is_completed: bool
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MissionPatch(BaseModel):
    is_completed: bool


class StreakRead(BaseModel):
    current_streak: int
    longest_streak: int
    missions_completed: int
    today_completed: bool
