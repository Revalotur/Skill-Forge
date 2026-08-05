# SkillForge Architecture

## Zero-Cost Stack (2026)

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui → **Vercel (Hobby, free)**
- **Backend**: FastAPI + SQLAlchemy → **Render (free tier, 750 jam/bln)**
- **Database**: PostgreSQL → **Supabase (free, 500MB, tidak expire)**
- **Auth**: Supabase Auth (Google + email, JWT) → **Supabase (free, 50K MAU)**
- **AI**: Gemini API (free tier) + fallback rule-based offline
- **Monitoring**: Sentry (free tier)

## Alasan Pemilihan

- **Railway DIHAPUS** — bukan free tier permanen (trial 30 hari $5, lalu min $5/bln + kartu kredit).
- **Render Postgres DIHAPUS** — DB gratis expire 30–90 hari; pakai **Supabase Postgres** yang tidak expire.
- **Supabase** jadi single source untuk DB + Auth (satu platform, satu config).

## Catatan Render Free Tier

- Service tidur setelah **15 menit idle**; request pertama **cold start 30–60 detik**.
- 750 jam/bln (cukup untuk 1 service 24/7 atau lebih dengan sleep).
- Cocok untuk MVP/demo; upgrade ke Basic ($7/bln) jika butuh selalu-on.

## Alur Request

```
Browser → Vercel (Next.js, SSG/ISR + API routes ringan)
        → Render (FastAPI, API bisnis + AI)
        → Supabase (Postgres + Auth)
        → Gemini API (AI generation, fallback jika kosong/down)
```
