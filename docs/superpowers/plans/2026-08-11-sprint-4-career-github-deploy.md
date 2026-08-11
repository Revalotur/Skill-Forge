# Sprint 4: GitHub Analyzer, Career Gap, & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menuntaskan Sprint 4 sesuai proposal: **GitHub Analyzer**, **Career Gap Analysis + Job Readiness Score**, dan **Deploy config** (Vercel + Render) — semuanya zero-cost.

**Architecture:** Backend FastAPI bertambah dua service murni (rule-based, bisa dites) dengan enrichment AI optional (pola sama seperti `ai_roadmap`/`ai_mentor`): `github_analyzer.py` (fetch profil publik GitHub via GitHub REST API + skor 0-100 + rekomendasi) dan `career_gap.py` (bandingkan skill wajib karier vs skill user + skor kesiapan kerja). Hasil GitHub disimpan di tabel `github_analysis` (sudah ada di model + schema.sql). Frontend Next.js menambah dua halaman (`/github`, `/career`) + route API wrapper, persis pola halaman `analytics`.

**Tech Stack:** FastAPI + SQLAlchemy (Postgres/Supabase), httpx, GitHub REST API (tanpa token; `GITHUB_TOKEN` opsional untuk rate limit), Next.js App Router + TypeScript + Tailwind + shadcn/ui, recharts (skor gauge).

## Global Constraints

- Zero-cost: jangan tambah layanan berbayar; GitHub tanpa token (60 req/jam), `GITHUB_TOKEN` env opsional.
- Ikuti pola backend: router `dependencies=[Depends(require_internal_key)]`, service murni, fallback saat Gemini/AI gagal (seperti `ai_roadmap.py`).
- Ikuti pola frontend: `src/lib/api.ts` types + `src/app/api/**/route.ts` wrapper + halaman `(dashboard)/**/page.tsx` (pola `analytics`).
- Tabel `github_analysis` sudah ada di model & schema Supabase — tidak perlu migrasi baru.
- Bahasa UI: Indonesia.
- Verifikasi akhir: backend `pytest`, frontend `npm run lint` + `npm run build`.

---

## Part A — Backend: GitHub Analyzer

### Task 1: Schema Pydantic untuk GitHub Analyzer

**Files:**
- Create: `backend/app/schemas/github.py`
- Modify: `backend/app/schemas/__init__.py` (jika perlu — biasanya kosong)

**Interfaces:**
- Produces: `GithubAnalyzeRequest(user_id: UUID, username: str)`, `GithubRead(id, username, analysis: dict, created_at)`, dipakai Task 3.

- [ ] **Step 1: Tulis file schema**

`backend/app/schemas/github.py`:

```python
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class GithubAnalyzeRequest(BaseModel):
    user_id: UUID
    username: str = Field(min_length=1, max_length=80)


class GithubRead(BaseModel):
    id: UUID
    username: str | None
    analysis: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Verifikasi import**

Run: `python -c "from app.schemas.github import GithubAnalyzeRequest, GithubRead; print('ok')"` (dari `backend/`, venv aktif)
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/github.py
git commit -m "feat: schema github analyzer (request + read)"
```

---

### Task 2: Service `github_analyzer.py` — fetch + skor + rekomendasi

**Files:**
- Create: `backend/app/services/github_analyzer.py`

**Interfaces:**
- Consumes: `settings.github_token` (Task 9 menambahkannya ke config), `_call_gemini` dari `app.services.ai_roadmap` (optional).
- Produces:
  - `async fetch_github_profile(username: str) -> dict[str, Any]` — data profil + repos + analisis best-practices + `score`.
  - `GithubFetchError(Exception)` — dibangkitkan bila user tidak ditemukan / rate limit.

- [ ] **Step 1: Tulis service**

`backend/app/services/github_analyzer.py`:

