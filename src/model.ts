export type Role =
  | "serdik"
  | "danbatch"
  | "wadanbatch"
  | "dangroup"
  | "danelemen"
  | "ops-head"
  | "ops"
  | "lms"
  | "polserdik"
  | "pengasuh";
export type Capability =
  | "attendance.view"
  | "attendance.manage"
  | "leave.view"
  | "leave.manage"
  | "schedule.manage"
  | "aspiration.view"
  | "aspiration.manage"
  | "good.view"
  | "project.supervise"
  | "learning.manage"
  | "information.manage";
export type Scope = "self" | "element" | "group" | "global";
export const roleLabels: Record<Role, string> = {
  serdik: "Serdik reguler",
  danbatch: "DanBatch Corps",
  wadanbatch: "WadanBatch Corps",
  dangroup: "DanGroup",
  danelemen: "DanElemen",
  "ops-head": "Kabid Ops / Kasi terkait",
  ops: "Anggota Ops",
  lms: "Lembaga Musyawarah Serdik",
  polserdik: "Polisi Serdik",
  pengasuh: "Pengasuh",
};
const listRed: Capability[] = [
  "attendance.view",
  "attendance.manage",
  "leave.view",
  "schedule.manage",
  "aspiration.view",
  "good.view",
  "learning.manage",
  "information.manage",
];
export const policies: Record<
  Role,
  { scope: Scope; capabilities: Capability[] }
