import json

import pytest

from app.services.ai_roadmap import (
    AIUnavailableError,
    build_prompt,
    _extract_json,
    validate_roadmap,
)
from app.services.roadmap_templates import build_rule_based_roadmap


def test_build_prompt_contains_assessment_data():
    prompt = build_prompt(
        {
            "target_career": "Frontend Developer",
            "current_skills": "HTML, CSS",
            "learning_hours": "3-4 jam",
            "deadline": "2026-12-01",
            "experience": "Pernah bikin landing page",
        }
    )
    assert "Frontend Developer" in prompt
    assert "HTML, CSS" in prompt
    assert "3-4 jam" in prompt


def test_rule_based_roadmap_frontend():
    data = build_rule_based_roadmap("Frontend Developer")
    assert data["source"] == "fallback"
    assert data["duration_weeks"] == 10
    assert data["weeks"][0]["tasks"]
    assert all(t["title"] for w in data["weeks"] for t in w["tasks"])


def test_rule_based_roadmap_unknown_career_uses_default():
    data = build_rule_based_roadmap("Quantum Physicist")
    assert data["duration_weeks"] == 10
    assert data["source"] == "fallback"


def test_rule_based_roadmap_with_skills():
    data = build_rule_based_roadmap("Data Analyst", current_skills="SQL, Python")
    assert data["duration_weeks"] == 10


def test_extract_json_from_plain():
    raw = '{"target_career": "X", "weeks": [{"week": 1, "title": "M1", "tasks": [{"title": "T", "resources": []}]}]}'
    data = _extract_json(raw)
    assert data["target_career"] == "X"


def test_extract_json_from_fenced_code():
    raw = '```json\n{"target_career": "Y", "weeks": []}\n```'
    data = _extract_json(raw)
    assert data["target_career"] == "Y"


def test_extract_json_from_text():
    raw = 'Berikut roadmapnya:\n{"target_career": "Z", "weeks": []}\nSemoga membantu.'
    data = _extract_json(raw)
    assert data["target_career"] == "Z"


def test_extract_json_raises_on_no_json():
    with pytest.raises(ValueError):
        _extract_json("tidak ada json di sini")


def test_validate_roadmap_ok():
    data = {
        "target_career": "Backend",
        "weeks": [
            {
                "week": 1,
                "title": "Minggu 1",
                "tasks": [
                    {"title": "HTTP", "description": "belajar", "resources": ["https://a.com", "https://b.com"]}
                ],
            }
        ],
    }
    result = validate_roadmap(data)
    assert result["source"] == "gemini"
    assert result["duration_weeks"] == 1
    assert result["weeks"][0]["tasks"][0]["title"] == "HTTP"
    assert result["weeks"][0]["tasks"][0]["resources"] == ["https://a.com", "https://b.com"]


def test_validate_roadmap_filters_empty_tasks():
    data = {
        "weeks": [
            {"week": 1, "title": "M1", "tasks": [{"title": "   ", "resources": []}]},
            {"week": 2, "title": "M2", "tasks": [{"title": "Valid", "resources": []}]},
        ]
    }
    result = validate_roadmap(data)
    assert result["duration_weeks"] == 1
    assert result["weeks"][0]["tasks"][0]["title"] == "Valid"


def test_validate_roadmap_raises_on_no_tasks():
    with pytest.raises(ValueError):
        validate_roadmap({"weeks": [{"week": 1, "tasks": [{"title": ""}]}]})


def test_validate_roadmap_raises_on_missing_weeks():
    with pytest.raises(ValueError):
        validate_roadmap({"target_career": "X"})


def test_ai_unavailable_error_is_exception():
    assert issubclass(AIUnavailableError, Exception)
