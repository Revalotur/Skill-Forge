import asyncio

from app.services.cv_analyzer import (
    _contact_score,
    _find_sections,
    _length_score,
    _quantified_score,
    _rule_based_suggestions,
    _section_score,
    _skills_match,
    analyze_cv,
)

SAMPLE_CV = """Budi Santoso
budi.santoso@email.com | +62 812-3456-7890 | linkedin.com/in/budisantoso

RINGKASAN
Fresh graduate Informatika dengan passion di pengembangan web.

PENGALAMAN
Intern Frontend Developer di PT Maju (2025)
- Membangun UI dashboard dengan React dan Tailwind CSS
- Meningkatkan performa halaman hingga 25% dan waktu load turun 30%
- Mengelola 3 proyek frontend secara paralel
- Bekerja sama dengan tim backend untuk integrasi REST API

PENDIDIKAN
S1 Informatika, Universitas Indonesia (2021-2025)

KEAHLIAN
HTML, CSS, JavaScript, React, Git, TypeScript

PROYEK
- Aplikasi e-commerce dengan React dan REST API
- Portofolio website pribadi

SERTIFIKAT
- Belajar JavaScript Dasar (Dicoding)
"""


def test_analyze_cv_returns_scores():
    result = asyncio.run(analyze_cv(SAMPLE_CV, "Frontend Developer"))
    assert 0 <= result["ats_score"] <= 100
    assert result["target_career"] == "Frontend Developer"
    assert result["source"] in ("gemini", "rule-based")
    assert result["word_count"] > 0
    assert isinstance(result["suggestions"], list)


def test_analyze_cv_detects_and_misses_skills():
    result = asyncio.run(analyze_cv(SAMPLE_CV, "Frontend Developer"))
    assert "React" in result["detected_skills"]
    assert "Tailwind CSS" in result["detected_skills"]
    assert result["missing_skills"], "harus ada skill yang kurang"


def test_analyze_cv_empty_text_scores_zero():
    result = asyncio.run(analyze_cv("", ""))
    assert result["ats_score"] == 0
    assert result["word_count"] == 0
    assert result["sections_found"] == []


def test_find_sections_detects_all():
    found = _find_sections(SAMPLE_CV.lower())
    assert "ringkasan" in found
    assert "pengalaman" in found
    assert "pendidikan" in found
    assert "keahlian" in found
    assert "proyek" in found
    assert "sertifikat" in found


def test_section_score_full():
    assert _section_score(list(_find_sections(SAMPLE_CV.lower()))) == 20


def test_contact_score_full():
    assert _contact_score(SAMPLE_CV) == 10


def test_contact_score_missing():
    assert _contact_score("hanya teks biasa") == 0


def test_skills_match_known_career():
    score, current, missing = _skills_match(SAMPLE_CV, "Frontend Developer")
    assert score > 0
    assert "React" in current
    assert isinstance(missing, list)


def test_skills_match_empty_career():
    score, current, missing = _skills_match(SAMPLE_CV, "")
    assert score == 0
    assert current == []
    assert missing == []


def test_quantified_score_counts():
    score, count = _quantified_score(SAMPLE_CV)
    assert count >= 3
    assert score == 10


def test_length_score():
    assert _length_score("a " * 400)[0] == 10
    assert _length_score("a " * 50)[0] == 2
    assert _length_score("") == (0, 0)


def test_rule_based_suggestions_capped():
    suggestions = _rule_based_suggestions("teks tanpa kontak", [], ["X", "Y", "Z"], 0, 50)
    assert len(suggestions) <= 6
    assert any("email" in s for s in suggestions)