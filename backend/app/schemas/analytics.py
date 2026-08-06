from datetime import date
from typing import Any

from pydantic import BaseModel


class AnalyticsRead(BaseModel):
    total_tasks: int
    completed_tasks: int
    progress_percent: int
    current_streak: int
    longest_streak: int
    missions_completed: int
    last_7_days: list[dict[str, Any]]
    weekly_distribution: list[dict[str, Any]]
    recent_activity: list[dict[str, Any]]
