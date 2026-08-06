from fastapi import Header, HTTPException

from app.core.config import settings


async def require_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    if not settings.internal_api_key:
        raise HTTPException(status_code=503, detail="INTERNAL_API_KEY belum dikonfigurasi")
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="API key tidak valid")