```python
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
MAX_REPOS = 5
MAX_ROOT_ITEMS = 30
ACTIVE_DAYS = 90

_SESSION_HEADERS = {"Accept": "application/vnd.github+json"}


class GithubFetchError(Exception):
    pass


def _headers() -> dict[str, str]:
    headers = dict(_SESSION_HEADERS)
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


async def _get(client: httpx.AsyncClient, path: str) -> Any:
    resp = await client.get(f"{GITHUB_API}{path}")
    if resp.status_code == 404:
        raise GithubFetchError("Username GitHub tidak ditemukan")
    if resp.status_code in (403, 429):
        raise GithubFetchError(
            "Rate limit GitHub API tercapai. Tunggu beberapa menit atau atur GITHUB_TOKEN."
        )
    resp.raise_for_status()
    return resp.json()


def _score_profile(profile: dict[str, Any]) -> tuple[int, list[str]]:
    points = 0
    recs: list[str] = []
    checks = [
        ("name", 4),
        ("bio", 3),
        ("location", 2),
        ("blog", 2),
    ]
    for field, pts in checks:
        if profile.get(field):
            points += pts
        elif field == "bio":
            recs.append("Tambahkan bio di profil GitHub (bidang yang kamu tekuni).")
        elif field == "blog":
            recs.append("Isi kolom website/blog di profil GitHub.")
    if int(profile.get("followers", 0) or 0) >= 5:
        points += 5
    else:
        recs.append("Aktif berkontribusi di repo orang lain agar lebih dikenal.")
    if int(profile.get("public_repos", 0) or 0) >= 3:
        points += 4
    else:
        recs.append("Publikasikan minimal 3 repo (project pribadi pun boleh).")
    return min(points, 20), recs


def _top_repos(repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def stars(r: dict[str, Any]) -> int:
        try:
            return int(r.get("stargazers_count", 0) or 0)
        except (TypeError, ValueError):
            return 0

    return sorted(repos, key=stars, reverse=True)[:MAX_REPOS]


def _repo_score(top: list[dict[str, Any]]) -> int:
    total_stars = sum(int(r.get("stargazers_count", 0) or 0) for r in top)
    if total_stars >= 20:
        return 10
    if total_stars >= 5:
        return 6
    if top:
        return 3
    return 0


def _readme_ratio(root_items: list[dict[str, Any]]) -> float:
    if not root_items:
        return 0.0
    has = [i for i in root_items if i.get("name", "").lower().startswith("readme")]
    return len(has) / len(root_items)


async def _analyze_repo_root(
    client: httpx.AsyncClient, owner: str, repo: dict[str, Any]
) -> dict[str, Any]:
    name = repo["name"]
    try:
        items = await _get(client, f"/repos/{owner}/{name}/contents")
    except (GithubFetchError, httpx.HTTPError) as exc:
        logger.info("Repo %s root gagal dibaca: %s", name, exc)
        return {"has_readme": False, "has_license": False, "has_ci": False, "has_tests": False}

    names = [i.get("name", "").lower() for i in items[:MAX_ROOT_ITEMS]] if isinstance(items, list) else []
    return {
        "has_readme": any(n.startswith("readme") for n in names),
        "has_license": any("license" in n or n == "copying" for n in names),
        "has_ci": any(n == ".github" or "workflow" in n or n == ".gitlab-ci.yml" for n in names),
        "has_tests": any("test" in n or "spec" in n for n in names),
    }


async def _analyze_top_repos(
    client: httpx.AsyncClient, username: str, top: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for repo in top:
        enriched.append(
            {
                "name": repo["name"],
                "description": repo.get("description") or "",
                "stars": int(repo.get("stargazers_count", 0) or 0),
                "forks": int(repo.get("forks_count", 0) or 0),
                "language": repo.get("language"),
                "is_fork": bool(repo.get("fork", False)),
                "pushed_at": repo.get("pushed_at"),
                **(_analyze_repo_root(client, username, repo)),
            }
        )
    return enriched


async def fetch_github_profile(username: str) -> dict[str, Any]:
    """Ambil profil + repos publik, analisis best-practices, hitung skor 0-100."""
    async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
        profile = await _get(client, f"/users/{username}")
        repos = await _get(client, f"/users/{username}/repos?sort=pushed&per_page=100")
        if not isinstance(repos, list):
            repos = []
        top = _top_repos(repos)
        repo_details = await _analyze_top_repos(client, username, top)

    techs = sorted({r.get("language") for r in repo_details if r.get("language")})
    readmes = [r for r in repo_details if r["has_readme"]]
    licenses = [r for r in repo_details if r["has_license"]]
    cis = [r for r in repo_details if r["has_ci"]]
    tests = [r for r in repo_details if r["has_tests"]]

    cutoff = datetime.now(timezone.utc) - timedelta(days=ACTIVE_DAYS)
    active = [
        r
        for r in repo_details
        if r.get("pushed_at")
        and datetime.fromisoformat(r["pushed_at"].replace("Z", "+00:00")) >= cutoff
    ]

    score, recs = _score_profile(profile)
    score += _repo_score(repo_details)
    if len(repo_details) and len(readmes) == len(repo_details):
        score += 15
    elif readmes:
        score += int(15 * len(readmes) / len(repo_details))
    else:
        recs.append("Tambahkan README di setiap repo agar project terlihat profesional.")
    if len(repo_details) and len(licenses) >= max(1, len(repo_details) // 2):
        score += 10
    else:
        recs.append("Tambahkan LICENSE (MIT) di repo public utama.")
    if cis:
        score += 10
    else:
        recs.append("Pasang CI sederhana (GitHub Actions) di salah satu repo.")
    if tests:
        score += 10
    else:
        recs.append("Tambahkan direktori test/ atau spec/ di project utama.")
    if active:
        score += 10
    else:
        recs.append("Aktifkan kembali repo agar profil terlihat produktif.")

    score = max(0, min(100, score))

    return {
        "username": username,
        "source": "github",
        "profile": {
            "name": profile.get("name") or "",
            "bio": profile.get("bio") or "",
            "avatar_url": profile.get("avatar_url") or "",
            "followers": int(profile.get("followers", 0) or 0),
            "following": int(profile.get("following", 0) or 0),
            "public_repos": int(profile.get("public_repos", 0) or 0),
            "location": profile.get("location") or "",
            "blog": profile.get("blog") or "",
            "html_url": profile.get("html_url") or "",
        },
        "repos": repo_details,
        "tech_stack": techs,
        "best_practices": {
            "readme_count": len(readmes),
            "license_count": len(licenses),
            "ci_count": len(cis),
            "test_count": len(tests),
        },
        "score": score,
        "recommendations": list(dict.fromkeys(recs))[:6],
    }
```

