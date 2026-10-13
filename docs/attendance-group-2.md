# Pilot presensi Grup 2

## Keputusan operasional

- Pilot hanya untuk Grup 2, dengan tiga elemen.
- Akses menggunakan PIN unik untuk DanGrup dan masing-masing DanElemen.
- DanElemen memilih tanggal dan sesi pagi, malam, atau insidental, kemudian mencatat anggota elemennya.
- Untuk sesi insidental, nama kegiatan membedakan kegiatan pada tanggal yang sama.
- DanGrup hanya memantau hasil ketiga elemen dan menyiapkan laporan. DanGrup tidak mengubah pencatatan.
- Pembaruan realtime menampilkan hasil yang sudah berhasil disimpan, bukan draf yang sedang diketik.
- Sesi pagi dan malam pada tanggal yang sama harus mengacu pada sesi bersama agar pencatatan ketiga elemen dapat direkap tanpa duplikasi.
- Status awal bernilai `null` tanpa tombol aktif. Lima tombol tersedia: Hadir, Sakit, Izin, Dinas Dalam, Tidak Hadir; status berhalangan memerlukan keterangan.
- Tombol status memakai label lengkap: Hadir, Sakit, Izin, Dinas Dalam, Tidak Hadir. Tombol berbentuk pill. Di desktop satu baris di samping nama; di HP lebar 390px ke atas tetap satu baris, dan pada layar lebih sempit pill turun ke baris kedua tanpa digeser atau terpotong. Warna mengikuti palet muted portal: tombol belum dipilih netral abu; pilihan aktif memakai tanda centang dan tint status (Hadir hijau, Izin kuning, Sakit oranye, Dinas Dalam biru, Tidak Hadir merah) dengan kontras teks minimal 5.1:1. Baris anggota diberi garis tipis warna status di sisi kiri.
- Rework UI 2026-10-13 menggantikan popup: memilih status berhalangan memunculkan kolom keterangan langsung di bawah baris dan memfokuskannya. Jika keterangan kosong saat simpan, tombol Simpan menyebut jumlah keterangan kosong, setiap baris ditandai merah dengan pesan nama anggota, dan layar bergulir ke baris pertama. Error simpan tampil sebagai banner di atas tombol Simpan, error login di bawah kolom PIN, status realtime sebagai titik di header (menyambung ulang otomatis), dan konfirmasi sebagai toast. Modal hanya dipakai untuk pratinjau laporan WhatsApp.
- DanElemen langsung mencatat tanpa tombol pembuka draf. Draf yang belum diubah selalu mengikuti data tersimpan; draf yang sudah diubah dipertahankan saat realtime datang dan memunculkan peringatan bila data berubah di perangkat lain. "Tandai sisanya hadir" hanya mengisi anggota yang belum dicatat. Menutup tab atau keluar dengan perubahan belum tersimpan diberi peringatan.
- DanGrup melihat kartu tiga elemen (progres, hadir, berhalangan, waktu setor terakhir) dan membuka daftar anggota per elemen dari kartu.
- Laporan menggunakan template WhatsApp aplikasi. Anggota yang belum dicatat tetap terlihat sebagai belum dicatat; laporan lengkap tidak boleh menganggapnya hadir.
- Membuka WhatsApp menyiapkan pesan untuk dikirim oleh pengguna.

## Konfigurasi

Template tersedia di `.env.example`. Isi variabel di `.env.local`, sambil mempertahankan variabel lain yang sudah tersedia.

- `NEXT_PUBLIC_SUPABASE_URL`: URL proyek Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key; untuk proyek dengan key lama gunakan anon key.
- `SUPABASE_SECRET_KEY`: secret key server; untuk proyek dengan key lama gunakan service_role key.
- `PIN_AUTH_SECRET`: 32 byte acak dalam bentuk 64 karakter hexadecimal untuk autentikasi PIN di server.
- `PIN_GROUP_2`: PIN awal DanGrup 2.
- `PIN_GROUP_2_ELEMENT_1`, `PIN_GROUP_2_ELEMENT_2`, `PIN_GROUP_2_ELEMENT_3`: PIN awal tiga DanElemen.

