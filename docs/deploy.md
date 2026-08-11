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