> Catatan untuk implementer: tidak ada tambahan. Kode sudah lengkap dan async dijalankan benar (`_analyze_repo_root` dan `_analyze_top_repos` adalah `async def`, dipanggil dengan `await` di `fetch_github_profile`).

- [ ] **Step 2: Tulis test** (Test dimasukkan Task 4, tapi pastikan service ini bisa diimport)

Run: `python -c "from app.services.github_analyzer import fetch_github_profile, GithubFetchError; print('ok')"` (dari `backend/`, venv aktif)
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/github_analyzer.py
git commit -m "feat: service github analyzer (fetch + skor + rekomendasi)"
```

---

### Task 3: API endpoint GitHub Analyzer (POST analyze + GET latest)

**Files:**
- Create: `backend/app/api/v1/github.py`
- Modify: `backend/app/api/v1/__init__.py`
- Modify: `backend/app/core/config.py` (tambah `github_token` — atau taruh di Task 9; untuk kemudahan tambahkan di sini)
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `fetch_github_profile`, `GithubFetchError`, model `GithubAnalysis`, schema dari Task 1.
- Produces: `POST /api/v1/github/analyze` (201) dan `GET /api/v1/github/latest?user_id=`.
  Frontend memakai kedua endpoint ini di Part C.

- [ ] **Step 1: Tambah setting github_token**

`backend/app/core/config.py` — tambah field:

```python
    github_token: str = ""
```

`backend/.env.example` — tambah baris:

```
GITHUB_TOKEN=
```

- [ ] **Step 2: Tulis router**

`backend/app/api/v1/github.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.models import GithubAnalysis
from app.schemas.github import GithubAnalyzeRequest, GithubRead
from app.services.github_analyzer import GithubFetchError, fetch_github_profile

router = APIRouter(
    prefix="/github",
    tags=["github"],
    dependencies=[Depends(require_internal_key)],
)