PIN menggunakan tepat delapan digit dan harus unik. PIN dan secret key hanya diproses oleh server atau skrip penyiapan; tidak ditempatkan di browser, source code, log, atau Git. Program boleh memuat `.env.local` saat berjalan. Pengguna mengizinkan agen membaca empat variabel PIN awal karena PIN dapat diubah. Izin tersebut tidak mencakup key Supabase atau `PIN_AUTH_SECRET`; agen tetap tidak membaca, menampilkan, atau mencetak nilai rahasia tersebut.

## Data anggota

Sumber: PDF daftar makan yang dilampirkan pengguna. Kolom yang dipakai: nomor serdik, nama, grup, elemen. Kolom urutan dan jadwal makan tidak dipakai sebagai pembagian unit atau jabatan.

Hasil ekstraksi: 400 nomor serdik unik dengan rentang 1–400, tanpa nomor hilang. Grup 2 terdiri dari 90 anggota: 30 anggota di Elemen 1, 30 di Elemen 2, dan 30 di Elemen 3.

Data impor pilot disimpan lokal di `private/group-2-members.csv`, yang dikecualikan dari Git. Nomor serdik tetap berasal dari dokumen; tidak diberi nomor ulang setelah filter Grup 2. Identitas anggota tidak dimasukkan ke bundle publik aplikasi.

Pengguna sudah mengonfirmasi empat komandan, dan seluruhnya cocok secara unik dengan nomor peserta dalam PDF. Ketiga DanElemen juga cocok dengan elemen yang ditugaskan. Pemetaan identitas dan jabatan disimpan lokal di `private/group-2-commanders.json`, yang dikecualikan dari Git. DanGrup tetap menjadi anggota elemen asalnya dalam perhitungan kekuatan; kewenangan memantau grup tidak mengubah keanggotaan tersebut. Warna baris PDF tidak dipakai untuk menentukan jabatan.

## Verifikasi setelah konfigurasi tersedia

1. Login empat akses PIN dan pastikan DanGrup tidak memiliki aksi pencatatan.
2. Pastikan setiap DanElemen hanya membaca dan mengubah 30 anggota elemennya, termasuk pada API dan kebijakan database.
3. Catat sesi yang sama di dua perangkat; hasil simpan muncul di DanGrup melalui Supabase Realtime.
4. Pastikan simpan atomik, tidak membuat record anggota/sesi ganda, dan gagal simpan tidak ditampilkan sebagai berhasil.
5. Pastikan pagi, malam, dan kegiatan insidental memiliki riwayat terpisah.
6. Pastikan laporan berasal dari data tersimpan, menghitung 90 anggota grup atau 30 anggota elemen, dan membuka WhatsApp dengan template yang sudah tersedia.

## Hasil implementasi dan verifikasi

Migrasi `20261013113341_group_2_attendance.sql` telah diterapkan ke proyek tujuan melalui Supabase CLI (`db push --linked --project-ref ...`). Sesi CLI yang tersedia memiliki akses SQL; pengguna tidak perlu menerapkan SQL manual. Roster 90 anggota dan empat akun Supabase Auth beserta profil kewenangannya sudah disiapkan melalui `npm run supabase:setup`.

Login PIN memetakan komandan ke akun Auth dengan password yang diturunkan melalui HMAC dan rahasia server. PIN tidak disimpan sebagai plaintext di database. Token akses disimpan dalam cookie HttpOnly, SameSite Strict, dan Secure di produksi, serta digunakan di memori untuk langganan realtime. Tidak ada token sesi yang disimpan di localStorage. Sesi kedaluwarsa sesuai masa berlaku token Supabase; pengguna masuk kembali dengan PIN. Percobaan login dibatasi secara atomik di database. Saat berjalan lokal, batas 20 percobaan/10 menit berlaku bersama; di Vercel fingerprint menggunakan header alamat IP yang dikelola platform.

