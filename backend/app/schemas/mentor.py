from pydantic import BaseModel


class MentorMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class MentorChatRequest(BaseModel):
    user_id: str
    messages: list[MentorMessage] = []
    query: str | None = None


class MentorChatResponse(BaseModel):
    reply: str
    source: str  # "gemini" | "fallback"