> = {
  serdik: { scope: "self", capabilities: [] },
  danbatch: { scope: "global", capabilities: listRed },
  wadanbatch: { scope: "global", capabilities: listRed },
  dangroup: { scope: "group", capabilities: listRed },
  danelemen: { scope: "element", capabilities: listRed },
  "ops-head": {
    scope: "global",
    capabilities: [
      "attendance.view",
      "schedule.manage",
      "learning.manage",
      "information.manage",
    ],
  },
  ops: {
    scope: "self",
    capabilities: ["schedule.manage", "learning.manage", "information.manage"],
  },
  lms: {
    scope: "global",
    capabilities: ["aspiration.view", "aspiration.manage"],
  },
  polserdik: {
    scope: "global",
    capabilities: [
      "attendance.view",
      "attendance.manage",
      "leave.view",
      "leave.manage",
      "schedule.manage",
    ],
  },
  pengasuh: {
    scope: "global",
    capabilities: [
      "attendance.view",
      "attendance.manage",
      "leave.view",
      "leave.manage",
      "schedule.manage",
      "aspiration.view",
      "good.view",
      "project.supervise",
      "learning.manage",
      "information.manage",
    ],
  },
};
export function can(role: Role, capability: Capability) {
  return policies[role].capabilities.includes(capability);
}
export type Person = {
  id: string;
  name: string;
  number: string;
  group: string;
  element: string;
  position: string;
  email: string;
};
export const people: Person[] = [
  {
    id: "me",
    name: "Arif Pratama",
    number: "2026.0148",
    group: "Group 1",
    element: "Elemen A",
    position: "Serdik",
    email: "arif.pratama@example.com",
  },
  {
    id: "s2",
    name: "Nadia Putri",
    number: "2026.0149",
    group: "Group 1",
    element: "Elemen A",
    position: "DanElemen",
    email: "nadia.putri@example.com",
  },
  {
    id: "s3",
    name: "Rizky Aditya",
    number: "2026.0150",
    group: "Group 1",
    element: "Elemen B",
    position: "Serdik",
    email: "rizky.aditya@example.com",
  },
  {
    id: "s4",
    name: "Dimas Saputra",
    number: "2026.0151",
    group: "Group 2",
    element: "Elemen C",
    position: "DanGroup",
    email: "dimas.saputra@example.com",
  },
  {
    id: "s5",
    name: "Alya Rahma",
    number: "2026.0152",
    group: "Group 2",
    element: "Elemen D",
    position: "Serdik",
    email: "alya.rahma@example.com",
  },
  {
    id: "s6",
    name: "Fajar Hidayat",
    number: "2026.0153",
    group: "Group 1",
    element: "Elemen A",
    position: "Serdik",
    email: "fajar.hidayat@example.com",
  },
];
export const currentPerson = people[0];
export function inScope(role: Role, person: Person) {
  const scope = policies[role].scope;
  return (
    scope === "global" ||
    (scope === "group" && person.group === currentPerson.group) ||
    (scope === "element" && person.element === currentPerson.element) ||
    person.id === currentPerson.id
  );
}
export function personFor(id: string) {
  return people.find((p) => p.id === id) ?? currentPerson;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatDate(value: string, short = false) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "id-ID",
    short
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "long", year: "numeric" },
  );
}
export function relativeDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function uid() {
  return crypto.randomUUID();
}
export type Attendance = {
  id: string;
  personId: string;
  date: string;
  eventId: string;
  time: string;
  status:
    "Hadir" | "Sakit" | "Izin" | "Dinas Dalam" | "Tidak Hadir" | null;
  reason: string;
  recordedBy: string;
  recordedAt: string;
};
export type Leave = {
  id: string;
  personId: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: "Menunggu" | "Diizinkan" | "Ditolak";
  response?: string;
};
export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  end: string;
  location: string;
  category: string;
  attendees: string[];
  group: string;
  element: string;
  documentation: string;
  outfit: string;
  description: string;
  attendanceRequired: boolean;
  archived?: boolean;
};
export type ReportingConfig = {
  camp: string;
  phase: string;
  batch: string;
  cohort: string;
  year: string;
  commanders: Record<string, { name: string; phone: string }>;
};
export function defaultReporting(): ReportingConfig {
  return {
    camp: "Nawasena Camp",
    phase: "2",
    batch: "1",
    cohort: "Soedirman",
    year: "2026",
    commanders: {
      "Group 1": { name: "Komandan Grup 1", phone: "" },
      "Group 2": { name: "Dimas Satria Dwi Putra", phone: "" },
    },
  };
}
export type Post = {
  id: string;
  title: string;
  category: string;
  body: string;
  date: string;
  author: string;
  pinned: boolean;
};
export type Aspiration = {
  id: string;
  personId: string;
  title: string;
  category: string;
  body: string;
  status: "Diterima" | "Diproses" | "Diajukan" | "Selesai";
  response: string;
  date: string;
};
export type GoodNote = {
  id: string;
  personId: string;
  title: string;
  body: string;
  date: string;
  category: string;
};
export type Project = {
  id: string;
  title: string;
  body: string;
  category: string;
  members: string[];
  tasks: { id: string; title: string; done: boolean }[];
  feedback: string;
  owner: string;
};
export type Resource = {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  author: string;
  audience: string;
};
export type Store = {
  version: 2;
  reporting: ReportingConfig;
  attendance: Attendance[];
  leaves: Leave[];
  events: Event[];
  posts: Post[];
  aspirations: Aspiration[];
  goodNotes: GoodNote[];
  projects: Project[];
  resources: Resource[];
  favorites: string[];
  bookmarks: string[];
};
export function createSeed(): Store {
  return {
    version: 2,
    reporting: defaultReporting(),
    favorites: [
      "attendance",
      "leave",
      "schedule",
      "information",
      "projects",
      "learning",
    ],
    bookmarks: [],
    attendance: people.slice(1).map((p, i) => ({
      id: `a${i}`,
      personId: p.id,
      date: localDate(),
      eventId: "e1",
      time: "06:45",
      status: i === 3 ? "Izin" : "Hadir",
      reason: i === 3 ? "Keperluan keluarga" : "",
      recordedBy: "Pengasuh (data contoh)",
      recordedAt: `${localDate()}T06:45:00+07:00`,
    })),
    leaves: [
      {
        id: "l1",
        personId: "s5",
        type: "Keperluan keluarga",
        from: localDate(),
        to: relativeDate(1),
        reason: "Menghadiri keperluan keluarga dengan pendamping.",
        status: "Menunggu",
      },
    ],
    events: [
      {
        id: "e1",
        title: "Apel pagi & pengarahan",
        date: localDate(),
        time: "07:00",
        end: "07:30",
        location: "Lapangan utama",
        category: "Wajib",
        attendees: ["s2", "s3"],
        group: "Semua group",
        element: "Semua elemen",
        documentation: "",
        outfit: "Sesuai arahan apel pagi",
        description:
          "Apel pagi dan pengarahan untuk seluruh serdik. Presensi dicatat oleh pejabat berwenang.",
        attendanceRequired: true,
      },
      {
        id: "e2",
        title: "Diskusi kepemimpinan",
        date: localDate(),
        time: "10:00",
        end: "11:30",
        location: "Ruang Soedirman",
        category: "Akademik",
        attendees: ["s2", "s6"],
        group: "Semua group",
        element: "Semua elemen",
        documentation: "",
        outfit: "Sesuai arahan kegiatan",
        description: "Diskusi kelompok dan pengembangan kepemimpinan.",
        attendanceRequired: false,
      },
      {
        id: "e3",
        title: "Koordinasi project sosial",
        date: localDate(),
        time: "15:30",
        end: "16:30",
        location: "Ruang kolaborasi",
        category: "Project",
        attendees: ["me", "s3"],
        group: "Semua group",
        element: "Semua elemen",
        documentation: "",
        outfit: "Sesuai arahan kegiatan",
        description: "Koordinasi tim dan pembagian tugas project sosial.",
        attendanceRequired: false,
      },
      {
        id: "e4",
        title: "Bakti sosial: peduli lingkungan",
        date: relativeDate(2),
        time: "08:00",
        end: "11:00",
        location: "Titik kumpul lapangan utama",
        category: "Sosial",
        attendees: ["s4"],
        group: "Group 2",
        element: "Semua elemen",
        documentation: "",
        outfit: "Sesuai arahan kegiatan",
        description: "Kegiatan sosial untuk peserta Group 2.",
        attendanceRequired: false,
      },
      {
        id: "e5",
        title: "Apel malam",
        date: localDate(),
        time: "21:00",
        end: "21:30",
        location: "Lapangan utama",
        category: "Wajib",
        attendees: [],
        group: "Semua group",
        element: "Semua elemen",
        documentation: "",
        outfit: "Sesuai arahan apel malam",
        description:
          "Apel malam dan evaluasi harian. Presensi dicatat per group dan elemen.",
        attendanceRequired: true,
      },
    ],
    posts: [
      {
        id: "p1",
        title: "Persiapan kegiatan bakti sosial",
        category: "Pengumuman",
        body: "Kegiatan bakti sosial dilaksanakan pekan ini. Setiap elemen menyiapkan perlengkapan kebersihan dan berkoordinasi dengan penanggung jawab group. Rincian waktu dan lokasi tersedia di aplikasi Agenda.",
        date: localDate(),
        author: "Bidang Operasional",
        pinned: true,
      },
      {
        id: "p2",
        title: "Notulensi musyawarah serdik",
        category: "Notulensi",
        body: "Hasil musyawarah: 1. Aspirasi sarana belajar diteruskan ke pengasuh. 2. Project sosial dibagi menjadi tim dokumentasi dan pelaksana. 3. Evaluasi kegiatan dilakukan pada akhir pekan. Penanggung jawab tindak lanjut: LMS dan koordinator project.",
        date: relativeDate(-1),
        author: "Lembaga Musyawarah Serdik",
        pinned: false,
      },
      {
        id: "p3",
        title: "Materi kepemimpinan sudah tersedia",
        category: "Informasi",
        body: "Referensi kepemimpinan dan panduan refleksi kegiatan dapat dibaca melalui Ruang Belajar. Siapkan satu pertanyaan untuk sesi diskusi berikutnya.",
        date: relativeDate(-2),
        author: "Tim Pengasuh",
        pinned: false,
      },
    ],
    aspirations: [
      {
        id: "as1",
        personId: "s2",
        title: "Penambahan waktu akses ruang belajar",
        category: "Sarana belajar",
        body: "Mengusulkan ruang belajar tetap dibuka hingga pukul 21.00 untuk diskusi kelompok.",
        status: "Diproses",
        response:
          "Sedang dikoordinasikan dengan pengasuh terkait jadwal dan ketersediaan ruangan.",
        date: relativeDate(-1),
      },
    ],
    goodNotes: [
      {
        id: "g1",
        personId: "me",
        title: "Mendampingi rekan dalam diskusi",
        body: "Membantu rekan memahami materi dan menyusun catatan untuk diskusi kepemimpinan.",
        date: relativeDate(-1),
        category: "Kepedulian",
      },
      {
        id: "g2",
        personId: "s2",
        title: "Menata ruang bersama",
        body: "Bersama anggota elemen, merapikan ruang belajar setelah digunakan.",
        date: relativeDate(-1),
        category: "Kerja sama",
      },
    ],
    projects: [
      {
        id: "pr1",
        title: "Soedirman Peduli",
        body: "Bersama membangun kebiasaan peduli melalui kegiatan sosial dan pendampingan masyarakat.",
        category: "Sosial",
        owner: "me",
        members: ["me", "s2", "s3"],
        tasks: [
          { id: "t1", title: "Susun konsep kegiatan", done: true },
          { id: "t2", title: "Koordinasi dengan lokasi kegiatan", done: true },
          { id: "t3", title: "Siapkan logistik dan dokumentasi", done: false },
          { id: "t4", title: "Pelaksanaan dan evaluasi", done: false },
        ],
        feedback: "",
      },
      {
        id: "pr2",
        title: "Pojok Literasi",
        body: "Membuat kumpulan ringkasan bacaan dan sesi berbagi pengetahuan antarserdik.",
        category: "Pendidikan",
        owner: "s4",
        members: ["s4", "s5"],
        tasks: [
          { id: "t5", title: "Kurasi bacaan pertama", done: true },
          { id: "t6", title: "Jadwalkan sesi berbagi", done: false },
          { id: "t7", title: "Publikasikan rangkuman", done: false },
        ],
        feedback: "",
      },
    ],
    resources: [
      {
        id: "r1",
        title: "Dasar-dasar kepemimpinan",
        description:
          "Bacaan pengantar tentang memimpin, bekerja sama, dan mengambil keputusan.",
        category: "Kepemimpinan",
        url: "https://id.wikipedia.org/wiki/Kepemimpinan",
        author: "Tim Pengasuh",
        audience: "Semua serdik",
      },
      {
        id: "r2",
        title: "Panduan belajar mandiri",
        description:
          "Temukan bahan bacaan terbuka untuk mendukung kegiatan belajar sehari-hari.",
        category: "Pengembangan diri",
        url: "https://id.wikibooks.org/wiki/Halaman_Utama",
        author: "Bidang Operasional",
        audience: "Semua serdik",
      },
      {
        id: "r3",
        title: "Mengenal kerja sama tim",
        description:
          "Referensi untuk koordinasi project dan pembagian tanggung jawab dalam kelompok.",
        category: "Kolaborasi",
        url: "https://id.wikipedia.org/wiki/Kerja_sama",
        author: "Tim Pengasuh",
        audience: "Semua serdik",
      },
    ],
  };
}
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}
export function visibleEvent(role: Role, event: Event) {
  const scope = policies[role].scope;
  if (scope === "global" || role === "ops") return true;
  return (
    (event.group === "Semua group" || event.group === currentPerson.group) &&
    (event.element === "Semua elemen" ||
      event.element === currentPerson.element ||
      scope === "group")
  );
}
export function canManageEvent(role: Role, event: Event) {
  if (!can(role, "schedule.manage")) return false;
  if (policies[role].scope === "global" || role === "ops") return true;
  if (policies[role].scope === "group")
    return event.group === currentPerson.group;
  return (
    event.group === currentPerson.group &&
    event.element === currentPerson.element
  );
}