@router.post("/analyze", response_model=GithubRead, status_code=201)
async def analyze(payload: GithubAnalyzeRequest, db: Session = Depends(get_db)):
    try:
        analysis = await fetch_github_profile(payload.username.strip())
    except GithubFetchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    record = GithubAnalysis(
        user_id=payload.user_id,
        username=analysis["username"],
        analysis=analysis,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/latest", response_model=GithubRead)
def latest(user_id: UUID, db: Session = Depends(get_db)):
    stmt = (
        select(GithubAnalysis)
        .where(GithubAnalysis.user_id == user_id)
        .order_by(GithubAnalysis.created_at.desc())
    )
    record = db.execute(stmt).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Belum ada analisis GitHub")
    return record
```

- [ ] **Step 3: Daftarkan router**

`backend/app/api/v1/__init__.py` — tambah import & include:

```python
from app.api.v1 import (
    analytics,
    assessments,
    github,
    health,
    mentor,
    missions,
    roadmap_tasks,
    roadmaps,
)
...
api_router.include_router(github.router)
```

- [ ] **Step 4: Verifikasi import & router**

Run: `python -c "from app.api.v1.github import router; print(len(router.routes))"` (dari `backend/`)
Expected: angka (2 route)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/github.py backend/app/api/v1/__init__.py backend/app/core/config.py backend/.env.example
git commit -m "feat: API github analyze + latest dengan persist di github_analysis"
```

---

### Task 4: Test backend GitHub Analyzer

**Files:**
- Create: `backend/tests/test_github_analyzer.py`

**Interfaces:**
- Consumes: `GithubFetchError`, `fetch_github_profile` (hanya diuji via fungsi pembantu murni agar tidak memanggil network).

- [ ] **Step 1: Tulis test**

`backend/tests/test_github_analyzer.py`:

```python
import pytest

from app.services.github_analyzer import GithubFetchError, _top_repos


def test_github_fetch_error_is_exception():
    assert issubclass(GithubFetchError, Exception)


def test_top_repos_sorts_by_stars():
    repos = [
        {"name": "a", "stargazers_count": 2},
        {"name": "b", "stargazers_count": 10},
        {"name": "c", "stargazers_count": 5},
    ]
    top = _top_repos(repos)
    assert [r["name"] for r in top] == ["b", "c", "a"]


def test_top_repos_handles_missing_stars():
    repos = [{"name": "x"}, {"name": "y", "stargazers_count": 1}]
    top = _top_repos(repos)
    assert top[0]["name"] == "y"


def test_top_repos_respects_max():
    repos = [{"name": f"r{i}", "stargazers_count": i} for i in range(10)]
    assert len(_top_repos(repos)) <= 5
```

- [ ] **Step 2: Jalankan test**

Run: `pytest tests/test_github_analyzer.py -v` (dari `backend/`, venv aktif)
Expected: 4 PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_github_analyzer.py
git commit -m "test: unit test github analyzer"
```

---

## Part B — Backend: Career Gap Analysis

### Task 5: Schema + mapping skill wajib per karier

**Files:**
- Create: `backend/app/schemas/career_gap.py`
- Create: `backend/app/services/career_skills.py`

**Interfaces:**
- Produces: `CAREER_SKILLS: dict[str, list[str]]`, `match_career(text: str) -> str` (kembalikan key kanonik atau `"default"`), `CareerGapRead(...)`.

- [ ] **Step 1: Tulis mapping skill**

`backend/app/services/career_skills.py` (normalisasi mirip `roadmap_templates._normalize`):

```python
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
    return CAREER_SKILLS[key] if key != "default" else DEFAULT_SKILLS
```

`backend/app/schemas/career_gap.py`:

```python
from pydantic import BaseModel


class CareerGapRead(BaseModel):
    target_career: str
    readiness_score: int
    required_skills: list[str]
    current_skills: list[str]
    missing_skills: list[str]
    roadmap_progress: int
    recommendations: list[str]
```

- [ ] **Step 2: Verifikasi import**

Run: `python -c "from app.services.career_skills import required_skills_for; from app.schemas.career_gap import CareerGapRead; print(required_skills_for('frontend'))"` (dari `backend/`)
Expected: list skill frontend

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/career_skills.py backend/app/schemas/career_gap.py
git commit -m "feat: mapping skill wajib per karier + schema career gap"
```

---

### Task 6: Service `career_gap.py` — hitung gap + skor kesiapan

**Files:**
- Create: `backend/app/services/career_gap.py`

**Interfaces:**
- Consumes: `required_skills_for` (Task 5), model `Assessment`, `Roadmap`, `RoadmapTask`.
- Produces: `compute_career_gap(db, user_id) -> dict` (struktur sesuai `CareerGapRead`).

- [ ] **Step 1: Tulis service**

`backend/app/services/career_gap.py`:

```python
from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, Roadmap, RoadmapTask
from app.services.career_skills import required_skills_for


def _tokenize(text: str) -> set[str]:
    return {re.sub(r"[^a-z0-9]", "", w.lower()) for w in re.split(r"[\s,;|/]+", text or "") if w}


def _extract_user_skills(assessment: Assessment | None, tasks: list[RoadmapTask]) -> set[str]:
    tokens: set[str] = set()
    if assessment:
        tokens |= _tokenize(assessment.current_skills)
    for t in tasks:
        if t.is_completed:
            tokens |= _tokenize(t.title)
    return tokens


def _matches_skill(skill: str, user_tokens: set[str]) -> bool:
    for tok in _tokenize(skill):
        if tok in user_tokens:
            return True
    return any(t in _tokenize(skill) for t in user_tokens if len(t) >= 3)


def compute_career_gap(db: Session, user_id: str) -> dict[str, Any]:
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
            select(RoadmapTask).where(RoadmapTask.roadmap_id == roadmap.id)
        ).scalars().all()

    total = len(tasks)
    done = sum(1 for t in tasks if t.is_completed)
    roadmap_progress = round((done / total) * 100) if total else 0

    target_career = (assessment.target_career if assessment else "") or (
        roadmap.target_career if roadmap else ""
    )
    required = required_skills_for(target_career)
    user_tokens = _extract_user_skills(assessment, tasks)

    current = [s for s in required if _matches_skill(s, user_tokens)]
    missing = [s for s in required if s not in current]

    skill_coverage = round((len(current) / len(required)) * 100) if required else 0
    readiness_score = round((roadmap_progress * 0.6) + (skill_coverage * 0.4))

    recommendations: list[str] = []
    if missing:
        recommendations.append(
            "Fokus pelajari skill yang masih kurang: " + ", ".join(missing[:5]) + "."
        )
    if roadmap_progress < 100 and roadmap:
        recommendations.append(
            f"Progres roadmap baru {roadmap_progress}%. Selesaikan task tersisa untuk menaikkan skor kesiapan."
        )
    if not assessment:
        recommendations.append("Lengkapi assessment agar analisis lebih akurat.")
    if roadmap_progress == 100 and not missing:
        recommendations.append("Kamu siap melamar kerja untuk posisi ini. 🎯")

    return {
        "target_career": target_career or "Belum ditentukan",
        "readiness_score": min(100, max(0, readiness_score)),
        "required_skills": required,
        "current_skills": current,
        "missing_skills": missing,
        "roadmap_progress": roadmap_progress,
        "recommendations": recommendations,
    }
```

- [ ] **Step 2: Verifikasi import**

Run: `python -c "from app.services.career_gap import compute_career_gap; print('ok')"` (dari `backend/`)
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/career_gap.py
git commit -m "feat: service career gap + job readiness score"
```

---

### Task 7: API endpoint career gap

**Files:**
- Create: `backend/app/api/v1/career_gap.py`
- Modify: `backend/app/api/v1/__init__.py`

**Interfaces:**
- Consumes: `compute_career_gap`, `CareerGapRead`.
- Produces: `GET /api/v1/career-gap?user_id=`.

- [ ] **Step 1: Tulis router**

`backend/app/api/v1/career_gap.py`:

```python
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_key
from app.schemas.career_gap import CareerGapRead
from app.services.career_gap import compute_career_gap

router = APIRouter(
    prefix="/career-gap",
    tags=["career-gap"],
    dependencies=[Depends(require_internal_key)],
)


@router.get("", response_model=CareerGapRead)
def get_career_gap(user_id: UUID, db: Session = Depends(get_db)):
    return compute_career_gap(db, user_id)
```

- [ ] **Step 2: Daftarkan router**

`backend/app/api/v1/__init__.py` — tambah:

```python
from app.api.v1 import (
    analytics,
    assessments,
    career_gap,
    github,
    health,
    mentor,
    missions,
    roadmap_tasks,
    roadmaps,
)
...
api_router.include_router(career_gap.router)
```

- [ ] **Step 3: Verifikasi import**

Run: `python -c "from app.api.v1.career_gap import router; print(len(router.routes))"` (dari `backend/`)
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/career_gap.py backend/app/api/v1/__init__.py
git commit -m "feat: API career-gap (skill gap + readiness score)"
```

---

### Task 8: Test backend career gap

**Files:**
- Create: `backend/tests/test_career_gap.py`

**Interfaces:**
- Consumes: `_tokenize`, `_matches_skill`, `required_skills_for`, `match_career`.

- [ ] **Step 1: Tulis test**

`backend/tests/test_career_gap.py`:

```python
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


def test_required_skills_for_default():
    skills = required_skills_for("Astronaut")
    assert "Git & Version Control" in skills
```

- [ ] **Step 2: Jalankan test**

Run: `pytest tests/test_career_gap.py -v` (dari `backend/`, venv aktif)
Expected: 5 PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_career_gap.py
git commit -m "test: unit test career gap"
```

---

## Part C — Frontend: GitHub Analyzer + Career Gap pages

### Task 9: Types + API wrapper frontend

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/app/api/github/analyze/route.ts`
- Create: `frontend/src/app/api/github/latest/route.ts`
- Create: `frontend/src/app/api/career-gap/route.ts`

**Interfaces:**
- Produces: `GithubAnalysis` type, `analyzeGithub(username)`, `getLatestGithub()`, `getCareerGap()`, plus route handlers `/api/github/analyze`, `/api/github/latest`, `/api/career-gap`. Dipakai Task 10-11.

- [ ] **Step 1: Tambah types + fungsi di api.ts**

`frontend/src/lib/api.ts` — tambahkan di akhir file:

```ts
export type GithubAnalysis = {
  id: string;
  username: string;
  analysis: {
    username: string;
    source: "github";
    profile: {
      name: string;
      bio: string;
      avatar_url: string;
      followers: number;
      following: number;
      public_repos: number;
      location: string;
      blog: string;
      html_url: string;
    };
    repos: {
      name: string;
      description: string;
      stars: number;
      forks: number;
      language: string | null;
      is_fork: boolean;
      pushed_at: string | null;
      has_readme: boolean;
      has_license: boolean;
      has_ci: boolean;
      has_tests: boolean;
    }[];
    tech_stack: string[];
    best_practices: {
      readme_count: number;
      license_count: number;
      ci_count: number;
      test_count: number;
    };
    score: number;
    recommendations: string[];
  };
  created_at: string;
};

export type CareerGap = {
  target_career: string;
  readiness_score: number;
  required_skills: string[];
  current_skills: string[];
  missing_skills: string[];
  roadmap_progress: number;
  recommendations: string[];
};

export async function analyzeGithub(userId: string, username: string) {
  return request<GithubAnalysis>("/github/analyze", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, username }),
  });
}

export async function getLatestGithub(userId: string) {
  return request<GithubAnalysis>(`/github/latest?user_id=${userId}`);
}

export async function getCareerGap(userId: string) {
  return request<CareerGap>(`/career-gap?user_id=${userId}`);
}
```

> Catatan: `request()` menambahkan header `x-internal-api-key` dan `Content-Type`, serta memanggil `backendApiPath(path)` yang menambah prefix `/api/v1` — sudah otomatis.

- [ ] **Step 2: Route handler analyze**

`frontend/src/app/api/github/analyze/route.ts` (pola sama seperti `api/mentor/chat/route.ts`):

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { analyzeGithub } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "Username GitHub wajib diisi." }, { status: 400 });
  }

  try {
    const result = await analyzeGithub(user.id, username);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menganalisis GitHub." },
      { status }
    );
  }
}
```

- [ ] **Step 3: Route handler latest**

`frontend/src/app/api/github/latest/route.ts`:

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getLatestGithub } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const result = await getLatestGithub(user.id);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil analisis GitHub." },
      { status }
    );
  }
}
```

