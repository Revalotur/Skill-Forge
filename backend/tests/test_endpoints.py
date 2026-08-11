import asyncio
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.core.security import require_internal_key
from app.services.career_gap import compute_career_gap


def test_require_internal_key_valid():
    settings.internal_api_key = "sk-test"
    asyncio.run(require_internal_key("sk-test"))


def test_require_internal_key_invalid():
    settings.internal_api_key = "sk-test"
    with pytest.raises(HTTPException) as exc:
        asyncio.run(require_internal_key("wrong"))
    assert exc.value.status_code == 401


def test_compute_career_gap_empty_db():
    db = MagicMock()
    db.execute.return_value.scalars.return_value.first.return_value = None
    db.execute.return_value.scalars.return_value.all.return_value = []
    result = compute_career_gap(db, "00000000-0000-0000-0000-000000000000")
    assert result["target_career"] == "Belum ditentukan"
    assert result["readiness_score"] == 0
    assert result["required_skills"] == []
