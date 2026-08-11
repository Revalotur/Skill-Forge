# Sprint 5: Hardening + Edit Roadmap + Adaptive Roadmap

**Tanggal:** 2026-08-11
**Repo:** https://github.com/Revalotur/Skill-Forge
**Cabang:** `main`
**Base:** `b19ea0c` (akhir Sprint 4)

## Konteks

Sprint 4 selesai (GitHub Analyzer, Career Gap, deploy config). Sprint 5 menstabilkan backend, melengkapi edit roadmap, dan menambah adaptive roadmap. Deploy (#21) dan CV Analyzer (#17) ditunda ke Sprint 6 (deploy manual oleh user via `docs/deploy.md`).

## Goal

1. **Hardening & cleanup debt** — rate limit API (slowapi), fix 15 deferred minor dari review Sprint 4, security checklist.
2. **Edit Roadmap (#11)** — add/delete task & edit minggu (edit task title/desc sudah ada).
3. **Adaptive Roadmap (#20)** — roadmap menyesuaikan otomatis sesuai progres; task selesai dipertahankan, sisa minggu diregenerasi.

## Zero-Cost Constraint

- Tidak menambah layanan berbayar. `slowapi` dan `pypdf` gratis/MIT.
- Fallback rule-based tetap berjalan jika Gemini tidak tersedia.
- Bahasa UI: Indonesia.

---

## Part A — Hardening & Cleanup Debt

### Task 1: Rate limit API (slowapi)

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/core/security.py`
- Create: `backend/app/core/ratelimit.py`

**Interfaces:**
- Produces: decorator `rate_limit(times, minutes)` yang dipakai di route sensitif.

- [ ] **Step 1: Tambah dependency**

`backend/requirements.txt` — tambah:
```
slowapi==0.1.9
```

- [ ] **Step 2: Buat module rate limit**

`backend/app/core/ratelimit.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
```

- [ ] **Step 3: Pasang di app + exception handler**

`backend/app/main.py`:

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1 import api_router
from app.core.config import settings
from app.core.ratelimit import limiter

app = FastAPI(
    title="SkillForge API",
    version="0.1.0",
    description="Backend untuk platform AI Learning Roadmap SkillForge.",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Terlalu banyak permintaan. Coba lagi beberapa saat."},
        headers={
            "Retry-After": str(getattr(exc, "retry_after", "60")),
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
```

- [ ] **Step 4: Terapkan limit di route sensitif**

Semua route yang memanggil AI/network eksternal dan menulis DB:

`backend/app/api/v1/github.py` — tambah `@limiter.limit("10/minute")` di `analyze`; route harus menerima `request: Request`:

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.ratelimit import limiter

@router.post("/analyze", response_model=GithubRead, status_code=201)
@limiter.limit("10/minute")
async def analyze(request: Request, payload: GithubAnalyzeRequest, db: Session = Depends(get_db)):
```

`backend/app/api/v1/roadmaps.py` — `generate` dan `regenerate` (buat endpoint regenerate dahulu jika belum ada; cek route yang ada): `@limiter.limit("5/minute")` + param `request: Request`.

`backend/app/api/v1/mentor.py` — route chat: `@limiter.limit("20/minute")` + param `request: Request`.

`backend/app/api/v1/missions.py` — generate mission: `@limiter.limit("10/minute")`.

`backend/app/api/v1/roadmap_tasks.py` — `POST` (add task, Task 6): `@limiter.limit("30/minute")`.

> Catatan: route yang memakai decorator `@limiter.limit` WAJIB punya param `request: Request` di signature, dan urutan dekorator harus `@router.<method>` di atas `@limiter.limit`.

- [ ] **Step 5: Verifikasi**

Run: `pytest` (dari `backend/`, venv aktif). Semua test lama harus tetap PASS. Verifikasi app bisa import: `python -c "from app.main import app; print(len(app.routes))"`.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/app/core/ratelimit.py backend/app/main.py backend/app/api/v1/github.py backend/app/api/v1/roadmaps.py backend/app/api/v1/mentor.py backend/app/api/v1/missions.py
git commit -m "feat: rate limit API via slowapi"
```

---

### Task 2: Fix debt github_analyzer.py + github.py

**Files:**
- Modify: `backend/app/services/github_analyzer.py`
- Modify: `backend/app/api/v1/github.py`
- Modify: `backend/app/schemas/github.py`

**Interfaces:**
- Consumes: `GithubFetchError`, `fetch_github_profile`.
- Produces: error mapping yang benar (404/429/502), skor docstring akurat, `pushed_at` parsing aman.

- [ ] **Step 1: Fix `_readme_ratio` dead code**

`backend/app/services/github_analyzer.py` — hapus fungsi `_readme_ratio` (tidak dipakai).

- [ ] **Step 2: Fix docstring skor**

`fetch_github_profile` docstring: "hitung skor 0-100" → "hitung skor 0-85 (profile 20 + repo 10 + best practices 45 + aktivitas 10)".

- [ ] **Step 3: Fix `pushed_at` parsing aman**

Di `fetch_github_profile`, blok `active = [...]` memakai `datetime.fromisoformat(...)` yang bisa `ValueError` untuk string non-ISO. Ganti dengan helper:

```python
def _parse_pushed_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
```

Dan gunakan: `_parse_pushed_at(r.get("pushed_at"))`.

- [ ] **Step 4: Fix 403 ≠ selalu rate-limit**

Di `_get`, bedakan 403 dan 429:

```python
if resp.status_code == 404:
    raise GithubFetchError("Username GitHub tidak ditemukan")
if resp.status_code == 429 or (resp.status_code == 403 and resp.headers.get("x-ratelimit-remaining") == "0"):
    raise GithubFetchError(
        "Rate limit GitHub API tercapai. Tunggu beberapa menit atau atur GITHUB_TOKEN."
    )
```

- [ ] **Step 5: Fix error mapping di route**

`backend/app/api/v1/github.py` — `GithubFetchError` sebaiknya membawa status code sendiri. Ubah `GithubFetchError` menjadi kelas dengan atribut `status_code`:

```python
class GithubFetchError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code
```

Di `_get`: 404 → `status_code=404`, rate-limit → `status_code=429`, dan di `fetch_github_profile` untuk `httpx.HTTPError`/timeout dari upstream → `status_code=502`.

Route:

```python
except GithubFetchError as exc:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
```

- [ ] **Step 6: Fix username whitespace-only**

Di route `analyze`, sebelum memanggil service: jika `payload.username.strip()` kosong → `HTTPException(422, "Username GitHub wajib diisi")`.

- [ ] **Step 7: Verifikasi**

Run: `pytest`. Tambah test baru di `tests/test_github_analyzer.py`:
- `_parse_pushed_at` dengan string valid, invalid, None.
- `GithubFetchError` membawa status_code.

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/github_analyzer.py backend/app/api/v1/github.py backend/app/schemas/github.py backend/tests/test_github_analyzer.py
git commit -m "fix: error mapping github analyzer + pushed_at parsing aman"
```

---

### Task 3: Fix debt career_skills.py + career_gap.py

**Files:**
- Modify: `backend/app/services/career_skills.py`
- Modify: `backend/app/services/career_gap.py`
- Modify: `backend/tests/test_career_gap.py`

**Interfaces:**
- Produces: `required_skills_for` return copy, `_matches_skill` bersih, copy yang benar.

- [ ] **Step 1: `required_skills_for` return copy**

`career_skills.py`:

```python
def required_skills_for(target_career: str) -> list[str]:
    key = match_career(target_career)
    skills = CAREER_SKILLS[key] if key != "default" else DEFAULT_SKILLS
    return list(skills)
```

- [ ] **Step 2: Hapus klausa kedua `_matches_skill` redundant**

`career_gap.py`:

```python
def _matches_skill(skill: str, user_tokens: set[str]) -> bool:
    return any(tok in user_tokens for tok in _tokenize(skill))
```

> Perhatian: `test_matches_skill_finds_token` memakai `_matches_skill("JavaScript", {"html", "css", "javascript"})` — hasil tetap True karena token "javascript" ada. Verifikasi test tetap hijau.

- [ ] **Step 3: Perbaiki copy "Progres roadmap baru"**

`career_gap.py:81` — "Progres roadmap baru X%." → "Progres roadmap saat ini X%."

- [ ] **Step 4: Tambah test mapping skill**

`tests/test_career_gap.py` — tambah:

```python
def test_required_skills_for_known_career():
    skills = required_skills_for("Frontend Developer")
    assert "React" in skills


def test_required_skills_for_returns_copy():
    a = required_skills_for("Backend Engineer")
    b = required_skills_for("Backend Engineer")
    a.append("X")
    assert "X" not in b


def test_match_career_data_scientist():
    assert match_career("Data Scientist") == "data scientist"
```

- [ ] **Step 5: Verifikasi**

Run: `pytest`. Semua PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/career_skills.py backend/app/services/career_gap.py backend/tests/test_career_gap.py
git commit -m "fix: career skills copy + bersihkan matching + copy"
```

---

### Task 4: Type hints user_id UUID + fix frontend debt

**Files:**
- Modify: `backend/app/services/career_gap.py`
- Modify: `backend/app/services/ai_mentor.py`
- Modify: `backend/app/services/ai_mission.py`
- Modify: `backend/app/services/analytics.py` (jika ada `compute_streak`)
- Modify: `backend/app/api/v1/missions.py`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/career/career-gap-view.tsx`
- Modify: `frontend/src/components/github/github-analyzer.tsx`

**Interfaces:**
- Produces: type `user_id: UUID` konsisten di service, debt frontend bersih.

- [ ] **Step 1: Type hints UUID di service**

`career_gap.py` `compute_career_gap(db, user_id: str)` → `user_id: UUID` (import `from uuid import UUID`). Begitu juga:
- `ai_mentor.py` `extract_context_data(db, user_id: str)` → `UUID`
- `ai_mission.py` fungsi yang menerima `user_id`
- `analytics.py` `compute_streak(db, user_id)` → `UUID`
- `missions.py` route yang memanggilnya

Periksa apakah ada operasi string pada `user_id` (`.hex`, `.upper()`) — jika ada, sesuaikan atau gunakan `str(user_id)`. Jangan mengubah perilaku.

- [ ] **Step 2: Fix `GithubAnalysis.username` nullable**

`frontend/src/lib/api.ts` — `username: string` → `username: string | null` di type `GithubAnalysis`.

- [ ] **Step 3: Fix career-gap-view debt**

`frontend/src/components/career/career-gap-view.tsx`:
- `setError(null)` di awal `fetchData` (sebelum try) supaya error stale ter-clear saat retry sukses.
- Guard 0/0: di baris "Skill terpenuhi: X/Y" gunakan `data.required_skills.length > 0 ? `${data.current_skills.length}/${data.required_skills.length}` : "–"`.
- Rekomendasi kosong: tambah fallback "Belum ada rekomendasi." jika `data.recommendations.length === 0`.

- [ ] **Step 4: Fix github-analyzer debt**

`frontend/src/components/github/github-analyzer.tsx`:
- Hapus import `Progress` (tidak dipakai).
- Race latest-prefill: tambah guard `let stale = false; ... return () => { stale = true; };` di `useEffect`, cek `if (!stale) setResult(...)`.
- `<img>` avatar: tambah komentar eslint-disable satu baris di atasnya: `{/* eslint-disable-next-line @next/next/no-img-element */}` (avatar dari URL dinamis eksternal, `next/image` butuh remotePatterns).

- [ ] **Step 5: Verifikasi**

Run: `npm run lint` lalu `npm run build` (di `frontend/`). Backend: `pytest`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/career_gap.py backend/app/services/ai_mentor.py backend/app/services/ai_mission.py backend/app/services/analytics.py backend/app/api/v1/missions.py frontend/src/lib/api.ts frontend/src/components/career/career-gap-view.tsx frontend/src/components/github/github-analyzer.tsx
git commit -m "fix: type hint UUID + debt frontend (stale error, NaN, race)"
```

---

### Task 5: Endpoint test backend

**Files:**
- Create: `backend/tests/test_endpoints.py`

**Interfaces:**
- Consumes: `compute_career_gap`, route `/career-gap` pattern, `require_internal_key`.
- Produces: test endpoint empty-data dan auth guard.

- [ ] **Step 1: Tulis test**

`backend/tests/test_endpoints.py`:

```python
from unittest.mock import MagicMock

from fastapi import HTTPException
import pytest

from app.services.career_gap import compute_career_gap
from app.core.security import require_internal_key
from app.core.config import settings


def test_require_internal_key_valid():
    settings.internal_api_key = "sk-test"
    import asyncio
    asyncio.run(require_internal_key("sk-test"))


def test_require_internal_key_invalid():
    settings.internal_api_key = "sk-test"
    with pytest.raises(HTTPException) as exc:
        import asyncio
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
```

> Catatan: pastikan `compute_career_gap` dengan DB kosong mengembalikan `required_skills == []` (sesuai fix Task 5 Sprint 4: `required = required_skills_for("")` → setelah `match_career("")` return "default" → DEFAULT_SKILLS, bukan `[]`). Sesuaikan ekspektasi test dengan perilaku aktual: jika `target_career` kosong maka `required` = DEFAULT_SKILLS. Ubah assertion sesuai kenyataan, dan jika perlu tambah guard di service: `required = required_skills_for(target_career) if target_career else []`.

- [ ] **Step 2: Jalankan test**

Run: `pytest tests/test_endpoints.py -v`. Pastikan semua PASS. Jika assertion tidak cocok dengan perilaku aktual, perbaiki guard di service (bukan melemahkan test): di `compute_career_gap`, tambah `required = required_skills_for(target_career) if target_career else []` sehingga user tanpa data mendapat `required_skills=[]` (bukan daftar frontend).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_endpoints.py backend/app/services/career_gap.py
git commit -m "test: endpoint guard career gap + auth"
```

---

## Part B — Edit Roadmap

### Task 6: Backend add/delete roadmap task

**Files:**
- Modify: `backend/app/api/v1/roadmap_tasks.py`
- Modify: `backend/app/schemas/roadmap.py`
- Modify: `backend/app/api/v1/__init__.py` (jika perlu)

**Interfaces:**
- Produces: `POST /roadmap_tasks` (tambah task), `DELETE /roadmap_tasks/{id}` (hapus task).

- [ ] **Step 1: Tambah schema create**

`schemas/roadmap.py` — `RoadmapTaskCreate` sudah ada (week/title/description/resources). Tambahkan `roadmap_id: UUID` di dalamnya:

```python
class RoadmapTaskCreate(BaseModel):
    roadmap_id: UUID
    week: int
    title: str
    description: str = ""
    resources: list[str] = []
```

- [ ] **Step 2: Tambah route POST**

`api/v1/roadmap_tasks.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.roadmap import RoadmapTaskCreate, RoadmapTaskPatch, RoadmapTaskRead
from app.core.ratelimit import limiter

@router.post("", response_model=RoadmapTaskRead, status_code=201)
@limiter.limit("30/minute")
def create_task(request: Request, payload: RoadmapTaskCreate, db: Session = Depends(get_db)):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Judul task wajib diisi")

    roadmap = db.get(Roadmap, payload.roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap tidak ditemukan")

    task = RoadmapTask(
        roadmap_id=payload.roadmap_id,
        week=payload.week,
        title=title,
        description=payload.description.strip(),
        resources=payload.resources,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
```

- [ ] **Step 3: Tambah route DELETE**

```python
@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.get(RoadmapTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")
    db.delete(task)
    db.commit()
```

- [ ] **Step 4: Verifikasi**

Run: `pytest` (semua PASS) + verifikasi route count naik: `python -c "from app.api.v1.roadmap_tasks import router; print(len(router.routes))"` (3: GET PATCH POST DELETE → 4).

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/roadmap_tasks.py backend/app/schemas/roadmap.py
git commit -m "feat: add & delete roadmap task"
```

---

### Task 7: Frontend add/delete task UI

**Files:**
- Modify: `frontend/src/app/api/roadmap/tasks/route.ts` (perlu cek apakah ada)
- Create: `frontend/src/app/api/roadmap/tasks/[id]/route.ts` (cek apakah sudah ada route handler)
- Modify: `frontend/src/components/roadmap/roadmap-view.tsx`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `RoadmapTask` type, backend `POST/DELETE /roadmap_tasks`.
- Produces: tombol tambah task per minggu, tombol hapus task, route handler baru.

- [ ] **Step 1: Cek route handler existing**

Periksa `frontend/src/app/api/roadmap/tasks/` — apakah sudah ada `route.ts` (POST) dan `[id]/route.ts` (PATCH). Jika PATCH sudah ada, tambahkan handler DELETE di `[id]/route.ts` dan POST di `route.ts` (atau buat).

`frontend/src/app/api/roadmap/tasks/route.ts`:

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { addRoadmapTask } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const result = await addRoadmapTask(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal menambah task." }, { status });
  }
}
```

`frontend/src/app/api/roadmap/tasks/[id]/route.ts` — tambah handler `DELETE` (pola sama, panggil `deleteRoadmapTask(id)`).

- [ ] **Step 2: Tambah fungsi di api.ts**

```ts
export async function addRoadmapTask(payload: {
  roadmap_id: string;
  week: number;
  title: string;
  description?: string;
  resources?: string[];
}) {
  return request<RoadmapTask>("/roadmap_tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoadmapTask(taskId: string) {
  return request<void>(`/roadmap_tasks/${taskId}`, { method: "DELETE" });
}
```

- [ ] **Step 3: UI di roadmap-view.tsx**

Di `roadmap-view.tsx`:
- Tambah state `addingWeek: number | null`, `newTaskTitle`, `newTaskDesc`.
- Per minggu, tombol kecil "+ Tambah Task" (icon `Plus`) yang membuka input inline.
- Di setiap task (mode non-edit), tombol hapus (icon `Trash2`, `text-muted-foreground hover:text-destructive`) dengan `window.confirm("Hapus task ini?")`.
- `handleAddTask(week)` dan `handleDeleteTask(task)` memanggil route handler lalu update state lokal (append/remove dari `roadmap.tasks`) dan `router.refresh()`.

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` + `npm run build`. Backend `pytest`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/roadmap/tasks frontend/src/lib/api.ts frontend/src/components/roadmap/roadmap-view.tsx
git commit -m "feat: tambah & hapus task roadmap di UI"
```

---

## Part C — Adaptive Roadmap

### Task 8: Backend adaptive roadmap endpoint

**Files:**
- Modify: `backend/app/services/ai_roadmap.py`
- Modify: `backend/app/api/v1/roadmaps.py`

**Interfaces:**
- Produces: `POST /roadmaps/adapt` — regenerasi sisa roadmap dengan konteks progres, pertahankan task selesai.

- [ ] **Step 1: Perluas prompt builder**

`ai_roadmap.py` — tambah fungsi `build_adaptive_prompt(assessment, progress_info)`:

```python
def build_adaptive_prompt(
    assessment: dict[str, Any],
    completed_titles: list[str],
    current_week: int,
) -> str:
    base = build_prompt(assessment)
    return f"""{base}
=== KONTEKS PROGRES ===
Kamu sedang melanjutkan roadmap yang sudah berjalan. Beri tahu AI bahwa ini lanjutan.
completed_tasks: {', '.join(completed_titles) or '(tidak ada)'}
current_week: {current_week}
Instruksi: JANGAN ulangi materi yang sudah diselesaikan. Susun ulang sisa minggu (mulai minggu {current_week + 1}) dengan task lanjutan yang menantang. Respons JSON dengan format yang sama.
"""
```

- [ ] **Step 2: Tambah fungsi service adaptive**

`ai_roadmap.py`:

```python
async def adapt_roadmap(assessment: dict[str, Any], completed_titles: list[str], current_week: int) -> dict[str, Any]:
    prompt = build_adaptive_prompt(assessment, completed_titles, current_week)
    if settings.gemini_api_key:
        try:
            raw_text = await _call_gemini(prompt)
            data = _extract_json(raw_text)
            validated = validate_roadmap(data)
            validated["source"] = "gemini-adaptive"
            return validated
        except (AIUnavailableError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Gemini adaptive gagal, pakai fallback: %s", exc)
    return build_rule_based_roadmap(
        target_career=assessment.get("target_career", "Full-Stack Developer"),
        current_skills=assessment.get("current_skills", ""),
        learning_hours=assessment.get("learning_hours", ""),
    )
```

- [ ] **Step 3: Tambah endpoint adapt**

`api/v1/roadmaps.py`:

```python
@router.post("/adapt", response_model=RoadmapRead)
@limiter.limit("5/minute")
async def adapt(request: Request, payload: RoadmapAdaptRequest, db: Session = Depends(get_db)):
    roadmap = _get_roadmap_with_tasks(payload.roadmap_id, db)
    if roadmap.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Bukan roadmap milik user ini")

    completed = [t.title for t in roadmap.tasks if t.is_completed]
    weeks_done = sorted({int(t.week) for t in roadmap.tasks if t.is_completed})
    current_week = weeks_done[-1] if weeks_done else 0

    assessment = db.get(Assessment, roadmap.assessment_id) if roadmap.assessment_id else None
    if not assessment:
        raise HTTPException(status_code=400, detail="Assessment tidak ditemukan untuk adaptasi")

    data = await adapt_roadmap(
        {
            "target_career": roadmap.target_career,
            "current_skills": assessment.current_skills,
            "learning_hours": assessment.learning_hours,
            "deadline": str(assessment.deadline) if assessment.deadline else None,
            "experience": assessment.experience,
        },
        completed,
        current_week,
    )

    # Pertahankan task selesai, hapus yang belum, buat ulang sisa
    for task in roadmap.tasks:
        if not task.is_completed:
            db.delete(task)
    db.flush()

    roadmap.duration_weeks = data["duration_weeks"]
    roadmap.content = data
    roadmap.status = "ready"

    for week in data["weeks"]:
        for task in week["tasks"]:
            db.add(RoadmapTask(
                roadmap_id=roadmap.id,
                week=int(week["week"]),
                title=task["title"],
                description=task.get("description", ""),
                resources=task.get("resources", []),
            ))
    db.commit()
    return _get_roadmap_with_tasks(roadmap.id, db)
```

- [ ] **Step 4: Tambah schema**

`schemas/roadmap.py`:

```python
class RoadmapAdaptRequest(BaseModel):
    user_id: UUID
    roadmap_id: UUID
```

- [ ] **Step 5: Verifikasi**

Run: `pytest` + import check. Periksa route count `roadmaps` router naik.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/ai_roadmap.py backend/app/api/v1/roadmaps.py backend/app/schemas/roadmap.py
git commit -m "feat: adaptive roadmap endpoint (pertahankan task selesai)"
```

---

### Task 9: Frontend adaptive roadmap UI

**Files:**
- Modify: `frontend/src/app/api/roadmap/adapt/route.ts` (create)
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/roadmap/roadmap-view.tsx`

**Interfaces:**
- Produces: tombol "Adaptasi Roadmap" di halaman roadmap, tampil saat progress > 0.

- [ ] **Step 1: Route handler adapt**

`frontend/src/app/api/roadmap/adapt/route.ts`:

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { adaptRoadmap } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const result = await adaptRoadmap({
      user_id: user.id,
      roadmap_id: body.roadmap_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengadaptasi roadmap." }, { status });
  }
}
```

- [ ] **Step 2: Fungsi api.ts**

```ts
export async function adaptRoadmap(payload: { user_id: string; roadmap_id: string }) {
  return request<Roadmap>("/roadmaps/adapt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 3: UI roadmap-view.tsx**

- Tambah state `adapting`, `showAdaptConfirm`.
- Tombol "Adaptasi Roadmap" (icon `Wand2` atau `RefreshCw`) muncul hanya jika `doneTasks > 0`, di samping tombol Regenerate.
- Klik → konfirmasi (`window.confirm` atau panel inline seperti regenerate) → `handleAdapt()` memanggil `/api/roadmap/adapt` → set roadmap hasil → `router.refresh()`.
- Tambah pesan kecil: "Task yang sudah selesai akan dipertahankan."

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` + `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/roadmap/adapt frontend/src/lib/api.ts frontend/src/components/roadmap/roadmap-view.tsx
git commit -m "feat: adaptasi roadmap di UI"
```

---

## Part D — Verifikasi Akhir

### Task 10: Final verification + docs

**Files:**
- Modify: `README.md`
- Modify: `docs/deploy.md` (jika perlu)

- [ ] **Step 1: Backend test penuh**

Run: `pytest` (dari `backend/`). Semua PASS.

- [ ] **Step 2: Frontend lint + build**

Run: `npm run lint` lalu `npm run build`. Semua PASS tanpa error.

- [ ] **Step 3: Update README**

`README.md` — di bagian Sprint, tambah catatan Sprint 5:

```markdown
Sprint 5 (Hardening & Adaptive): rate limit API, edit roadmap (tambah/hapus task), adaptive roadmap.
```

- [ ] **Step 4: Update ledger + commit**

```bash
git add README.md
git commit -m "chore: verifikasi akhir Sprint 5"
```

---

## Self-Review Checklist

- **Spec coverage:** rate limit ✓ (Task 1), debt github ✓ (Task 2), debt career ✓ (Task 3), type+frontend debt ✓ (Task 4), endpoint test ✓ (Task 5), edit roadmap backend ✓ (Task 6), edit roadmap frontend ✓ (Task 7), adaptive backend ✓ (Task 8), adaptive frontend ✓ (Task 9), verifikasi ✓ (Task 10).
- **Zero-cost:** slowapi gratis, tidak ada layanan baru berbayar.
- **Fallback:** adaptive roadmap fallback ke rule-based jika Gemini down.
- **Regression risk:** semua test lama harus tetap PASS; verifikasi lint+build di setiap task frontend.
- **Note:** `RoadmapTaskPatch` mungkin butuh field `week` jika ingin edit minggu — jika tidak diperlukan, skip (scope Task 6 cukup add/delete + edit yang sudah ada).