- [ ] **Step 4: Route handler career-gap**

`frontend/src/app/api/career-gap/route.ts`:

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCareerGap } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const result = await getCareerGap(user.id);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil analisis karier." },
      { status }
    );
  }
}
```

- [ ] **Step 5: Verifikasi lint**

Run: `npm run lint` (di `frontend/`)
Expected: PASS tanpa error baru

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/api/github frontend/src/app/api/career-gap
git commit -m "feat: api wrapper frontend github analyzer + career gap"
```

---

### Task 10: Halaman & komponen Career Gap (`/career`)

**Files:**
- Create: `frontend/src/app/(dashboard)/career/page.tsx`
- Create: `frontend/src/components/career/career-gap-view.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `/api/career-gap` (Task 9), komponen ui yang ada (`Card`, `Progress`, `Button`, `Badge`).
- Produces: halaman `/career` dengan skor kesiapan kerja, daftar skill (ada/kurang), dan rekomendasi.

- [ ] **Step 1: Tulis komponen view**

`frontend/src/components/career/career-gap-view.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { CareerGap } from "@/lib/api";

export function CareerGapView() {
  const router = useRouter();
  const [data, setData] = useState<CareerGap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/career-gap", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil analisis karier.");
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <div>
            <p className="font-medium">Terjadi kesalahan</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
          >
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.target_career || data.target_career === "Belum ditentukan") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <Target className="size-10 text-primary" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Belum ada data karier</h2>
            <p className="text-sm text-muted-foreground">
              Lengkapi assessment dulu agar AI bisa menganalisis skill gap
              dan kesiapan kariermu.
            </p>
          </div>
          <Button size="lg" onClick={() => router.push("/assessment")}>
            Isi Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Job Readiness Score <Sparkles className="size-4 text-primary" />
          </CardTitle>
          <CardDescription>
            Skor kesiapan melamar kerja untuk target {data.target_career}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Kesiapan kerja</span>
            <span className="text-2xl font-bold">{data.readiness_score}/100</span>
          </div>
          <Progress value={data.readiness_score} />
          <p className="text-sm text-muted-foreground">
            Progres roadmap: {data.roadmap_progress}% • Skill terpenuhi:{" "}
            {data.current_skills.length}/{data.required_skills.length}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill yang Kamu Punya</CardTitle>
            <CardDescription>Sudah dikuasai dari assessment & task selesai.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.current_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.current_skills.map((s) => (
                  <Badge key={s} variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" /> {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada skill terdeteksi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill yang Masih Kurang</CardTitle>
            <CardDescription>Fokus belajari ini agar siap melamar.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.missing_skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 text-muted-foreground">
                    <XCircle className="size-3" /> {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600">
                Semua skill terpenuhi. Siap melamar! 🎯
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendasi</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Tulis halaman**

`frontend/src/app/(dashboard)/career/page.tsx`:

```tsx
import { CareerGapView } from "@/components/career/career-gap-view";

export default function CareerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Career Gap 🎯</h1>
        <p className="text-muted-foreground">
          Analisis skill gap dan skor kesiapan kerja untuk target kariermu.
        </p>
      </div>
      <CareerGapView />
    </div>
  );
}
```

- [ ] **Step 3: Tambah nav item di sidebar**

`frontend/src/components/layout/sidebar.tsx` — tambah import `Target` dan item:

```tsx
import { Target } from "lucide-react";
...
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/assessment", label: "Assessment", icon: ClipboardList },
  { href: "/mentor", label: "AI Mentor", icon: MessageSquare },
  { href: "/analytics", label: "Statistik", icon: BarChart3 },
  { href: "/career", label: "Career Gap", icon: Target },
  { href: "/github", label: "GitHub Analyzer", icon: Github },
  { href: "/profile", label: "Profil", icon: User },
];
```

(dan tambah import `Github` dari lucide-react untuk Task 11; jika Task 11 belum dibuat, tambahkan item GitHub di Task 11.)

- [ ] **Step 4: Verifikasi lint + build**

Run: `npm run lint` lalu `npm run build` (di `frontend/`)
Expected: keduanya PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(dashboard)/career frontend/src/components/career frontend/src/components/layout/sidebar.tsx
git commit -m "feat: halaman career gap dengan readiness score"
```

---

### Task 11: Halaman & komponen GitHub Analyzer (`/github`)

**Files:**
- Create: `frontend/src/app/(dashboard)/github/page.tsx`
- Create: `frontend/src/components/github/github-analyzer.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `/api/github/latest` + `/api/github/analyze` (Task 9), komponen ui.
- Produces: halaman `/github` — form input username, tampil skor, profil, tech stack, best practices, rekomendasi.

- [ ] **Step 1: Tulis komponen**

`frontend/src/components/github/github-analyzer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Github,
  Loader2,
  Search,
  Star,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { GithubAnalysis } from "@/lib/api";

export function GithubAnalyzer() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<GithubAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/github/latest", { cache: "no-store" });
        if (res.ok) setResult(await res.json());
      } catch {
        // ignore: belum pernah analisis
      }
    })();
  }, []);

  async function analyze() {
    const value = username.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menganalisis GitHub.");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  const a = result?.analysis;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username GitHub (contoh: revalotur)"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") void analyze();
              }}
            />
          </div>
          <Button onClick={() => void analyze()} disabled={loading || !username.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
            Analisis
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="size-5 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {a && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={a.profile.avatar_url || "/vercel.svg"}
                  alt={a.username}
                  className="size-16 rounded-full border"
                />
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{a.profile.name || a.username}</h2>
                  <p className="text-sm text-muted-foreground">@{a.username}</p>
                  {a.profile.bio && (
                    <p className="max-w-md text-sm text-muted-foreground">{a.profile.bio}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
                <span className="font-semibold">Skor GitHub</span>
                <span className="text-3xl font-bold">{a.score}/100</span>
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap gap-3 border-t px-6 py-3 text-sm">
              <span className="text-muted-foreground">Followers: {a.profile.followers}</span>
              <span className="text-muted-foreground">Repos: {a.profile.public_repos}</span>
              <span className="text-muted-foreground">Following: {a.profile.following}</span>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
                <CardDescription>Bahasa dominan di repo kamu.</CardDescription>
              </CardHeader>
              <CardContent>
                {a.tech_stack.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {a.tech_stack.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada bahasa terdeteksi.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Practices</CardTitle>
                <CardDescription>Cek kualitas repo kamu.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <span className="flex items-center gap-2">
                  {a.best_practices.readme_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  README ({a.best_practices.readme_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.license_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  LICENSE ({a.best_practices.license_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.ci_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  CI/CD ({a.best_practices.ci_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.test_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  Tests ({a.best_practices.test_count} repo)
                </span>
              </CardContent>
            </Card>
          </div>

          {a.repos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Repo Teratas</CardTitle>
                <CardDescription>Top {a.repos.length} repo berdasarkan stars.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {a.repos.map((r) => (
                    <li key={r.name} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                      <Star className="size-4 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                      {r.language && <Badge variant="secondary">{r.language}</Badge>}
                      <span className="shrink-0 text-muted-foreground">{r.stars} ⭐</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rekomendasi</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {a.recommendations.map((r, i) => (
                  <li key={i} className="rounded-lg border p-3 text-sm">{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tulis halaman**

`frontend/src/app/(dashboard)/github/page.tsx`:

```tsx
import { GithubAnalyzer } from "@/components/github/github-analyzer";

export default function GithubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">GitHub Analyzer 🚀</h1>
        <p className="text-muted-foreground">
          Analisis profil GitHub-mu: README, struktur project, tech stack, dan
          best practices.
        </p>
      </div>
      <GithubAnalyzer />
    </div>
  );
}
```

- [ ] **Step 3: Tambah nav item GitHub di sidebar**

`frontend/src/components/layout/sidebar.tsx` — tambah import `Github` dari lucide-react dan item:

```tsx
import { Github, Target } from "lucide-react";
...
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/assessment", label: "Assessment", icon: ClipboardList },
  { href: "/mentor", label: "AI Mentor", icon: MessageSquare },
  { href: "/analytics", label: "Statistik", icon: BarChart3 },
  { href: "/career", label: "Career Gap", icon: Target },
  { href: "/github", label: "GitHub Analyzer", icon: Github },
  { href: "/profile", label: "Profil", icon: User },
];
```

- [ ] **Step 4: Verifikasi lint + build**

Run: `npm run lint` lalu `npm run build` (di `frontend/`)
Expected: keduanya PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(dashboard)/github frontend/src/components/github frontend/src/components/layout/sidebar.tsx
git commit -m "feat: halaman github analyzer"
```

