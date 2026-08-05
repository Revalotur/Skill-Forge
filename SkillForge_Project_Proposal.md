# SkillForge --- AI Learning Roadmap Platform

## Overview

**SkillForge** adalah platform berbasis AI yang membantu pengguna
menyusun, menjalankan, dan mengevaluasi roadmap belajar hingga siap
memasuki dunia kerja.

## Problem Statement

Banyak orang ingin berkarier di bidang teknologi tetapi mengalami
masalah seperti: - Tidak tahu harus mulai belajar dari mana. - Bingung
urutan materi yang benar. - Tidak memiliki mentor. - Sulit mengukur
progres. - Tidak tahu skill yang masih kurang untuk melamar pekerjaan.

## Solution

SkillForge memberikan roadmap belajar yang dipersonalisasi
berdasarkan: - Target karier - Skill yang sudah dimiliki - Waktu belajar
per hari - Deadline - Preferensi belajar

Roadmap kemudian diperbarui secara dinamis berdasarkan progres pengguna.

------------------------------------------------------------------------

# Target Users

-   Mahasiswa
-   Fresh Graduate
-   Career Switcher
-   Self-taught Programmer
-   Bootcamp Student

------------------------------------------------------------------------

# Core Features (MVP)

## 1. Authentication

-   Google Login
-   Email Login

## 2. Skill Assessment

Pertanyaan awal: - Karier yang diinginkan - Skill saat ini - Jam belajar
per hari - Deadline - Pengalaman sebelumnya

## 3. AI Roadmap Generator

Contoh output:

Week 1 - HTML - CSS

Week 2 - JavaScript

Week 3 - Git

Week 4 - React

## 4. Progress Tracker

-   Checklist materi
-   Progress Bar
-   Persentase penyelesaian

## 5. Dashboard

Menampilkan: - Progress - Target - Estimasi selesai - Aktivitas
belajar - Streak

------------------------------------------------------------------------

# Advanced Features

## AI Mentor

Chat AI sesuai roadmap pengguna.

## AI Daily Mission

Memberikan tugas belajar harian.

## AI Career Gap Analysis

Menampilkan skill yang masih kurang berdasarkan target karier.

## GitHub Analyzer

Analisis repository: - README - Struktur project - Commit - Teknologi -
Best Practice

## CV Analyzer

Upload CV dan dapatkan: - ATS Score - Skill Gap - Saran perbaikan

## Job Readiness Score

Skor kesiapan melamar pekerjaan.

## Adaptive Roadmap

Roadmap berubah otomatis mengikuti progres pengguna.

------------------------------------------------------------------------

# User Flow

1.  Register
2.  Login
3.  Assessment
4.  AI membuat roadmap
5.  Belajar
6.  Update progress
7.  Upload project / Hubungkan GitHub
8.  AI mengevaluasi
9.  Roadmap diperbarui
10. Siap melamar kerja

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   Next.js
-   React
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion

## Backend

-   FastAPI

## Database

-   PostgreSQL

## ORM

-   SQLAlchemy

## Authentication

-   Supabase Auth

## AI

-   Gemini API (Free Tier)
-   Ollama (Opsional)
-   Qwen / Llama (Opsional)

## Visualization

-   Chart.js atau Recharts

## Deployment

-   Vercel
-   Railway
-   Supabase PostgreSQL

------------------------------------------------------------------------

# Database (Sederhana)

users - id - name - email

assessments - id - user_id - target_career - current_skills -
learning_hours - deadline

roadmaps - id - user_id - title

roadmap_tasks - id - roadmap_id - task - status

daily_missions - id - user_id - mission - completed

github_analysis - id - user_id - repository - score

------------------------------------------------------------------------

# Roadmap Pengembangan

## Sprint 1

-   UI
-   Login
-   Database
-   Assessment

## Sprint 2

-   AI Roadmap
-   Dashboard
-   Progress Tracker

## Sprint 3

-   Daily Mission
-   AI Mentor
-   Statistik

## Sprint 4

-   GitHub Analyzer
-   Career Gap
-   Deploy

------------------------------------------------------------------------

# Future Vision

SkillForge bukan hanya generator roadmap, tetapi menjadi platform
pendamping belajar yang: - Menyusun roadmap personal - Memantau
progres - Memberikan evaluasi proyek - Mengukur kesiapan kerja -
Menyesuaikan roadmap secara otomatis berdasarkan perkembangan pengguna

Dengan pendekatan ini, SkillForge memiliki potensi menjadi platform
persiapan karier berbasis AI yang membantu pengguna dari tahap belajar
hingga siap memasuki dunia kerja.
