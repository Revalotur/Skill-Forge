# Design: Sprint 3 polish — Reminder & UX (issue #15)

Date: 2026-08-06
Status: Approved

## Objective
Menuntaskan issue #15 (Reminder & polish UX) secara in-app-only, tanpa perubahan backend.
Native push & email reminder menjadi backlog (butuh PWA/VAPID & provider email — bukan zero-cost murni).

## Scope
1. **Toast notification (sonner)**
   - Install `sonner`; mount `<Toaster>` di root layout, theme sinkron dari ThemeProvider.
   - Trigger: tombol "Selesai" misi (sukses streak), toggle task di roadmap (sukses), error PATCH/fetch.

2. **State due mission + reminder in-app**
   - MissionCard: misi belum dikerjakan ditandai badge "Belum dikerjakan" (amber/ring).
   - Banner reminder di atas dashboard bila misi hari ini belum selesai, dengan tombol aksi
     "Selesaikan" yang menjalankan PATCH lalu refetch. Banner hilang otomatis setelah selesai.

3. **Audit gap empty state / skeleton**
   - Sudah ada: dashboard, roadmap, analytics, mission-card (skeleton), analytics (empty).
   - Kurang: mentor-chat empty state (belum ada pesan), assessment-form error submit jelas.

4. **Polish lintas halaman**
   - Konsisten tombol "Coba Lagi" pada error state, judul halaman seragam, loading spinner
     pada tombol saat PATCH mission.

## Non-goals
- Native browser push / service worker / VAPID.
- Email reminder.
- Perubahan backend API.

## Verification
- `npm run lint` + `npm run build` frontend bersih.
- Playwright: dashboard menampilkan banner + badge saat misi belum selesai; banner hilang
  setelah PATCH; toast muncul saat misi selesai; mentor chat empty state tampil.