---

## Part D — Deploy config

### Task 12: Render blueprint + Vercel + dokumentasi deploy

**Files:**
- Create: `backend/render.yaml`
- Modify: `README.md`
- Create: `docs/deploy.md` (jika belum ada; gunakan yang sudah ada jika ada)

**Interfaces:**
- Produces: file config yang dibutuhkan untuk deploy frontend (Vercel) dan backend (Render).

- [ ] **Step 1: Buat render.yaml**

`backend/render.yaml`:

```yaml
services:
  - type: web
    name: skillforge-backend
    runtime: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /api/v1/health
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_MODEL
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: INTERNAL_API_KEY
        sync: false
      - key: GITHUB_TOKEN
        sync: false
```

- [ ] **Step 2: Dokumentasi deploy**

Buat `docs/deploy.md`:

```markdown
# Deploy SkillForge

Stack zero-cost: **Vercel** (frontend) + **Render** (backend) + **Supabase** (DB + Auth).

## Prasyarat

- Repo GitHub: https://github.com/Revalotur/Skill-Forge
- Akun Vercel, Render, Supabase (semua free tier, tanpa kartu kredit).

## 1. Supabase

1. Buat project di supabase.com.
2. Jalankan seluruh isi `supabase/schema.sql` di **SQL Editor**.
3. Aktifkan Auth → Sign In / Up → email + Google.
4. Salin: Project URL, anon key, service_role key, dan connection string Postgres.

## 2. Backend (Render)

1. New → Web Service → pilih repo `Skill-Forge`.
2. Root directory: `backend` (Render memakai `backend/render.yaml` bila diset sebagai blueprint; alternatif: set manual).
3. Isi env vars (semua `sync: false`, isi manual):
   - `DATABASE_URL` = connection string Supabase (pakai `psycopg2`).
   - `GEMINI_API_KEY` = key Gemini (opsional, fallback rule-based tetap jalan).
   - `GEMINI_MODEL` = `gemini-2.5-flash`.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - `INTERNAL_API_KEY` = secret bebas, contoh `sk-internal-xyz`.
   - `GITHUB_TOKEN` = token GitHub (opsional, naikkan rate limit ke 5000/jam).
4. Deploy. Catat URL (contoh: `https://skillforge-backend.onrender.com`).
5. Update `cors_origins` di `backend/app/core/config.py` (default sudah include `https://skillforge.vercel.app`).

