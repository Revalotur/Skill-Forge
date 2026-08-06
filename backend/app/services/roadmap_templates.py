from __future__ import annotations

import re
from typing import Any

CAREER_TEMPLATES: dict[str, list[str]] = {
    "frontend developer": [
        ["HTML & Semantic Markup", "CSS Fundamentals & Responsive Design"],
        ["Flexbox & Grid Layout", "CSS Animations & Transitions"],
        ["JavaScript Dasar (variabel, fungsi, DOM)", "ES6+ (arrow function, destructuring, module)"],
        ["Git & GitHub (branch, pull request)", "Build Tooling (Vite/npm)"],
        ["TypeScript Fundamentals", "React: Komponen & Props"],
        ["React: State, Hooks, & Context", "React: Routing (React Router/Next.js)"],
        ["Data Fetching (fetch, axios)", "State Management (Zustand/Redux Toolkit)"],
        ["Styling: Tailwind CSS", "Testing (Vitest/Jest + Testing Library)"],
        ["Web Performance & Accessibility", "Deployment (Vercel/Netlify)"],
        ["Portfolio Project", "Code Review & Best Practices"],
    ],
    "backend developer": [
        ["Python / Node.js Dasar", "Data Structures & Algorithms Ringan"],
        ["HTTP, REST API & JSON", "PostgreSQL & SQL Dasar"],
        ["ORM & Database Design", "Authentication & Authorization (JWT)"],
        ["Git & GitHub", "Testing API (pytest/Jest + supertest)"],
        ["FastAPI / Express Lanjutan", "Background Jobs & Task Queue"],
        ["Caching (Redis)", "Message Queue (opsional)"],
        ["Containerization (Docker)", "CI/CD Dasar"],
        ["API Security (rate limit, sanitasi)", "Logging & Monitoring"],
        ["Deployment (Render/Railway)", "Load Testing & Performance"],
        ["Backend Portfolio Project", "Code Review & Best Practices"],
    ],
    "full-stack developer": [
        ["HTML, CSS, & Responsive Design", "JavaScript Dasar"],
        ["Git & GitHub", "TypeScript Fundamentals"],
        ["React: Komponen, Props, & State", "React: Hooks & Routing"],
        ["REST API & JSON", "Node.js / Python: Server Dasar"],
        ["FastAPI / Express + SQLAlchemy", "PostgreSQL & Database Design"],
        ["Auth (JWT/Supabase)", "Validasi & Error Handling"],
        ["Tailwind CSS", "State Management"],
        ["Testing (Vitest + pytest)", "CI/CD & Environment Setup"],
        ["Deployment: Vercel + Render + Supabase", "Web Performance & Security"],
        ["Full-Stack Portfolio Project", "Code Review & Best Practices"],
    ],
    "data analyst": [
        ["Excel/Google Sheets Lanjutan", "SQL Dasar (SELECT, JOIN, GROUP BY)"],
        ["Python Dasar", "Pandas untuk Data Wrangling"],
        ["Data Cleaning & Handling Missing", "Statistika Deskriptif"],
        ["Data Visualization (Matplotlib/Seaborn)", "Looker Studio / Tableau Public"],
        ["Dashboard Interaktif", "SQL Lanjutan (window function, CTE)"],
        ["Exploratory Data Analysis (EDA)", "Business Metrics & KPI"],
        ["A/B Testing Dasar", "Presentasi Insight ke Stakeholder"],
        ["Portfolio: Analisis Dataset Publik", "Git & Versioning Dasar"],
        ["Portofolio & Personal Branding", "Interview Prep"],
        ["Final Project & Code Review", "Career Polish"],
    ],
    "data scientist": [
        ["Python Dasar", "SQL & Pengambilan Data"],
        ["Pandas & NumPy", "Statistika & Probabilitas"],
        ["Data Visualization", "Machine Learning Dasar (scikit-learn)"],
        ["Supervised Learning (regresi & klasifikasi)", "Model Evaluation"],
        ["Feature Engineering", "Unsupervised Learning (clustering)"],
        ["Time Series Dasar", "Deep Learning Pengantar (opsional)"],
        ["MLOps Dasar (pipeline, tracking)", "Git & GitHub"],
        ["Deploy Model (FastAPI)", "Cloud untuk ML (opsional)"],
        ["Portfolio ML Projects", "Kaggle & Komunitas"],
        ["Final Project & Interview Prep", "Career Polish"],
    ],
    "ui/ux designer": [
        ["Design Fundamentals (warna, tipografi, ruang)", "Prinsip UX & Usability"],
        ["Wireframing & User Flow", "Design Systems Dasar"],
        ["Figma: Frame, Component, & Auto Layout", "Moodboard & Style Guide"],
        ["Prototyping & Micro-interaction", "User Research & Interview"],
        ["Persona & Journey Map", "Information Architecture"],
        ["Heuristic Evaluation", "Accessibility (WCAG)"],
        ["High-Fidelity Mockup", "Handoff Developer (spec & asset)"],
        ["Usability Testing", "Iterasi Berbasis Data"],
        ["Portfolio: 3 Case Study", "Personal Branding (Behance/LinkedIn)"],
        ["Mock Interview & Career Polish", "Final Portfolio Review"],
    ],
    "mobile developer": [
        ["Dasar Pemrograman (Dart/Kotlin/Swift)", "Setup Environment"],
        ["UI Fundamentals (widget/views)", "Layout & Navigation"],
        ["State Management", "Local Storage & API Call"],
        ["Git & GitHub", "CRUD + REST API"],
        ["Database Lokal (SQLite/Room)", "Auth & Session"],
        ["Animasi & UX Mobile", "Testing Dasar"],
        ["Debugging & Profiling", "Publish ke Play Store/App Store"],
        ["Firebase/Supabase Backend", "Push Notification"],
        ["Portfolio Project", "Code Review"],
        ["Interview Prep & Career Polish", "Final Polish"],
    ],
    "devops engineer": [
        ["Linux & Shell Scripting", "Jaringan Dasar (TCP/IP, DNS, HTTP)"],
        ["Git & Version Control", "Pipelines (GitHub Actions)"],
        ["Docker & Containerization", "Docker Compose"],
        ["CI/CD Lanjutan", "Kubernetes Dasar (kubectl, pods)"],
        ["Infrastructure as Code (Terraform)", "Monitoring & Logging (Prometheus/Grafana)"],
        ["Cloud (AWS/GCP) Dasar", "Load Balancing & Scaling"],
        ["Security: Secrets & IAM", "Observability & Alerting"],
        ["Database Admin & Backup", "Disaster Recovery"],
        ["Proyek Infrastruktur", "Cost Optimization"],
        ["Interview Prep & Career Polish", "Final Portfolio"],
    ],
}

