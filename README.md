# Soedirman Portal

Prototipe interaktif superapp P3MD menggunakan **Next.js App Router, React, dan TypeScript**. Portal menjadi pintu masuk ke aplikasi tersendiri; setiap aplikasi mempunyai halaman dan alur kerja sendiri. Beranda berisi aplikasi favorit, agenda harian, pengingat presensi, dan kabar terbaru.

## Pilot Supabase: absensi Grup 2

Absensi Grup 2 kini memiliki akses PIN dan penyimpanan Supabase. Buka `/attendance` untuk akses komandan, atau aplikasi Presensi di portal saat konfigurasi Supabase tersedia. Layanan lain masih memakai prototipe browser seperti dijelaskan di bawah.

1. Isi `.env.local` mengikuti `.env.example`. Jangan menghapus konfigurasi lama.
2. Jalankan `npm run supabase:migrate`. Skrip menggunakan sesi CLI yang sudah login dan memilih proyek dari URL dalam konfigurasi, tanpa mencetak URL/key.
3. Jalankan `npm run supabase:setup` untuk mengimpor roster lokal dan membuat empat akun PIN. Data impor tersedia di `private/`, yang tidak masuk Git.
4. Jalankan `npm run dev`, lalu buka `/attendance`.

DanElemen mencatat 30 anggota elemennya, sedangkan DanGrup memantau 90 anggota melalui Supabase Realtime. PIN menentukan identitas dan cakupan akses; simulasi peran pada portal tidak mengubah kewenangan API/database. Laporan menggunakan template WA yang sudah tersedia dan membuka WhatsApp dengan pesan siap kirim.

Untuk mengganti PIN, jalankan `npm run pins:rotate`, lalu `npm run supabase:setup`, dan mulai ulang aplikasi. Skrip rotasi menampilkan empat PIN baru; key Supabase dan rahasia autentikasi tidak dicetak. PIN tidak dimasukkan ke Git, dokumentasi, atau bundle browser. Sesi akses berlangsung hingga token Supabase kedaluwarsa; setelah itu masuk kembali dengan PIN.

Pengujian integrasi nyata: `npm run supabase:verify` (default server `http://localhost:3001`, dapat diubah melalui `PILOT_TEST_BASE_URL`). Skrip membuat satu sesi insidental dengan nama unik pada tanggal 2099-12-30, menguji API dan realtime, lalu menghapus hanya sesi uji tersebut. Verifikasi lokal: `npm test`, `npm run typecheck`, dan `npm run build`.

Rincian keputusan dan verifikasi pilot tersedia di [docs/attendance-group-2.md](docs/attendance-group-2.md).

## Menjalankan prototipe portal

Gunakan Node.js 22.13+ dan npm. Proyek dikembangkan dan diuji dengan Node.js 26.

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`. Gunakan pilihan **Peran aktif** untuk mencoba kewenangan serdik, pejabat, dan pengasuh. Identitas contoh tetap Arif Pratama, Group 1, Elemen A agar batas cakupan mudah dibandingkan.

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Aplikasi

| Aplikasi         | Alur yang tersedia                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Presensi         | Pencatatan per kegiatan/sesi oleh List Merah sesuai cakupan, Polisi Serdik dan pengasuh; H/S/I/DD/Tidak Hadir; alasan berhalangan; rekap; CSV; pratinjau/copy/WhatsApp laporan |
| Perizinan        | Pengajuan dengan rentang tanggal, status, keputusan dan tanggapan pengasuh/Polisi Serdik                                                                                       |
| Agenda           | Konteks kegiatan bersama: jadwal, arahan, pakaian/perlengkapan, pendaftaran, presensi sesi terkait, izin disetujui pada tanggal kegiatan, dan dokumentasi                      |
| Kabar Soedirman  | Pengumuman, informasi, notulensi, pencarian, publikasi, simpan untuk nanti                                                                                                     |
| Direktori Serdik | Pencarian nama/nomor/jabatan, filter group/elemen, profil dan kontak contoh                                                                                                    |
| Ruang Aspirasi   | Pengajuan serdik, penanganan LMS, status diterima/diproses/diajukan/selesai, tanggapan                                                                                         |
| Catatan Baik     | Catatan kegiatan dan refleksi, pencarian, pemantauan anggota sesuai cakupan                                                                                                    |
| Ruang Project    | Ide project, bergabung, tugas dan progress, catatan supervisi pengasuh                                                                                                         |
| Ruang Belajar    | Materi berupa tautan, pencarian/kategori, bookmark, pembagian akses per group/elemen                                                                                           |

Favorit dibatasi delapan aplikasi. Semua sembilan layanan tetap dapat ditemukan di katalog dan peluncur aplikasi. Navigasi memakai tautan hash seperti `/#/app/attendance`, sehingga tautan bisa dibuka langsung dan tombol kembali browser bekerja.

