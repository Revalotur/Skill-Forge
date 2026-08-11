from app.services.career_gap import _matches_skill, _tokenize
from app.services.career_skills import match_career, required_skills_for


def test_tokenize_splits_punctuation():
    assert _tokenize("HTML, CSS & JavaScript") == {"html", "css", "javascript"}


def test_matches_skill_finds_token():
    assert _matches_skill("JavaScript", {"html", "css", "javascript"})
    assert not _matches_skill("Python", {"html", "css", "javascript"})


def test_match_career_known():
    assert match_career("Frontend Developer") == "frontend developer"
    assert match_career("Backend Engineer") == "backend developer"


def test_match_career_unknown_returns_default():
    assert match_career("Astronaut") == "default"


def test_match_career_empty_returns_default():
    assert match_career("") == "default"
    assert required_skills_for("") == [
        "Programming Language Dasar", "Git & Version Control", "REST API",
        "Database Dasar", "Testing", "Deployment", "Best Practices",
    ]


def test_required_skills_for_default():
    skills = required_skills_for("Astronaut")
    assert "Git & Version Control" in skills
