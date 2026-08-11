from __future__ import annotations

import re


CAREER_SKILLS: dict[str, list[str]] = {
    "frontend developer": [
        "HTML", "CSS", "JavaScript", "Git", "TypeScript", "React",
        "Tailwind CSS", "Responsive Design", "Testing", "Web Performance",
    ],
    "backend developer": [
        "Python", "REST API", "SQL", "PostgreSQL", "ORM", "Authentication",
        "Git", "API Testing", "Docker", "CI/CD",
    ],
    "full-stack developer": [
        "HTML", "CSS", "JavaScript", "TypeScript", "React", "REST API",
        "SQL", "PostgreSQL", "Authentication", "Git", "Testing", "Docker",
    ],
    "data analyst": [
        "SQL", "Excel", "Python", "Pandas", "Data Cleaning", "Data Visualization",
        "Dashboard", "Statistika", "EDA", "Business Metrics",
    ],
    "data scientist": [
        "Python", "SQL", "Pandas", "NumPy", "Machine Learning", "Statistika",
        "Data Visualization", "Feature Engineering", "Git", "MLOps",
    ],
    "ui/ux designer": [
        "Figma", "Wireframing", "Prototyping", "User Research", "Design System",
        "Accessibility", "Usability Testing", "Information Architecture", "Persona", "Mockup",
    ],
    "mobile developer": [
        "Dart/Kotlin/Swift", "UI Layout", "State Management", "REST API",
        "Local Database", "Authentication", "Git", "Testing", "Deployment", "Animasi",
    ],
    "devops engineer": [
        "Linux", "Shell Scripting", "Git", "Docker", "CI/CD", "Monitoring",
        "Kubernetes", "Networking", "Cloud", "Infrastructure as Code",
    ],
}

DEFAULT_SKILLS: list[str] = [
    "Programming Language Dasar", "Git & Version Control", "REST API",
    "Database Dasar", "Testing", "Deployment", "Best Practices",
]


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower())


def match_career(target_career: str) -> str:
    """Kembalikan key CAREER_SKILLS yang cocok, atau 'default'."""
    normalized = _normalize(target_career or "")
    if not normalized:
        return "default"
    for key, key_norm in ((k, _normalize(k)) for k in CAREER_SKILLS):
        if normalized == key_norm:
            return key
    for key in CAREER_SKILLS:
        key_norm = _normalize(key)
        if key_norm in normalized or normalized in key_norm:
            return key
        for word in key.split():
            if word in normalized:
                return key
    return "default"


def required_skills_for(target_career: str) -> list[str]:
    key = match_career(target_career)
    skills = CAREER_SKILLS[key] if key != "default" else DEFAULT_SKILLS
    return list(skills)
