"""AI Mentor chat dengan konteks roadmap user.

- Konteks disuntikkan: assessment + roadmap + progres task.
- Sliding window riwayat agar hemat token.
- Fallback template bila Gemini down / tanpa key.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings
from app.models import Assessment, Roadmap, RoadmapTask
from app.services.ai_roadmap import AIUnavailableError, _call_gemini

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 10  # sliding window: 10 pesan terakhir (5 tanya-jawab)
MAX_QUERY_CHARS = 4000

SYSTEM_PROMPT = """Kamu adalah AI Mentor SkillForge yang membantu pengguna belajar \
menuju target karier. Jawab dalam Bahasa Indonesia, ringkas, praktis, dan ramah.

Kamu punya konteks roadmap belajar user. Gunakan konteks itu untuk:
- Menjelaskan materi sesuai tahapan user saat ini.
- Memberi saran belajar, latihan, dan resource.
- Memotivasi dan mengingatkan agar tetap konsisten.
Jika user bertanya di luar konteks belajar, arahkan kembali ke tujuan belajarnya.
"""

FALLBACK_REPLY = (
    "Maaf, AI mentor sedang tidak tersedia saat ini. "
    "Sementara itu, coba fokus selesaikan misi harianmu dan materi yang belum "
    "dituntaskan di roadmap. Kalau ada istilah yang bingung, tuliskan lagi nanti ya! 💪"
)


def _build_context(
    assessment: Assessment | None,
    roadmap: Roadmap | None,
    tasks: list[RoadmapTask],
) -> str:
    lines: list[str] = []
    if assessment:
        lines.append(
            "=== ASSESSMENT USER ===\n"
            f"Target karier: {assessment.target_career}\n"
            f"Skill saat ini: {assessment.current_skills or '-'}\n"
            f"Jam belajar/hari: {assessment.learning_hours or '-'}\n"
            f"Deadline: {assessment.deadline or '-'}\n"
            f"Pengalaman: {assessment.experience or '-'}"
        )
    if roadmap:
        weeks = roadmap.content.get("weeks", [])
        lines.append("=== ROADMAP USER ===")
        lines.append(
            f"Target: {roadmap.target_career} | Durasi: {roadmap.duration_weeks} minggu"
        )
        if weeks:
            for w in weeks[:5]:
                tasks_str = ", ".join(
                    t.get("title", "") for t in w.get("tasks", [])[:4]
                )
                lines.append(f"Minggu {w.get('week')}: {tasks_str}")
    if tasks:
        done = [t.title for t in tasks if t.is_completed]
        pending = [t.title for t in tasks if not t.is_completed]
        total = len(tasks)
        pct = round((len(done) / total) * 100) if total else 0
        lines.append(
            "=== PROGRES USER ===\n"
            f"Progres: {len(done)}/{total} task selesai ({pct}%).\n"
            f"Belum selesai: {', '.join(pending[:5]) or '-'}\n"
            f"Selesai: {', '.join(done[:5]) or '-'}"
        )
    return "\n\n".join(lines) or "Belum ada data roadmap."


def _build_prompt(
    context: str, history: list[dict[str, str]], query: str
) -> str:
    parts = [SYSTEM_PROMPT, "\n=== KONTEKS USER ===\n", context]
    if history:
        parts.append("\n=== RIWAYAT PERCAKAPAN (terakhir) ===\n")
        for m in history:
            parts.append(f"{m['role']}: {m['content']}")
    parts.append(f"\n=== PERTANYAAN BARU ===\nuser: {query}")
    parts.append("\nBeri jawaban langsung tanpa kata pembuka yang bertele-tele.")
    return "\n".join(parts)


async def mentor_reply(
    query: str,
    context: str,
    history: list[dict[str, str]],
) -> dict[str, str]:
    """Kirim ke Gemini; fallback template bila gagal."""
    if not query.strip():
        return {"reply": "Tulis pertanyaanmu dulu ya!", "source": "fallback"}

    prompt = _build_prompt(context, history[-MAX_HISTORY_MESSAGES:], query[:MAX_QUERY_CHARS])

    if settings.gemini_api_key:
        try:
            raw = await _call_gemini(prompt, json_mode=False)
            reply = raw.strip()
            # Bersihkan pembungkus markdown bila ada
            if reply.startswith("```"):
                reply = reply.strip("`")
                if reply.startswith("json"):
                    reply = reply[4:].strip()
            if not reply:
                raise ValueError("Jawaban mentor kosong")
            return {"reply": reply[:4000], "source": "gemini"}
        except (AIUnavailableError, ValueError, httpx.HTTPError) as exc:
            logger.warning("Mentor Gemini gagal, pakai fallback: %s", exc)

    return {"reply": FALLBACK_REPLY, "source": "fallback"}


def extract_context_data(
    db,
    user_id: str,
) -> tuple[Assessment | None, Roadmap | None, list[RoadmapTask]]:
    """Ambil assessment terakhir, roadmap terakhir, dan task-nya."""
    from sqlalchemy import select

    assessment = db.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(Assessment.created_at.desc())
    ).scalars().first()

    roadmap = db.execute(
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.status == "ready")
        .order_by(Roadmap.created_at.desc())
    ).scalars().first()

    tasks: list[RoadmapTask] = []
    if roadmap:
        tasks = db.execute(
            select(RoadmapTask)
            .where(RoadmapTask.roadmap_id == roadmap.id)
            .order_by(RoadmapTask.week, RoadmapTask.created_at)
        ).scalars().all()

    return assessment, roadmap, tasks


def build_context_for_user(
    assessment: Assessment | None,
    roadmap: Roadmap | None,
    tasks: list[RoadmapTask],
) -> str:
    return _build_context(assessment, roadmap, tasks)