## Matriks akses tambahan

Seluruh peran memiliki alur serdik pribadi dalam demonstrasi, tetapi serdik tidak mencatat presensi sendiri. Pencatatan hanya dilakukan peran berwenang. Tabel berikut menunjukkan akses tambahan terhadap data anggota.

| Peran                    | Presensi               | Perizinan              | Agenda                            | Aspirasi                      | Catatan baik          | Project             | Sumber belajar              |
| ------------------------ | ---------------------- | ---------------------- | --------------------------------- | ----------------------------- | --------------------- | ------------------- | --------------------------- |
| Serdik reguler           | Lihat pribadi          | Pribadi                | Lihat/ikut                        | Ajukan/pribadi                | Pribadi               | Ide/gabung/progress | Akses materi sesuai audiens |
| DanBatch / WadanBatch    | Catat/lihat global     | Lihat global           | Tambah/lihat peserta              | Lihat global                  | Lihat global          | Akses serdik        | Bagikan                     |
| DanGroup                 | Catat/lihat group      | Lihat group            | Tambah untuk group/lihat peserta  | Lihat group                   | Lihat group           | Akses serdik        | Bagikan untuk group         |
| DanElemen                | Catat/lihat elemen     | Lihat elemen           | Tambah untuk elemen/lihat peserta | Lihat elemen                  | Lihat elemen          | Akses serdik        | Bagikan untuk elemen        |
| Kabid Ops / Kasi terkait | Lihat global           | Pribadi                | Kelola global                     | Pribadi                       | Pribadi               | Akses serdik        | Bagikan                     |
| Anggota Ops              | Pribadi                | Pribadi                | Kelola global                     | Pribadi                       | Pribadi               | Akses serdik        | Bagikan                     |
| LMS                      | Pribadi                | Pribadi                | Lihat/ikut                        | Kelola/tanggapi/ajukan global | Pribadi               | Akses serdik        | Akses serdik                |
| Polisi Serdik            | Kelola global          | Kelola global          | Kelola global                     | Pribadi                       | Pribadi               | Akses serdik        | Akses serdik                |
| Pengasuh                 | Kelola global + filter | Kelola global + filter | Kelola global                     | Lihat global                  | Lihat global + filter | Supervisi           | Bagikan + atur audiens      |

Asumsi yang diterapkan: publikasi informasi dan notulensi diberikan kepada List Merah, Ops, dan pengasuh. Pengasuh melihat aspirasi, sedangkan tanggapan dan proses aspirasi dimiliki LMS. Pejabat group/elemen dapat melihat kegiatan bersama, tetapi tidak mengubah dokumentasi kegiatan global. Kebijakan terpusat di `src/model.ts` untuk disesuaikan setelah aturan operasional disepakati.

## Batas prototipe

- Data contoh disimpan dalam `localStorage` browser dengan kunci `soedirman.portal.v2`. Data versi sebelumnya (`soedirman.portal.v1`) dipertahankan untuk rollback; presensi harian lama menjadi kegiatan arsip tanpa dipaksakan ke sesi apel. Belum ada sinkronisasi antarperangkat atau pengguna.
- Pilihan peran merupakan simulasi UI, **belum autentikasi atau pengamanan data**. Data contoh seluruh peran berada di browser yang sama. Jangan gunakan data pribadi nyata pada tahap ini.
- Database, login, sesi, otorisasi server, notifikasi kirim, dan audit perubahan belum diimplementasikan.
- Dokumentasi dan sumber belajar menggunakan tautan; belum ada unggah berkas.
- Project baru langsung muncul sebagai ide kolaboratif; belum ada persetujuan ide atau tahapan formal yang tidak dijelaskan dalam brief.
- Izin disetujui pada tanggal kegiatan tampil sebagai referensi. Petugas dapat memilih **Terapkan izin disetujui** pada draf; izin tidak otomatis dianggap sebagai ketidakhadiran tanpa pencatatan petugas.
- Nama, nomor, kontak, jadwal, dan informasi awal merupakan contoh. Tidak menggunakan identitas pengguna atau logo ITS dalam aplikasi.
- Font DM Sans memakai Google Fonts dengan fallback sistem; aplikasi tetap terbaca ketika font eksternal tidak tersedia.

`GET /api/health` adalah endpoint server awal yang melaporkan kondisi aplikasi dan mode prototipe secara eksplisit. Endpoint ini belum menyediakan API bisnis.

## Struktur untuk pengembangan backend