Database menerapkan RLS: DanElemen hanya melihat dan mencatat elemennya; DanGrup membaca seluruh grup tanpa hak tulis. Penyimpanan roster elemen dilakukan atomik dalam satu RPC. Tanggal/sesi/kegiatan bersama memiliki constraint unik. Revisi setiap catatan mencegah draf lama menimpa data yang sudah diperbarui perangkat lain. Catatan menyertakan akun pencatat, waktu server, dan nomor revisi; belum ada arsip setiap versi lama.

Realtime menunggu `setAuth` selesai sebelum berlangganan INSERT/UPDATE catatan dan INSERT sesi. Data draf tidak dikirim. Langganan tidak memakai DELETE karena pengiriman event DELETE Postgres Changes tidak dilindungi RLS seperti INSERT/UPDATE.

Verifikasi nyata melalui server Next dan proyek Supabase:

- Empat akses berhasil login, dengan roster 90 untuk DanGrup dan 30 untuk masing-masing DanElemen.
- API menolak permintaan tanpa login dan pencatatan oleh DanGrup.
- Satu penyimpanan Elemen 1 menghasilkan 30 pembaruan realtime bagi DanGrup; DanElemen 2 menerima nol catatan di luar cakupannya.
- Pembacaan langsung melalui client Supabase DanElemen 2 tidak membuka catatan Elemen 1.
- API menolak revisi lama dan anggota dari elemen lain.
- Sesi uji unik pada tanggal masa depan sudah dihapus; tidak ada absensi contoh yang ditinggalkan.
- Pengujian SQL lokal memakai PostgreSQL melalui PGlite dengan role, auth.uid, RLS, constraint, trigger, dan RPC yang sama; mencakup atomic rollback, sesi bersama, dan pemisahan sesi.
- Pengujian UI mencakup simpan eksplisit, draf bertahan saat realtime datang, gagal simpan, DanGrup tanpa tombol pencatatan, serta laporan belum lengkap tanpa tombol WhatsApp.

Supabase Advisor tidak melaporkan peringatan untuk struktur tabel/fungsi pilot. Advisor juga menampilkan pengaturan Auth umum `auth_leaked_password_protection` yang belum aktif; konfigurasi tersebut tidak diubah pada pekerjaan ini.

Server percobaan dijalankan di `http://localhost:3001/attendance`. Deploy produksi belum dilakukan pada pekerjaan ini. Pemeriksaan UI menggunakan DOM testing; inspeksi visual browser tidak dilakukan karena sesi ini tidak memiliki browser yang terhubung.

Pemeriksaan setelah perubahan UI: 96 pengujian pada sembilan file lulus dan `npm run typecheck` lulus. Pengujian tambahan mencakup lima tombol tanpa pilihan awal, navigasi keyboard, popup merah saat keterangan dibutuhkan, daftar semua anggota yang belum mengisi keterangan, error login/simpan, serta migrasi status lama ke Dinas Dalam dan `null` tanpa mengubah atribusi. Lima belas kombinasi warna default/pilih/hover memenuhi kontras teks minimal 4.5:1; nilai terendah 5.40:1.

Build akhir juga lulus. Verifikasi Supabase nyata memastikan satu catatan Dinas Dalam dan satu catatan `null` tersimpan sesuai payload. DanGrup menerima 30 event INSERT, sementara DanElemen di luar cakupan menerima nol catatan. Sesi uji sudah dibersihkan setelah verifikasi.

Migrasi perubahan status telah diterapkan melalui CLI, termasuk mengizinkan SQL `NULL` pada status dan mengubah placeholder lama tanpa mengubah pencatat/waktu/revisi. `null` tetap dihitung sebagai belum dicatat, bukan tidak hadir. Pemeriksaan bundle sebelumnya tidak menemukan empat PIN, `SUPABASE_SECRET_KEY`, maupun `PIN_AUTH_SECRET`; nilai rahasia hanya diproses program dan tidak ditampilkan kepada agen.
