import {
  can,
  canManageEvent,
  currentPerson,
  inScope,
  localDate,
  people,
  roleLabels,
  visibleEvent,
  type Attendance,
  type Event,
  type Person,
  type Role,
  type Store,
} from "./model";

export const attendanceStatuses: Attendance["status"][] = [
  "Belum dicatat",
  "Hadir",
  "Sakit",
  "Izin",
  "Dinas Luar",
  "Tidak Hadir",
];
export function activityRoster(
  event: Event,
  role: Role,
  group?: string,
  element?: string,
): Person[] {
  return people.filter(
    (p) =>
      inScope(role, p) &&
      (event.group === "Semua group" || event.group === p.group) &&
      (event.element === "Semua elemen" || event.element === p.element) &&
      (!group || p.group === group) &&
      (!element || p.element === element),
  );
}
export function attendanceFor(data: Store, eventId: string, personId: string) {
  return data.attendance.find(
    (a) => a.eventId === eventId && a.personId === personId,
  );
}
export function approvedLeaveFor(data: Store, date: string, personId: string) {
  return data.leaves.find(
    (l) =>
      l.personId === personId &&
      l.status === "Diizinkan" &&
      l.from <= date &&
      l.to >= date,
  );
}
export type AttendanceEntry = {
  personId: string;
  status: Attendance["status"];
  reason: string;
};
export function recordAttendance(
  data: Store,
  role: Role,
  eventId: string,
  entries: AttendanceEntry[],
  now = new Date(),
): Store {
  if (!can(role, "attendance.manage"))
    throw new Error("Peran ini tidak berwenang mencatat presensi.");
  const event = data.events.find((e) => e.id === eventId);
  if (
    !event ||
    !event.attendanceRequired ||
    event.archived ||
    !visibleEvent(role, event)
  )
    throw new Error("Kegiatan tidak tersedia untuk pencatatan.");
  const allowed = new Set(activityRoster(event, role).map((p) => p.id));
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!allowed.has(entry.personId))
      throw new Error("Serdik berada di luar cakupan akses.");
    if (seen.has(entry.personId))
      throw new Error("Serdik tercatat lebih dari sekali.");
    seen.add(entry.personId);
    if (!attendanceStatuses.includes(entry.status))
      throw new Error("Status presensi tidak valid.");
    if (
      !["Hadir", "Belum dicatat"].includes(entry.status) &&
      !entry.reason.trim()
    )
      throw new Error("Lengkapi keterangan untuk serdik yang berhalangan.");
  }
  const updates = entries
    .filter((e) => e.status !== "Belum dicatat")
    .map((entry) => ({
      id:
        data.attendance.find(
          (a) => a.eventId === eventId && a.personId === entry.personId,
        )?.id ?? crypto.randomUUID(),
      personId: entry.personId,
      eventId,
      date: event.date,
      time: now
        .toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        })
        .replace(".", ":"),
      status: entry.status,
      reason: entry.status === "Hadir" ? "" : entry.reason.trim(),
      recordedBy: roleLabels[role] + " · " + currentPerson.name,
      recordedAt: now.toISOString(),
    }));
  return {
    ...data,
    attendance: [
      ...data.attendance.filter(
        (a) => a.eventId !== eventId || !seen.has(a.personId),
      ),
      ...updates,
    ],
  };
}
export function recap(data: Store, event: Event, members: Person[]) {
  const rows = members.map((person) => ({
    person,
    record: attendanceFor(data, event.id, person.id),
  }));
  const count = (status: Attendance["status"]) =>
    rows.filter((r) => r.record?.status === status).length;
  const pending = rows.filter(
    (r) => !r.record || r.record.status === "Belum dicatat",
  ).length;
  return {
    rows,
    total: members.length,
    hadir: count("Hadir"),
    sakit: count("Sakit"),
    izin: count("Izin"),
    dinas: count("Dinas Luar"),
    absent: count("Tidak Hadir"),
    pending,
    percentage: members.length
      ? Math.round((count("Hadir") / members.length) * 1000) / 10
      : 0,
    complete: members.length > 0 && pending === 0,
    elements: [...new Set(members.map((p) => p.element))].map((element) => ({
      element,
      members: members.filter((p) => p.element === element),
    })),
  };
}
const reportText = (s: string) =>
  s
    .replace(/[\r\n*`_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function activitySession(event: Event) {
  const lower = event.title.toLowerCase();
  const title =
    lower.includes("apel") && lower.includes("malam")
      ? "APEL MALAM"
      : lower.includes("apel") && lower.includes("pagi")
        ? "APEL PAGI"
        : reportText(event.title).toUpperCase();
  return title + " (" + event.time.replace(":", ".") + " WIB)";
}
export function buildAttendanceReport(
  data: Store,
  role: Role,
  event: Event,
  group: string,
  element?: string,
) {
  if (!can(role, "attendance.view"))
    throw new Error("Peran ini tidak memiliki akses laporan anggota.");
  if (!visibleEvent(role, event))
    throw new Error("Kegiatan berada di luar cakupan akses.");
  const members = activityRoster(event, role, group, element);
  const stats = recap(data, event, members);
  const config = data.reporting;
  const groupLabel = group.replace(/^Group /, "Grup ");
  const commander = config.commanders[group]?.name || "Komandan " + groupLabel;
  const session = activitySession(event);
  const scopedElement =
    element ||
    (role === "danelemen" ? currentPerson.element : undefined) ||
    (event.element !== "Semua elemen" ? event.element : undefined);
  const date = new Date(event.date + "T12:00:00+07:00").toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  );
  const lines = [
    "*" +
      (stats.complete ? "LAPORAN RESMI" : "DRAF LAPORAN") +
      " ABSENSI " +
      session +
      "*",
    "*PORTAL " +
      groupLabel.toUpperCase() +
      (scopedElement ? " | " + reportText(scopedElement).toUpperCase() : "") +
      " | P3MD FASE " +
      reportText(config.phase) +
      "*",
    reportText(config.camp) +
      " • Batch " +
      reportText(config.batch) +
      " Angkatan " +
      reportText(config.cohort) +
      " TA. " +
      reportText(config.year),
    "━━━━━━━━━━━━━━━━━━━━━",
    "📅 *Hari/Tanggal:* " + date,
    "⏰ *Sesi:* " + session,
    ...(stats.complete
      ? []
      : ["", "⚠️ *BELUM LENGKAP:* " + stats.pending + " siswa belum dicatat."]),
    "",
    "*📊 REKAPITULASI " +
      (scopedElement
        ? reportText(scopedElement).toUpperCase()
        : "KESELURUHAN") +
      " (" +
      stats.total +
      " SISWA):*",
    "• Hadir      : " + stats.hadir + " Siswa",
    "• Sakit      : " + stats.sakit + " Siswa",
    "• Izin       : " + stats.izin + " Siswa",
    "• Dinas Luar : " + stats.dinas + " Siswa",
    ...(stats.absent ? ["• Tidak Hadir: " + stats.absent + " Siswa"] : []),
    ...(stats.pending ? ["• Belum dicatat: " + stats.pending + " Siswa"] : []),
    "• Total      : " +
      stats.total +
      " Siswa (" +
      stats.percentage.toLocaleString("id-ID") +
      "% Kehadiran)",
    "",
    "*📌 RINCIAN PER ELEMEN:*",
    ...stats.elements.map((e, index) => {
      const r = recap(data, event, e.members);
      return (
        index +
        1 +
        ". " +
        e.element +
        " : Hadir " +
        r.hadir +
        "/" +
        r.total +
        " (S:" +
        r.sakit +
        ", I:" +
        r.izin +
        ", DL:" +
        r.dinas +
        (r.absent ? ", TH:" + r.absent : "") +
        (r.pending ? ", Belum:" + r.pending : "") +
        ")"
      );
    }),
    "",
    "*📋 DAFTAR SISWA BERHALANGAN / KETERANGAN:*",
  ];
  const exceptions = stats.rows.filter(
    (r) => r.record && !["Hadir", "Belum dicatat"].includes(r.record.status),
  );
  if (stats.complete && stats.hadir === stats.total)
    lines.push(
      "✅ *NIHIL* (Seluruh " + stats.total + " Siswa Hadir Lengkap & Tertib)",
    );
  else {
    exceptions.forEach((r, i) =>
      lines.push(
        i +
          1 +
          ". " +
          reportText(r.person.name) +
          " (" +
          r.person.number +
          ", " +
          r.person.element +
          ") — " +
          r.record!.status +
          ": " +
          reportText(r.record!.reason),
      ),
    );
    if (!exceptions.length)
      lines.push(
        "Belum dapat dinyatakan NIHIL karena pencatatan belum lengkap.",
      );
    if (stats.pending)
      lines.push(
        "Belum dicatat: " +
          stats.rows
            .filter((r) => !r.record || r.record.status === "Belum dicatat")
            .map((r) => reportText(r.person.name))
            .join(", ") +
          ".",
      );
  }
  lines.push(
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "Demikian laporan disampaikan kepada Komandan " +
      groupLabel +
      " (" +
      reportText(commander) +
      ").",
    "_Laporan otomatis digenerate via Portal Komunitas " +
      groupLabel +
      (scopedElement ? " — " + reportText(scopedElement) : "") +
      "_",
  );
  return {
    message: lines.join("\n"),
    stats,
    commander,
    phone: config.commanders[group]?.phone ?? "",
  };
}
export function whatsappLink(message: string, phone = "") {
  const normalized = phone.replace(/[\s()+-]/g, "");
  if (normalized && !/^[1-9]\d{7,14}$/.test(normalized))
    throw new Error(
      "Gunakan nomor WhatsApp dengan kode negara, misalnya 628… tanpa nol awal.",
    );
  return "https://wa.me/" + normalized + "?text=" + encodeURIComponent(message);
}
export type HomeAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "blue" | "amber" | "teal";
  count?: number;
};
export function activityHref(app: "attendance" | "schedule", eventId: string) {
  return "#/app/" + app + "?activity=" + encodeURIComponent(eventId);
}
export function homeActions(
  data: Store,
  role: Role,
  date = localDate(),
): HomeAction[] {
  const result: HomeAction[] = [];
  const activities = data.events
    .filter((e) => e.date === date && !e.archived && visibleEvent(role, e))
    .sort((a, b) => a.time.localeCompare(b.time));
  if (can(role, "attendance.view")) {
    const waiting = activities.filter(
      (e) =>
        e.attendanceRequired &&
        recap(data, e, activityRoster(e, role)).pending > 0,
    );
    if (waiting.length)
      result.push({
        id: "attendance",
        title: can(role, "attendance.manage")
          ? "Catat presensi kegiatan"
          : "Pantau presensi kegiatan",
        description:
          waiting.length +
          " kegiatan masih memiliki serdik yang belum dicatat.",
        href: activityHref("attendance", waiting[0].id),
        tone: "blue",
        count: waiting.length,
      });
    else {
      const e = activities.find((e) => e.attendanceRequired);
      if (e)
        result.push({
          id: "attendance",
          title: "Rekap presensi siap ditinjau",
          description:
            "Pencatatan kegiatan hari ini sudah lengkap dalam cakupanmu.",
          href: activityHref("attendance", e.id),
          tone: "teal",
        });
    }
  } else {
    const e = activities.find(
      (e) =>
        e.attendanceRequired &&
        (!attendanceFor(data, e.id, "me") ||
          attendanceFor(data, e.id, "me")?.status === "Belum dicatat"),
    );
    if (e)
      result.push({
        id: "attendance",
        title: "Lihat status presensi saya",
        description: e.title + ": menunggu pencatatan pejabat berwenang.",
        href: activityHref("attendance", e.id),
        tone: "blue",
      });
  }
  const permits = data.leaves.filter(
    (l) =>
      l.status === "Menunggu" &&
      (can(role, "leave.manage")
        ? inScope(
            role,
            people.find((p) => p.id === l.personId) ?? currentPerson,
          )
        : l.personId === "me"),
  );
  if (permits.length)
    result.push({
      id: "leave",
      title: can(role, "leave.manage")
        ? "Tinjau pengajuan izin"
        : "Pantau pengajuan izin saya",
      description: permits.length + " pengajuan menunggu keputusan.",
      href: "#/app/leave",
      tone: "amber",
      count: permits.length,
    });
  if (can(role, "aspiration.manage")) {
    const pending = data.aspirations.filter((a) => a.status !== "Selesai");
    if (pending.length)
      result.push({
        id: "aspiration",
        title: "Tanggapi aspirasi serdik",
        description: pending.length + " aspirasi masih dalam penanganan LMS.",
        href: "#/app/aspirations",
        tone: "amber",
        count: pending.length,
      });
  }
  if (can(role, "project.supervise")) {
    const pending = data.projects.filter((p) => !p.feedback);
    if (pending.length)
      result.push({
        id: "project",
        title: "Supervisi project",
        description:
          pending.length + " project belum mendapat catatan supervisi.",
        href: "#/app/projects",
        tone: "teal",
        count: pending.length,
      });
  }
  if (can(role, "schedule.manage")) {
    const pending = activities.filter(
      (e) => canManageEvent(role, e) && !e.documentation,
    );
    if (pending.length)
      result.push({
        id: "documentation",
        title: "Lengkapi dokumentasi kegiatan",
        description:
          pending.length +
          " kegiatan hari ini belum memiliki tautan dokumentasi.",
        href: activityHref("schedule", pending[0].id),
        tone: "teal",
        count: pending.length,
      });
  }
  const ownProjects = data.projects.filter(
    (p) => p.members.includes("me") && p.tasks.some((t) => !t.done),
  );
  if (ownProjects.length && !can(role, "project.supervise"))
    result.push({
      id: "project",
      title: "Lanjutkan tugas project saya",
      description:
        ownProjects.length +
        " project masih memiliki tugas yang perlu diselesaikan.",
      href: "#/app/projects",
      tone: "teal",
      count: ownProjects.length,
    });
  return result.slice(0, 4);
}
