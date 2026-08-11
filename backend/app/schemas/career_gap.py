from pydantic import BaseModel


class CareerGapRead(BaseModel):
    target_career: str
    readiness_score: int
    required_skills: list[str]
    current_skills: list[str]
    missing_skills: list[str]
    roadmap_progress: int
    recommendations: list[str]
