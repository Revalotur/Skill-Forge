from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class CvRead(BaseModel):
    id: UUID
    user_id: UUID
    filename: str | None
    analysis: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}