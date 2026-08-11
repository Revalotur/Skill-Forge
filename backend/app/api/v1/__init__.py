from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    assessments,
    career_gap,
    github,
    health,
    mentor,
    missions,
    roadmap_tasks,
    roadmaps,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(assessments.router)
api_router.include_router(roadmaps.router)
api_router.include_router(roadmap_tasks.router)
api_router.include_router(missions.router)
api_router.include_router(mentor.router)
api_router.include_router(analytics.router)
api_router.include_router(github.router)
api_router.include_router(career_gap.router)