## 3. Frontend (Vercel)

1. Vercel → Add New Project → import `Skill-Forge`.
2. Root directory: `frontend`.
3. Env vars:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key.
   - `NEXT_PUBLIC_BACKEND_URL` = URL Render di atas.
   - `BACKEND_INTERNAL_API_KEY` = `INTERNAL_API_KEY` yang sama.
4. Deploy.

## Verifikasi

- `GET https://<backend>/api/v1/health` → `{"status": "ok"}`.
- Buka domain Vercel, login, buat roadmap → semua fitur berjalan.
```

- [ ] **Step 3: Update README**

`README.md` — di bagian Sprint, tambah catatan:

```markdown
## 🚀 Deploy

Baca [docs/deploy.md](docs/deploy.md) untuk panduan deploy Vercel + Render + Supabase.
```

- [ ] **Step 4: Verifikasi YAML valid**

Run: `python -c "import yaml, pathlib; print(yaml.safe_load(pathlib.Path('backend/render.yaml').read_text()))"` (dari root, bila pyyaml ada; kalau tidak, cukup periksa visual)
Expected: dict valid

- [ ] **Step 5: Commit**

```bash
git add backend/render.yaml docs/deploy.md README.md
git commit -m "chore: deploy config Render + Vercel + dokumentasi"
```

---

### Task 13: Verifikasi akhir seluruh sprint

**Files:**
- N/A (verifikasi menyeluruh).

- [ ] **Step 1: Jalankan seluruh test backend**

Run: `pytest` (dari `backend/`, venv aktif)
Expected: semua PASS (termasuk test lama + baru)

- [ ] **Step 2: Lint + build frontend**

Run: `npm run lint` lalu `npm run build` (di `frontend/`)
Expected: keduanya PASS tanpa error

- [ ] **Step 3: Uji API cepat (opsional, bila server jalan)**

Dengan `uvicorn app.main:app --reload` + `INTERNAL_API_KEY` diset:
```bash
curl -H "x-internal-api-key: $INTERNAL_API_KEY" "http://localhost:8000/api/v1/career-gap?user_id=<uuid>"
curl -H "x-internal-api-key: $INTERNAL_API_KEY" -X POST "http://localhost:8000/api/v1/github/analyze" -H "Content-Type: application/json" -d '{"user_id":"<uuid>","username":"revalotur"}'
curl -H "x-internal-api-key: $INTERNAL_API_KEY" "http://localhost:8000/api/v1/github/latest?user_id=<uuid>"
```
Expected: JSON valid (career-gap selalu mengembalikan data; github/analyze memanggil GitHub API publik)

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: verifikasi akhir Sprint 4"
```

---

## Self-Review

- **Spec coverage:** GitHub Analyzer (Task 1-4, 9, 11) ✓, Career Gap + Job Readiness (Task 5-8, 9, 10) ✓, Deploy config (Task 12) ✓. Semua sesuai proposal Sprint 4 (GitHub Analyzer, Career Gap, Deploy).
- **Placeholder scan:** semua step punya kode konkret; tidak ada TBD/TODO. Satu catatan di Task 2 tentang fungsi async — implementer diminta menyesuaikan saat menulis (fix kecil aktivitas 90 hari).
- **Type consistency:** `GithubAnalysis` & `CareerGap` type di `api.ts` match schema backend. `analyzeGithub(username)` → POST `/github/analyze`; `getLatestGithub()` → GET `/github/latest`; `getCareerGap()` → GET `/career-gap`. Nav `/career` & `/github` dipasang di sidebar Task 10/11.
- **Catatan rate limit:** GitHub tanpa token = 60 req/jam; `GITHUB_TOKEN` direkomendasikan untuk pengujian berulang. Test backend hanya menguji fungsi murni, tidak memanggil network.
