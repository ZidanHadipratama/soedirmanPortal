import {
  createSeed,
  defaultReporting,
  type Attendance,
  type Event,
  type Store,
} from "./model";

const arrayKeys = [
  "attendance",
  "events",
  "leaves",
  "posts",
  "aspirations",
  "goodNotes",
  "projects",
  "resources",
  "favorites",
  "bookmarks",
] as const;
type StoredObject = Record<string, unknown>;
export function migrateStore(value: unknown): Store {
  if (!value || typeof value !== "object")
    throw new Error("Data portal tidak valid.");
  const stored = value as StoredObject;
  if (
    ![1, 2].includes(Number(stored.version)) ||
    arrayKeys.some((key) => !Array.isArray(stored[key]))
  )
    throw new Error("Versi atau struktur data portal tidak dikenali.");
  const events = (stored.events as Event[]).map((e) => {
    if (!e || typeof e.id !== "string" || typeof e.date !== "string")
      throw new Error("Data kegiatan tidak valid.");
    return {
      ...e,
      outfit: e.outfit ?? "",
      description: e.description ?? "",
      attendanceRequired: e.attendanceRequired ?? e.category === "Wajib",
    };
  });
  let attendance: Attendance[];
  if (Number(stored.version) === 1) {
    const legacy = stored.attendance as (Omit<
      Attendance,
      "eventId" | "reason" | "recordedBy" | "recordedAt" | "status"
    > & { status: "Hadir" | "Izin" | "Belum hadir" })[];
    for (const date of new Set(legacy.map((a) => a.date))) {
      const id = "legacy-daily-" + date;
      if (!events.some((e) => e.id === id))
        events.push({
          id,
          title: "Presensi harian (arsip)",
          date,
          time: "00:00",
          end: "23:59",
          location: "Arsip data sebelumnya",
          category: "Arsip",
          attendees: [],
          group: "Semua group",
          element: "Semua elemen",
          documentation: "",
          outfit: "",
          description:
            "Pencatatan harian versi sebelumnya, sebelum presensi per kegiatan. Tidak dianggap sebagai presensi apel.",
          attendanceRequired: true,
          archived: true,
        });
    }
    attendance = legacy.map((a) => ({
      ...a,
      eventId: "legacy-daily-" + a.date,
      status: a.status === "Belum hadir" ? null : a.status,
      reason: a.status === "Izin" ? "Izin pada catatan harian lama" : "",
      recordedBy: "Arsip versi sebelumnya",
      recordedAt: "",
    }));
    const evening = createSeed().events.find((e) => e.id === "e5")!;
    if (
      !events.some(
        (e) =>
          e.date === evening.date &&
          e.title.toLowerCase().includes("apel malam"),
      )
    )
      events.push({
        ...evening,
        id: events.some((e) => e.id === evening.id)
          ? "apel-malam-" + evening.date
          : evening.id,
      });
  } else {
    attendance = (stored.attendance as (Omit<Attendance, "status"> & { status: Attendance["status"] | "Dinas Luar" | "Belum dicatat" })[]).map((a) => {
      if (!a || typeof a.eventId !== "string" || typeof a.personId !== "string")
        throw new Error("Data presensi kegiatan tidak valid.");
      return {
        ...a,
        status: a.status === "Dinas Luar" ? "Dinas Dalam" : a.status === "Belum dicatat" ? null : a.status,
        reason: a.reason ?? "",
        recordedBy: a.recordedBy ?? "",
        recordedAt: a.recordedAt ?? "",
      };
    });
  }
  const reporting = stored.reporting as Store["reporting"] | undefined;
  return {
    ...(stored as unknown as Store),
    version: 2,
    attendance,
    events,
    reporting: reporting?.commanders ? reporting : defaultReporting(),
  };
}
