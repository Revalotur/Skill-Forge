# Deploy SkillForge

Stack zero-cost: **Vercel** (frontend) + **Render** (backend) + **Supabase** (DB + Auth).

## Prasyarat

- Repo GitHub: https://github.com/Revalotur/Skill-Forge
- Akun Vercel, Render, Supabase (semua free tier, tanpa kartu kredit).

---

## 1. Supabase

1. Buat project di supabase.com.
2. Jalankan **seluruh** isi `supabase/schema.sql` di **SQL Editor** (sudah termasuk tabel `cv_analysis`).
   - Kalau sudah pernah jalan versi lama, jalankan ulang aman karena semua `create table if not exists`.
3. Aktifkan Auth → Sign In / Up → **email** + **Google**.
4. Salin: Project URL, anon key, service_role key, dan connection string Postgres.

## 2. Backend (Render)

Dua cara — **Blueprint (disarankan)** atau manual.

### Cara A: Blueprint
1. Render Dashboard → New → Blueprint → pilih repo `Skill-Forge`.
2. Render otomatis membaca `render.yaml` di **root repo** (`rootDir: backend`).
3. Isi env var yang bertanda `sync: false` (isi manual):

   | Key | Nilai |
   | :-- | :-- |
   | `DATABASE_URL` | connection string Supabase (pakai `psycopg2`) |
   | `GEMINI_API_KEY` | key Gemini (opsional, fallback rule-based tetap jalan) |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `INTERNAL_API_KEY` | secret bebas, contoh `sk-internal-xyz` |
   | `GITHUB_TOKEN` | token GitHub (opsional, naikkan rate limit ke 5000/jam) |

4. Deploy. Catat URL (contoh: `https://skillforge-backend.onrender.com`).

### Cara B: Manual
1. New → Web Service → pilih repo `Skill-Forge`.
2. Root directory: `backend`.
3. Runtime: Python. Build: `pip install -r requirements.txt`. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Health check path: `/api/v1/health`. Isi env var seperti tabel di atas.

> Catatan free tier: Render akan mematikan service saat idle; request pertama setelah idle butuh beberapa detik (cold start).

## 3. Frontend (Vercel)

1. Vercel → Add New Project → import `Skill-Forge`.
2. Root directory: `frontend`.
3. Framework preset: Next.js. Env vars:

   | Key | Nilai |
   | :-- | :-- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `NEXT_PUBLIC_BACKEND_URL` | URL Render di atas (tanpa trailing slash) |
   | `BACKEND_INTERNAL_API_KEY` | `INTERNAL_API_KEY` yang sama |

4. Deploy.

> CORS backend sudah include `https://skillforge.vercel.app` di `backend/app/core/config.py`.

## Verifikasi

- `GET https://<backend>/api/v1/health` → `{"status": "ok"}`.
- Buka domain Vercel, login, buat roadmap → semua fitur berjalan.
- Uji CV Analyzer: upload PDF → skor ATS muncul.
- Uji GitHub Analyzer: masukkan username → skor 0-100 muncul.

## Troubleshooting

| Masalah | Solusi |
| :-- | :-- |
| 429 "Terlalu banyak permintaan" | Rate limit backend (10/min untuk GitHub, 5/min untuk CV/roadmap). Tunggu sebentar. |
| CORS error di browser | Pastikan `NEXT_PUBLIC_BACKEND_URL` persis URL Render, dan domain Vercel ada di `cors_origins` (ada default `https://skillforge.vercel.app`). |
| CV upload gagal "PDF tidak bisa dibaca" | PDF hasil scan (gambar) tidak punya teks. Gunakan CV yang bisa di-copy teksnya. |
| Backend lambat pertama kali | Cold start Render free tier, normal. |
| CV upload 413 | Maks 5MB. Perkecil file. |