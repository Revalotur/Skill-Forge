from fastapi import APIRouter

from app.api.v1 import assessments, health, roadmap_tasks, roadmaps

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(assessments.router)
api_router.include_router(roadmaps.router)
api_router.include_router(roadmap_tasks.router)
