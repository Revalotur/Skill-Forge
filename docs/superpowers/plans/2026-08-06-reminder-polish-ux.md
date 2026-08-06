# Issue #15 Reminder & Polish UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kerjakan issue #15 secara in-app-only — toast notification, state due mission, reminder banner di dashboard, dan audit gap empty state.

**Architecture:** Tanpa perubahan backend. Semua kerja di frontend Next.js: mount sonner `<Toaster>` di root layout (theme sinkron dari ThemeProvider), tambah badge "Belum dikerjakan" + banner reminder di MissionCard/DashboardView, serta audit empty state mentor-chat & assessment-form.

**Tech Stack:** Next.js (App Router), React 19, Tailwind, `sonner` (dependensi baru), lucide-react, recharts.

## Global Constraints

- Zero-cost: jangan tambah backend, jangan tambah layanan berbayar.
- Ikuti pola yang ada (Card/Button/ui components, `src/lib/api.ts` types).
- Jangan ubah API backend; semua data reminder dari `mission.is_completed`.
- Bahasa UI: Indonesia.
- Verifikasi akhir: `npm run lint`, `npm run build`, Playwright test baru.

---

### Task 1: Pasang sonner + mount Toaster di root layout

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/components/ui/toaster.tsx`

**Interfaces:**
- Produces: komponen `<Toaster />` (dibungkus komponen client) yang siap dipakai di root layout.

- [ ] **Step 1: Install sonner**

Run: `npm install sonner` (di `frontend/`)
Expected: `sonner` masuk ke `package.json` dependencies.

- [ ] **Step 2: Buat komponen wrapper Toaster**

`frontend/src/components/ui/toaster.tsx` (butuh `"use client"` karena pakai `useTheme`):

```tsx
"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      toastOptions={{
        style: { fontFamily: "var(--font-jakarta-sans)" },
      }}
    />
  );
}
```

- [ ] **Step 3: Mount di root layout**

`frontend/src/app/layout.tsx`: import `Toaster` dan render di dalam `<ThemeProvider>`:

```tsx
import { Toaster } from "@/components/ui/toaster";
...
<ThemeProvider>
  {children}
  <Toaster />
</ThemeProvider>
```

- [ ] **Step 4: Verifikasi build**

Run: `npm run build`
Expected: PASS tanpa error.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/app/layout.tsx frontend/src/components/ui/toaster.tsx
git commit -m "feat: pasang sonner toaster di root layout"
```

---

### Task 2: State due mission + toast pada MissionCard

**Files:**
- Modify: `frontend/src/components/dashboard/mission-card.tsx`

**Interfaces:**
- Produces: MissionCard menampilkan badge "Belum dikerjakan" saat misi belum selesai, dan memanggil `toast.success("Misi selesai! 🔥")` saat PATCH berhasil.

- [ ] **Step 1: Tambah import & toast**

Di atas `mission-card.tsx` tambah:

```tsx
import { toast } from "sonner";
```

Import `AlertCircle` dari lucide-react (untuk badge amber).

- [ ] **Step 2: Badge state due**

Dalam blok `{mission && (`, di samping judul misi, tambah badge saat belum selesai. Ganti div pembungkus task list menjadi kolom; badge ditampilkan di atas baris utama:

```tsx
{mission && (
  <div className="flex flex-col gap-3">
    {!mission.is_completed && (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertCircle className="size-4" />
        Belum dikerjakan — selesaikan hari ini untuk menjaga streak-mu.
      </div>
    )}
    <div className="flex items-center gap-3">
      ... (baris yang sudah ada)
    </div>
  </div>
)}
```

- [ ] **Step 3: Toast sukses**

Dalam `onComplete()`, setelah `setMission(updated)` tambah:

```tsx
toast.success("Misi selesai! 🔥 Streak bertambah.");
```

- [ ] **Step 4: Verifikasi lint**

Run: `npm run lint`
Expected: PASS tanpa warning baru.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/mission-card.tsx
git commit -m "feat: badge due state + toast sukses pada MissionCard"
```

---

### Task 3: Banner reminder di dashboard

**Files:**
- Modify: `frontend/src/app/(dashboard)/dashboard/page.tsx` (hanya jika perlu — umumnya tidak)
- Create: `frontend/src/components/dashboard/reminder-banner.tsx`

**Interfaces:**
- Consumes: `/api/mission/today` (GET, sudah ada) dan `/api/mission/{id}` (PATCH, sudah ada) — sama seperti MissionCard.
- Produces: `<ReminderBanner />` yang menyembunyikan diri setelah misi selesai. DashboardView merender `<ReminderBanner />` tepat sebelum `<MissionCard />`.

- [ ] **Step 1: Buat komponen reminder banner**

`frontend/src/components/dashboard/reminder-banner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DailyMission } from "@/lib/api";