DEFAULT_TEMPLATE: list[list[str]] = [
    ["Fundamental & Setup", "Pengenalan Tools"],
    ["Bahasa Pemrograman Dasar", "Latihan Konsep"],
    ["Latihan & Mini Project", "Version Control (Git)"],
    ["Materi Inti", "Mini Project"],
    ["Materi Inti Lanjutan", "Best Practices"],
    ["API & Integrasi", "Database Dasar"],
    ["Testing & Debugging", "Code Review"],
    ["Deployment", "Monitoring"],
    ["Portfolio Project", "Personal Branding"],
    ["Final Polish", "Interview Prep"],
]

RESOURCE_SUGGESTIONS: dict[str, list[str]] = {
    "html": ["https://developer.mozilla.org/en-US/docs/Web/HTML", "https://www.freecodecamp.org/"],
    "css": ["https://developer.mozilla.org/en-US/docs/Web/CSS", "https://css-tricks.com/"],
    "javascript": ["https://developer.mozilla.org/en-US/docs/Web/JavaScript", "https://javascript.info/"],
    "react": ["https://react.dev/learn", "https://www.freecodecamp.org/"],
    "python": ["https://docs.python.org/3/", "https://www.freecodecamp.org/"],
    "sql": ["https://www.postgresql.org/docs/", "https://www.w3schools.com/sql/"],
    "docker": ["https://docs.docker.com/get-started/", "https://www.youtube.com/"],
    "git": ["https://git-scm.com/doc", "https://docs.github.com/"],
    "figma": ["https://help.figma.com/", "https://www.youtube.com/"],
    "kubernetes": ["https://kubernetes.io/docs/tutorials/", "https://www.youtube.com/"],
}


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower())


def _find_template(target_career: str) -> list[list[str]]:
    normalized = _normalize(target_career)
    for key, template in CAREER_TEMPLATES.items():
        key_norm = _normalize(key)
        if key_norm in normalized or normalized in key_norm:
            return template
    for key in CAREER_TEMPLATES:
        for word in key.split():
            if word in normalized:
                return CAREER_TEMPLATES[key]
    return DEFAULT_TEMPLATE


def _suggest_resources(title: str) -> list[str]:
    resources: list[str] = []
    for keyword, links in RESOURCE_SUGGESTIONS.items():
        if keyword in _normalize(title):
            resources.extend(links)
    return list(dict.fromkeys(resources))


def build_rule_based_roadmap(
    target_career: str,
    current_skills: str = "",
    learning_hours: str = "",
) -> dict[str, Any]:
    """Buat roadmap offline (rule-based) sebagai fallback tanpa API key."""
    template = _find_template(target_career)
    weeks = []
    for idx, (first, second) in enumerate(template, start=1):
        tasks = []
        for title in (first, second):
            tasks.append(
                {
                    "title": title,
                    "description": f"Materi untuk minggu {idx}: {title}.",
                    "resources": _suggest_resources(title),
                }
            )
        weeks.append({"week": idx, "title": f"Minggu {idx}", "tasks": tasks})

    return {
        "target_career": target_career,
        "duration_weeks": len(weeks),
        "source": "fallback",
        "weeks": weeks,
    }
