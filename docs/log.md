# Log

## [progress] 2026-10-13 — Rework UI/UX absensi pilot (tahap 2)
- Task: rework UI/UX `/attendance` sesuai usulan 1–6 yang disetujui pengguna.
- Perubahan: semua popup diganti feedback inline (keterangan inline + fokus otomatis, validasi per baris + scroll ke baris pertama, banner error simpan, error PIN inline, titik status realtime, toast); tombol status bulat H/S/I/DD/TH; header ringkas dengan stepper tanggal, tab sesi + "Insidental" baru, menu akun; tombol utama kontekstual (Simpan n/30 → Tersimpan · Buat laporan WA); kartu elemen DanGrup; meter progres; app bar halaman `/attendance`. Dokumen keputusan diperbarui.
- Files: src/PilotAttendance.tsx, src/AttendanceStatusButtons.tsx, src/pilot-model.ts, src/pilot-model.test.ts, src/pilot-ui.test.tsx, src/styles.css, app/attendance/page.tsx, docs/attendance-group-2.md.
- Verifikasi: vitest 102/102, typecheck, build lulus. Screenshot Chromium (API di-mock) desktop 1280 & mobile 390 untuk DanElemen, DanGrup, login.
- Next: push GitHub + deploy Vercel.

## [progress] 2026-10-13 — Workflow absensi pilot (tahap 1)
- Task: perbaikan workflow pencatatan `/attendance` (pilot Grup 2).
- Perubahan: draf otomatis untuk DanElemen (tanpa tombol "Catat kehadiran"), "Tandai sisanya hadir" hanya mengisi yang kosong (sebelumnya menimpa Sakit/Izin + keterangan), ringkasan sesi per tanggal dengan progres, progres per elemen untuk DanGrup, kartu statistik, filter Semua/Belum dicatat/Berhalangan, savebar sticky dengan hitungan draf, peringatan konflik perangkat lain sebelum simpan, peringatan tutup tab/keluar saat draf belum disimpan, navigasi panah keyboard tidak lagi membuka popup.
- Files: src/PilotAttendance.tsx, src/AttendanceStatusButtons.tsx, src/pilot-model.ts, src/pilot-model.test.ts, src/pilot-ui.test.tsx, src/styles.css.
- Verifikasi: `npx vitest run` 101/101 lulus; `tsc --noEmit` lulus. Belum diinspeksi visual di browser.
- Next: rework UI/UX (pengganti popup) menunggu keputusan pengguna.
