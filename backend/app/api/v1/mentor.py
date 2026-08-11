from fastapi import APIRouter, Depends, Request

from app.core.ratelimit import limiter
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.schemas.mentor import MentorChatRequest, MentorChatResponse
from app.services.ai_mentor import (
    build_context_for_user,
    extract_context_data,
    mentor_reply,
)

router = APIRouter(
    prefix="/mentor",
    tags=["mentor"],
    dependencies=[Depends(require_internal_key)],
)


@router.post("/chat", response_model=MentorChatResponse)
@limiter.limit("20/minute")
async def chat(
    request: Request,
    payload: MentorChatRequest,
    db: Session = Depends(get_db),
):
    assessment, roadmap, tasks = extract_context_data(db, payload.user_id)
    context = build_context_for_user(assessment, roadmap, tasks)

    history = [
        {"role": m.role, "content": m.content}
        for m in payload.messages
        if m.content and m.content.strip()
    ]
    query = payload.query or (payload.messages[-1].content if payload.messages else "")
    if not query and history:
        query = history[-1]["content"]
        history = history[:-1]

    result = await mentor_reply(query, context, history)
    return MentorChatResponse(**result)
