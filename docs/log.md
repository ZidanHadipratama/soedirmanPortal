# Log

## [progress] 2026-10-13 — Tombol status berbentuk pill
- Task: ubah bentuk tombol kehadiran menjadi pill, lalu push GitHub + deploy Vercel.
- Perubahan: radius tombol status 999px; di HP grid 5 kolom diganti pill selebar label (satu baris pada lebar ≥390px, wrap rapi di bawahnya).
- Files: src/styles.css, docs/attendance-group-2.md.
- Verifikasi: vitest 102/102, typecheck, build lulus; pengukuran Chromium: 1 baris di 390/412px (termasuk saat "Tidak Hadir" terpilih), 2 baris di 360px.

## [progress] 2026-10-13 — Label status lengkap + palet muted
- Task: label status tidak disingkat; warna absensi diselaraskan dengan desain portal.
- Perubahan: tombol H/S/I/DD/TH dikembalikan ke label lengkap (grid 5 kolom di HP); palet status muted mengikuti badge portal (kontras 5.1–5.6:1); tombol belum dipilih netral; tab sesi, chip filter, kartu elemen aktif memakai tint biru portal (#edf3fd/#396abb); app bar putih; meter/progres biru lembut; banner, toast, dan error memakai merah/navy muted; radius 7px dan ukuran huruf mengikuti portal.
- Files: src/AttendanceStatusButtons.tsx, src/PilotAttendance.tsx, src/pilot-ui.test.tsx, src/styles.css, docs/attendance-group-2.md.
- Verifikasi: vitest 102/102, typecheck, build lulus; screenshot Chromium desktop 1280 dan HP 390 (API di-mock).
- Next: push GitHub + deploy Vercel (disetujui pengguna, dikerjakan bersama perubahan pill).

## [progress] 2026-10-13 — Rework UI/UX absensi pilot (tahap 2)
- Task: rework UI/UX `/attendance` sesuai usulan 1–6 yang disetujui pengguna.
- Perubahan: semua popup diganti feedback inline (keterangan inline + fokus otomatis, validasi per baris + scroll ke baris pertama, banner error simpan, error PIN inline, titik status realtime, toast); tombol status bulat H/S/I/DD/TH; header ringkas dengan stepper tanggal, tab sesi + "Insidental" baru, menu akun; tombol utama kontekstual (Simpan n/30 → Tersimpan · Buat laporan WA); kartu elemen DanGrup; meter progres; app bar halaman `/attendance`. Dokumen keputusan diperbarui.
- Files: src/PilotAttendance.tsx, src/AttendanceStatusButtons.tsx, src/pilot-model.ts, src/pilot-model.test.ts, src/pilot-ui.test.tsx, src/styles.css, app/attendance/page.tsx, docs/attendance-group-2.md.
- Verifikasi: vitest 102/102, typecheck, build lulus. Screenshot Chromium (API di-mock) desktop 1280 & mobile 390 untuk DanElemen, DanGrup, login.
- Deploy: commit 4a36915 di-push ke GitHub `main`; 8 env Supabase/PIN ditambahkan ke Vercel Production (nilai tidak ditampilkan); deploy production https://soedirmanportal.vercel.app. Smoke test: `/`, `/attendance`, `/api/health` 200; `/api/pilot/session` 401 tanpa login; PIN salah ditolak "PIN tidak sesuai." (bukan 503).
- Next: uji login PIN asli di HP oleh DanElemen/DanGrup.

## [progress] 2026-10-13 — Workflow absensi pilot (tahap 1)
- Task: perbaikan workflow pencatatan `/attendance` (pilot Grup 2).
- Perubahan: draf otomatis untuk DanElemen (tanpa tombol "Catat kehadiran"), "Tandai sisanya hadir" hanya mengisi yang kosong (sebelumnya menimpa Sakit/Izin + keterangan), ringkasan sesi per tanggal dengan progres, progres per elemen untuk DanGrup, kartu statistik, filter Semua/Belum dicatat/Berhalangan, savebar sticky dengan hitungan draf, peringatan konflik perangkat lain sebelum simpan, peringatan tutup tab/keluar saat draf belum disimpan, navigasi panah keyboard tidak lagi membuka popup.
- Files: src/PilotAttendance.tsx, src/AttendanceStatusButtons.tsx, src/pilot-model.ts, src/pilot-model.test.ts, src/pilot-ui.test.tsx, src/styles.css.
- Verifikasi: `npx vitest run` 101/101 lulus; `tsc --noEmit` lulus. Belum diinspeksi visual di browser.
- Next: rework UI/UX (pengganti popup) menunggu keputusan pengguna.