```text
app/
  layout.tsx             Metadata dan layout Next.js
  page.tsx               Pintu masuk portal interaktif
  api/health/route.ts     Endpoint pemeriksaan server
src/
  App.tsx                Shell portal, katalog, favorit dan navigasi
  catalog.ts             Registry sembilan aplikasi
  model.ts               Tipe domain, data contoh dan kebijakan akses
  model.test.ts          Pengujian cakupan dan kewenangan
  store.ts               Adapter penyimpanan browser
  ui.tsx                 Komponen, dialog dan formulir dasar
  AttendancePage.tsx      Form pencatatan dan pratinjau laporan WhatsApp
  operations.ts           Cakupan roster, pencatatan, rekap/report dan tindakan home
  HomeActions.tsx         Langkah harian sesuai peran dan konteks kegiatan
  persistence.ts          Migrasi data v1 ke v2 tanpa menghapus cadangan lama
  workflows.tsx          Izin dan kegiatan
  community.tsx          Informasi, direktori, aspirasi, catatan, project, materi
  styles.css             Desain dan breakpoint responsif
```

Untuk tahap backend, ganti adapter penyimpanan dengan API/Server Actions dan otorisasi berdasarkan sesi. Model data yang dibutuhkan: users, groups, elements, role_assignments (peran dan cakupan; satu pengguna bisa mempunyai beberapa jabatan), attendance, leave_requests, events, event_attendees, event_documents, announcements, aspirations, aspiration_responses, good_notes, projects, project_members, project_tasks, project_supervision, learning_resources, resource_access, favorites, dan bookmarks. Presensi perlu constraint unik pengguna/kegiatan; pendaftaran kegiatan constraint unik kegiatan/pengguna; setiap mutasi pengelola perlu otorisasi server dan audit trail.

Pendekatan portal browser menggunakan Client Component yang dimuat dinamis, mengikuti [dokumentasi resmi Next.js](https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr). Server route dan domain TypeScript sudah dipisahkan untuk melanjutkan integrasi backend tanpa membangun ulang tampilan.

## Workflow presensi dan laporan WhatsApp

1. Pengelola membuat kegiatan di Agenda, mengisi tanggal/jam, cakupan group/elemen, arahan dan pakaian; aktifkan pencatatan presensi bila diperlukan.
2. List Merah (sesuai cakupan), Polisi Serdik atau pengasuh membuka **Catat presensi**. Pendaftaran kegiatan tidak dihitung sebagai hadir.
3. Pilih status anggota dan isi alasan untuk Sakit/Izin/Dinas Dalam/Tidak Hadir. **Tandai semua hadir** dan **Terapkan izin disetujui** adalah aksi eksplisit pada draf.
4. **Simpan pencatatan** menyimpan status per kegiatan serta pencatat/waktunya. Pagi dan malam mempunyai record terpisah.
5. **Laporan WhatsApp** menyusun template dari roster aktual, tanggal/jam kegiatan, per-elemen, persentase dan alasan berhalangan. Nama penerima dapat diubah; nomor WhatsApp opsional menggunakan kode negara.
6. Bila masih ada anggota belum dicatat, laporan diberi label draf dan tombol WhatsApp dinonaktifkan. NIHIL hanya muncul jika roster tidak kosong dan seluruh anggota tercatat Hadir.
7. **Buka WhatsApp** membuka pesan terisi untuk dipilih penerimanya dan dikirim oleh pengguna; aplikasi tidak mengirim otomatis. **Salin laporan** tersedia sebagai alternatif. Implementasi mengikuti [panduan click-to-chat WhatsApp](https://faq.whatsapp.com/5913398998672934).

Header laporan mengikuti contoh Nawasena Camp, Batch 1 Angkatan Soedirman TA. 2026. Angka dihitung dari roster demonstrasi yang berisi enam serdik fiktif, bukan di-hardcode menjadi 89. Laporan yang difilter ke satu elemen diberi label elemen tersebut agar tidak disalahartikan sebagai rekap seluruh group.

Beranda dan notifikasi kini menampilkan langkah sesuai peran: pencatatan/monitoring presensi, pengajuan izin, aspirasi LMS, tugas project, supervisi, dan dokumentasi yang dapat dikelola. Klik kegiatan membuka konteks yang sama di Agenda atau Presensi. Kegiatan yang sudah memiliki presensi tidak dapat dipindahkan ke nama/tanggal/sesi/cakupan berbeda; buat kegiatan baru agar riwayat tidak tertukar.

Notulensi tetap berupa informasi yang dapat dibaca; penambahan workflow tindak lanjut notulensi ditunda sesuai instruksi pengguna.

## Verifikasi

Rincian pengujian dan hasil browser tersedia di [VERIFICATION.md](VERIFICATION.md).
