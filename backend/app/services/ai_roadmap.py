from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings
from app.services.roadmap_templates import build_rule_based_roadmap

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"

MAX_RETRIES = 4
BASE_BACKOFF = 1.0  # detik
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

SYSTEM_PROMPT = """Kamu adalah AI Learning Roadmap Generator. Tugasmu membuat roadmap belajar \
berbahasa Indonesia untuk target karier teknologi.

Input tersedia:
- target_career: karier yang dituju
- current_skills: skill yang sudah dimiliki (bisa kosong)
- learning_hours: jam belajar per hari
- deadline: target waktu (bisa kosong)
- experience: pengalaman (bisa kosong)

Aturan:
1. Buat roadmap 8-12 minggu, setiap minggu berisi 2-3 task materi.
2. Task harus spesifik, berurutan dari dasar ke lanjutan, disesuaikan dengan current_skills.
3. Setiap task wajib punya field resources berisi 1-3 link belajar gratis yang relevan.
4. Berbahasa Indonesia.
5. WAJIB merespons HANYA valid JSON tanpa teks lain, format:
{
  "target_career": "...",
  "duration_weeks": 10,
  "weeks": [
    {"week": 1, "title": "Minggu 1", "tasks": [
      {"title": "HTML & Semantic Markup", "description": "...", "resources": ["https://..."]}
    ]}
  ]
}
"""


class AIUnavailableError(Exception):
    """AI tidak bisa dipakai; panggil fallback."""


def build_prompt(assessment: dict[str, Any]) -> str:
    return f"""{SYSTEM_PROMPT}

=== DATA ASSESSMENT ===
target_career: {assessment.get('target_career', '')}
current_skills: {assessment.get('current_skills', '')}
learning_hours: {assessment.get('learning_hours', '')}
deadline: {assessment.get('deadline', '')}
experience: {assessment.get('experience', '')}
"""


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Tidak ada JSON di respons AI")
    return json.loads(text[start : end + 1])


def validate_roadmap(data: dict[str, Any]) -> dict[str, Any]:
    weeks = data.get("weeks")
    if not isinstance(weeks, list) or not weeks:
        raise ValueError("Field weeks kosong atau tidak valid")

    validated_weeks = []
    for item in weeks:
        week_num = int(item.get("week", len(validated_weeks) + 1))
        tasks = []
        for task in item.get("tasks", []):
            title = str(task.get("title", "")).strip()
            if not title:
                continue
            resources = task.get("resources", [])
            if not isinstance(resources, list):
                resources = []
            resources = [str(r) for r in resources if isinstance(r, str)]
            tasks.append(
                {
                    "title": title,
                    "description": str(task.get("description", "")).strip(),
                    "resources": list(dict.fromkeys(resources))[:3],
                }
            )
        if tasks:
            validated_weeks.append(
                {
                    "week": week_num,
                    "title": str(item.get("title", f"Minggu {week_num}")),
                    "tasks": tasks,
                }
            )

    if not validated_weeks:
        raise ValueError("Tidak ada task valid di respons AI")

    return {
        "target_career": str(data.get("target_career", "")),
        "duration_weeks": len(validated_weeks),
        "source": "gemini",
        "weeks": validated_weeks,
    }


async def _call_gemini(prompt: str, timeout: int = 60, json_mode: bool = True) -> str:
    api_key = settings.gemini_api_key
    if not api_key:
        raise AIUnavailableError("GEMINI_API_KEY kosong")

    url = f"{GEMINI_URL}/{settings.gemini_model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            **({"responseMimeType": "application/json"} if json_mode else {}),
        },
    }
    headers = {"Content-Type": "application/json"}

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    url,
                    params={"key": api_key},
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 200:
                data = resp.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError, TypeError) as exc:
                    raise ValueError("Respons Gemini tidak punya teks") from exc

            if resp.status_code in RETRYABLE_STATUS:
                raise AIUnavailableError(f"Gemini status {resp.status_code}: {resp.text[:200]}")
            raise AIUnavailableError(f"Gemini error {resp.status_code}: {resp.text[:200]}")

        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                wait = BASE_BACKOFF * (2**attempt)
                logger.warning("Gemini retry %s dalam %ss: %s", attempt + 1, wait, exc)
                time.sleep(wait)
            continue
        except AIUnavailableError as exc:
            raise exc from None

    raise AIUnavailableError(f"Gemini gagal setelah retries: {last_error}")


async def generate_roadmap(assessment: dict[str, Any]) -> dict[str, Any]:
    """Generate roadmap via Gemini; fallback rule-based jika AI tidak tersedia."""
    prompt = build_prompt(assessment)

    if settings.gemini_api_key:
        try:
            raw_text = await _call_gemini(prompt)
            data = _extract_json(raw_text)
            return validate_roadmap(data)
        except (AIUnavailableError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Gemini gagal, pakai fallback: %s", exc)

    return build_rule_based_roadmap(
        target_career=assessment.get("target_career", "Full-Stack Developer"),
        current_skills=assessment.get("current_skills", ""),
        learning_hours=assessment.get("learning_hours", ""),
    )
