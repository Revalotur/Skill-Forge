from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class GithubAnalyzeRequest(BaseModel):
    user_id: UUID
    username: str = Field(min_length=1, max_length=80)


class GithubRead(BaseModel):
    id: UUID
    username: str | None
    analysis: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}