export function ReminderBanner() {
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/mission/today", { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setMission(null);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as DailyMission;
          if (!cancelled) setMission(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !mission || mission.is_completed) return null;

  async function onComplete() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/mission/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyelesaikan misi.");
      }
      setMission(null);
      toast.success("Misi selesai! 🔥 Streak bertambah.");
      window.dispatchEvent(new Event("mission-updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <BellRing className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Misi hari ini belum dikerjakan</p>
          <p className="text-sm text-muted-foreground">
            Selesaikan {mission.title} untuk menjaga streak-mu.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onComplete} disabled={updating}>
        {updating ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-4" />}
        Selesaikan
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Render di dashboard**

`frontend/src/components/dashboard/dashboard-view.tsx`: import `ReminderBanner` dan render sebelum `<MissionCard />` (baris 151):

```tsx
<ReminderBanner />
<MissionCard />
```

- [ ] **Step 3: Sinkronkan MissionCard dengan event mission-updated**

`frontend/src/components/dashboard/mission-card.tsx`: dalam `useEffect` yang memanggil `fetchData`, tambah listener agar refetch saat misi diubah dari banner:

```tsx
useEffect(() => {
  void (async () => {
    await fetchData();
  })();
  window.addEventListener("mission-updated", fetchData);
  return () => window.removeEventListener("mission-updated", fetchData);
}, [fetchData]);
```

- [ ] **Step 4: Verifikasi lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/reminder-banner.tsx frontend/src/components/dashboard/dashboard-view.tsx frontend/src/components/dashboard/mission-card.tsx
git commit -m "feat: reminder banner di dashboard + sinkron refetch mission"
```

---

### Task 4: Audit gap empty state & polish kecil

**Files:**
- Modify: `frontend/src/components/assessment/assessment-form.tsx`
- Modify: `frontend/src/components/mentor/mentor-chat.tsx` (hanya jika perlu — empty state sudah ada)

**Interfaces:**
- Consumes: komponen yang sudah ada.
- Produces: error submit assessment ditampilkan konsisten; tidak ada perubahan lain.

- [ ] **Step 1: Cek assessment-form error handling**

Baca `frontend/src/components/assessment/assessment-form.tsx`. Pastikan error saat submit ditampilkan (state error + teks `text-destructive`). Jika sudah ada, tidak perlu ubah.

- [ ] **Step 2: Pastikan mentor-chat empty state sudah cukup**

Mentor-chat sudah punya empty state (blok `messages.length === 0`). Tidak perlu ubah.

- [ ] **Step 3: Verifikasi build penuh**

Run: `npm run lint` lalu `npm run build`
Expected: keduanya PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: audit empty state & polish lintas halaman"
```

---

### Task 5: Test Playwright end-to-end

**Files:**
- Create: `C:\Users\Fabio\AppData\Local\Temp\opencode\playwright-ux-polish-test.js`

**Interfaces:**
- Consumes: aplikasi berjalan (dev server `:3000` + uvicorn `:8000`).

- [ ] **Step 1: Tulis test**

Test skenario:
1. Login test user.
2. Dashboard menampilkan banner "Misi hari ini belum dikerjakan" (karena test user punya misi belum selesai).
3. MissionCard menampilkan badge "Belum dikerjakan".
4. Klik "Selesaikan" pada banner → toast muncul, banner hilang.
5. Mentor chat empty state tampil ("Halo! Aku AI Mentor-mu").

- [ ] **Step 2: Jalankan test**

Run: `node run.js <path-to-test>` (dari skill dir)
Expected: semua assertion PASS.

- [ ] **Step 3: Reset data test user**

Setelah test, reset misi test user agar bisa diuji ulang (PATCH `is_completed=false` via API atau SQL `update daily_missions set is_completed=false`). Catat langkah reset ini di komentar test.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: e2e polish UX — reminder banner, due badge, toast, empty state"
```

---

## Self-Review

- **Spec coverage:** toast (Task 1-2), state due (Task 2), reminder in-app (Task 3), gap empty state (Task 4), verifikasi (Task 5). Semua poin scope spec ter-cover. Non-goals (push/email/backend) tidak disentuh.
- **Placeholder scan:** tidak ada TBD/TODO; semua step punya kode konkret.
- **Type consistency:** `DailyMission` diimport dari `@/lib/api` konsisten di Task 2 & 3; event `"mission-updated"` dipakai kedua sisi (dispatch di reminder-banner, listen di mission-card).
- **Catatan:** bila test user misi sudah `is_completed=true` (dari sesi sebelumnya), Task 5 Step 3 reset diperlukan agar banner dapat diuji.
