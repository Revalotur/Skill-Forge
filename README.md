# 🏗️ SkillForge — AI Learning Roadmap Platform

Platform berbasis AI yang membantu pengguna menyusun, menjalankan, dan mengevaluasi roadmap belajar hingga siap memasuki dunia kerja.

## 🧱 Tech Stack (Zero-Cost 💸)

| Layer | Teknologi | Hosting |
| :-- | :-- | :-- |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Vercel (free) |
| Backend | FastAPI + SQLAlchemy | Render (free) |
| Database | PostgreSQL | Supabase (free) |
| Auth | Supabase Auth (Google + email) | Supabase (free) |
| AI | Gemini API + fallback rule-based | Free tier |
| Monitoring | Sentry | Free tier |

> Semua layanan gratis permanen, tanpa kartu kredit.

## 📂 Struktur

```
SkillForge/
├── frontend/    # Next.js
├── backend/     # FastAPI
├── docs/        # Dokumentasi
└── .github/     # CI/CD
```

## 🚀 Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📋 Sprint

Lihat [GitHub Issues](https://github.com/Revalotur/Skill-Forge/issues) — dibagi milestone:
Sprint 1 (Foundation) → Sprint 2 (Core AI) → Sprint 3 (Engagement) → Sprint 4 (Career Readiness & Deploy).

Sprint 5 (Hardening & Adaptive): rate limit API, edit roadmap (tambah/hapus task), adaptive roadmap.

Sprint 6 (CV Analyzer & Deploy): upload PDF → ATS score + skill gap + saran perbaikan, deploy blueprint Render + runbook deploy.

## 🚀 Deploy

Baca [docs/deploy.md](docs/deploy.md) untuk panduan deploy Vercel + Render + Supabase.
