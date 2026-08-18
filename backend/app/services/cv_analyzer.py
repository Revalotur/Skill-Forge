from __future__ import annotations

import json
import logging
import re
from io import BytesIO
from typing import Any

from pypdf import PdfReader

from app.core.config import settings
from app.services.ai_roadmap import AIUnavailableError, _call_gemini
from app.services.career_gap import _tokenize
from app.services.career_skills import required_skills_for

logger = logging.getLogger(__name__)

MAX_SUGGESTIONS = 6

_SECTION_KEYWORDS: dict[str, list[str]] = {
    "ringkasan": [
        "ringkasan",
        "ringkasan profil",
        "profil profesional",
        "tentang saya",
        "summary",
        "profile",
    ],
    "pengalaman": ["pengalaman", "riwayat kerja", "riwayat pekerjaan", "experience"],
    "pendidikan": ["pendidikan", "edukasi", "education"],
    "keahlian": ["keahlian", "keahlian teknis", "kompetensi", "skill", "skills"],
    "proyek": ["proyek", "project", "projects"],
    "sertifikat": ["sertifikat", "sertifikasi", "lisensi", "certification"],
}

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(\+?\d[\d\s\-()]{7,}\d)")
_LINKEDIN_RE = re.compile(r"linkedin\.com")
_QUANTIFIED_PCT_RE = re.compile(r"\d+\s*%")
_QUANTIFIED_WORD_RE = re.compile(
    r"\d+\s*(orang|pengguna|klien|user|tahun|proyek|project|tim|kali|juta|ribu)",
    re.IGNORECASE,
)


def extract_pdf_text(content: bytes) -> str:
    """Ekstrak teks dari bytes PDF via pypdf."""
    reader = PdfReader(BytesIO(content))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


def _find_sections(text_lower: str) -> list[str]:
    found: list[str] = []
    for label, keywords in _SECTION_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(label)
    return found


def _contact_score(text: str) -> int:
    points = 0
    if _EMAIL_RE.search(text):
        points += 1
    if _PHONE_RE.search(text):
        points += 1
    if _LINKEDIN_RE.search(text.lower()):
        points += 1
    return round(points / 3 * 10)


def _section_score(found: list[str]) -> int:
    return round(len(found) / len(_SECTION_KEYWORDS) * 20)


def _skills_match(text: str, target_career: str) -> tuple[int, list[str], list[str]]:
    required = required_skills_for(target_career) if target_career else []
    if not required:
        return 0, [], []
    tokens = _tokenize(text)
    current = [s for s in required if _tokenize(s) & tokens]
    missing = [s for s in required if s not in current]
    score = round(len(current) / len(required) * 35)
    return score, current, missing


def _quantified_score(text: str) -> tuple[int, int]:
    count = len(_QUANTIFIED_PCT_RE.findall(text)) + len(
        _QUANTIFIED_WORD_RE.findall(text)
    )
    if count >= 3:
        return 10, count
    if count >= 1:
        return 5, count
    return 0, count


def _length_score(text: str) -> tuple[int, int]:
    words = len(re.findall(r"\S+", text))
    if 200 <= words <= 900:
        return 10, words
    if words == 0:
        return 0, 0
    if 100 <= words < 200 or 900 < words <= 1500:
        return 5, words
    return 2, words


def _rule_based_suggestions(
    text: str,
    found: list[str],
    missing: list[str],
    quantified: int,
    words: int,
) -> list[str]:
    suggestions: list[str] = []
    if not _EMAIL_RE.search(text):
        suggestions.append("Tambahkan email profesional di bagian header CV.")
    if not _PHONE_RE.search(text):
        suggestions.append("Tambahkan nomor telepon yang aktif di bagian header CV.")
    if not _LINKEDIN_RE.search(text.lower()):
        suggestions.append("Cantumkan link LinkedIn di header CV.")
    for skill in missing[:5]:
        suggestions.append(f"Tambahkan skill: {skill} ke bagian Keahlian.")
    if quantified < 3:
        suggestions.append(
            "Kuantifikasi pencapaian dengan angka (contoh: 'meningkatkan konversi 25%')."
        )
    for section in _SECTION_KEYWORDS:
        if section not in found:
            suggestions.append(f"Tambahkan bagian: {section.capitalize()}.")
    if not (200 <= words <= 900):
        suggestions.append("Sesuaikan panjang CV menjadi 1-2 halaman (±200-900 kata).")
    return list(dict.fromkeys(suggestions))[:MAX_SUGGESTIONS]


_GEMINI_CV_PROMPT = """Kamu adalah reviewer ATS resume. Analisis CV berbahasa Indonesia/Inggris.
Skor ATS saat ini: {ats_score}/100.
Skill terdeteksi di CV: {detected}.
Skill yang masih kurang untuk target karier: {missing}.
Beri saran perbaikan CV yang spesifik dan ringkas dalam bahasa Indonesia.
WAJIB merespons HANYA valid JSON tanpa teks lain, format:
{{"suggestions": ["saran 1", "saran 2", ...]}} (maks 6 saran)
"""


async def _gemini_suggestions(
    ats_score: int,
    detected: list[str],
    missing: list[str],
) -> list[str] | None:
    if not settings.gemini_api_key:
        return None
    prompt = _GEMINI_CV_PROMPT.format(
        ats_score=ats_score,
        detected=", ".join(detected) or "-",
        missing=", ".join(missing) or "-",
    )
    try:
        raw_text = await _call_gemini(prompt, json_mode=True)
        data = json.loads(raw_text[raw_text.find("{") : raw_text.rfind("}") + 1])
        suggestions = data.get("suggestions", [])
        if isinstance(suggestions, list):
            return [str(s) for s in suggestions if isinstance(s, str)][:MAX_SUGGESTIONS]
    except (AIUnavailableError, ValueError, json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        logger.warning("Gemini CV suggestions gagal, pakai fallback: %s", exc)
    return None


async def analyze_cv(text: str, target_career: str) -> dict[str, Any]:
    text_lower = text.lower()
    found = _find_sections(text_lower)
    contact = _contact_score(text)
    structure = _section_score(found)
    skills_score, detected, missing = _skills_match(text, target_career)
    quantified_score, quantified = _quantified_score(text)
    length_score, words = _length_score(text)
    ats_score = min(100, round(contact + structure + skills_score + quantified_score + length_score))

    suggestions = await _gemini_suggestions(ats_score, detected, missing)
    source = "gemini"
    if suggestions is None:
        suggestions = _rule_based_suggestions(text, found, missing, quantified, words)
        source = "rule-based"

    return {
        "target_career": target_career or "",
        "ats_score": ats_score,
        "contact_score": contact,
        "structure_score": structure,
        "skills_score": skills_score,
        "quantified_score": quantified_score,
        "length_score": length_score,
        "sections_found": found,
        "detected_skills": detected,
        "missing_skills": missing,
        "quantified_mentions": quantified,
        "word_count": words,
        "suggestions": suggestions,
        "source": source,
    }