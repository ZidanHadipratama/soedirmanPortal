# Verifikasi Portal P3MD

Tanggal: 12 Oktober 2026. Lingkungan: Node.js 26, Next.js 16, browser Chromium melalui Playwright.

## Cakupan

Alur yang diuji: portal → aplikasi → aksi/formulir → state lokal → tampilan → reload. Endpoint server `/api/health` diuji terpisah. API bisnis dan database belum ada; hasil ini memverifikasi prototipe browser, bukan otorisasi server atau aplikasi multi-user.

## Hasil browser

| Alur                         | Hasil                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presensi serdik              | Tercatat, tombol kedua dinonaktifkan, bertahan setelah reload                                                                                             |
| Cakupan rekap                | DanGroup 4 anggota, DanElemen 3, Ops anggota hanya diri sendiri, Ops terkait dan pengasuh 6                                                               |
| Pengajuan dan keputusan izin | Serdik mengajukan, pengasuh menyetujui dengan tanggapan, serdik melihat hasil setelah reload                                                              |
| Aspirasi                     | Serdik mengajukan, LMS memberi status Diajukan dan tanggapan, serdik dapat membaca tanpa tombol pengelolaan                                               |
| Agenda                       | Daftar/batal kegiatan, Ops menambah dan mengubah jadwal, peserta tetap tersimpan, dokumentasi dapat dibuka; DanGroup tidak dapat mengubah kegiatan global |
| Project                      | Gabung, selesai tugas, tambah tugas, catatan supervisi pengasuh tampil                                                                                    |
| Sumber belajar               | Pengasuh menambah materi Group 2, serdik Group 1 tidak melihat materi, bookmark tampil di Tersimpan                                                       |
| Notulensi                    | Ops menerbitkan, isi dapat dibaca melalui dialog                                                                                                          |
| Catatan baik                 | Catatan serdik tersimpan dan tampil                                                                                                                       |
| Direktori                    | Pencarian Nadia menghasilkan satu profil dan detail dapat dibuka                                                                                          |
| Favorit                      | Tambah aplikasi, tampil di beranda, bertahan setelah reload                                                                                               |
| Peluncur aplikasi            | Sembilan aplikasi dan navigasi ke Perizinan bekerja                                                                                                       |
| Keyboard dialog              | Fokus berada di dialog, Escape menutup, fokus kembali ke tombol pembuka                                                                                   |
| Skip link                    | Fokus ke konten tanpa mengubah route portal                                                                                                               |
| Console                      | Tidak ada error pada pemeriksaan setelah perbaikan favicon                                                                                                |
| Server                       | Homepage HTTP 200, `/api/health` HTTP 200 dengan mode browser-local dan authentication false                                                              |

## Tampilan responsif

- Lebar 375 px: beranda, katalog, sembilan aplikasi, dan Tersimpan diuji; tidak ada overflow horizontal pada dokumen.
- Navigasi drawer pada ponsel berhasil membuka katalog.
- Lebar 768 px dan 1024 px: beranda tidak overflow.
- Lebar 1440 px: screenshot beranda diperiksa secara visual.
- Preferensi reduced motion didukung melalui CSS.

## Pengujian otomatis

**21 pengujian otomatis lulus**. `npm test` menguji peran, cakupan group/elemen, pembatasan Ops, kepemilikan pengelolaan aspirasi, supervisi, audiens kegiatan, perlindungan dokumentasi global, URL aman, dan seed tanggal lokal.

`npm run typecheck` dan `npm run build` memeriksa tipe dan build produksi. `npm audit` memeriksa dependensi. Hasil akhir: 21 tes lulus, typecheck/build produksi lulus, npm audit 0 kerentanan. Versi produksi juga diuji: render portal, navigasi ke Presensi, dan perubahan state bekerja; homepage serta health endpoint HTTP 200.

## Batas pembuktian

Belum menguji autentikasi, API bisnis, database, unggah berkas, konkurensi pengguna, deployment, pengiriman notifikasi, atau audit aksesibilitas WCAG menyeluruh. Kebijakan UI pada prototipe dapat diperiksa atau diubah oleh pengguna browser; otorisasi server harus dibuat saat backend diintegrasikan.

## Pembaruan: presensi kegiatan dan reporting

Pencatatan sekarang hanya untuk List Merah sesuai scope dan Polisi Serdik/pengasuh global; Ops tetap view-only. Pengujian baru mencakup guard mutasi, scope, sesi terpisah, validasi alasan, counts/report lengkap versus draf, aturan NIHIL, encoding link WhatsApp, navigasi shared activity, izin disetujui sebagai saran eksplisit, tindakan home per peran dan migrasi v1/v2 idempoten dengan data lama dipertahankan.

Component integration tests memakai React Testing Library/jsdom untuk mencoba formulir, report preview, pembatasan UI dan navigasi. Tidak ada browser terhubung pada sesi pembaruan ini; verifikasi visual browser untuk tampilan baru belum dilakukan. Link WhatsApp diverifikasi sebagai URL terisi tanpa mengirim pesan nyata.

Data tetap browser-local dan pilihan peran tetap demonstrasi; pengujian ini tidak membuktikan otorisasi backend atau sinkronisasi multi-user.

Hasil verifikasi rilis v0.2: **57 pengujian lulus**, typecheck dan build produksi Next.js lulus, npm audit **0 kerentanan**, homepage dan `/api/health` lokal HTTP 200. Tidak ada pesan WhatsApp yang dikirim pada pengujian.
