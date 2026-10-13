import { describe, expect, it } from "vitest";
import {
  createSeed,
  people,
  currentPerson,
  localDate,
  type Attendance,
  type Role,
} from "./model";
import {
  activityHref,
  activityRoster,
  attendanceFor,
  buildAttendanceReport,
  homeActions,
  recap,
  recordAttendance,
  whatsappLink,
} from "./operations";

const now = new Date("2026-10-12T14:02:00Z");
function fixture() {
  const data = createSeed();
  data.attendance = [];
  return data;
}
function rows(ids: string[], status: Attendance["status"] = "Hadir") {
  return ids.map((personId) => ({
    personId,
    status,
    reason: status === "Hadir" ? "" : "Keterangan uji",
  }));
}
describe("Scoped activity attendance", () => {
  it.each(["serdik", "lms", "ops", "ops-head"] as Role[])(
    "blocks recording by %s",
    (role) => {
      const data = fixture();
      expect(() => recordAttendance(data, role, "e5", rows(["me"]))).toThrow(
        "tidak berwenang",
      );
      expect(data.attendance).toEqual([]);
    },
  );
  it.each(["danbatch", "wadanbatch", "polserdik", "pengasuh"] as Role[])(
    "allows global recording by %s",
    (role) => {
      const data = recordAttendance(
        fixture(),
        role,
        "e5",
        rows(people.map((p) => p.id)),
        now,
      );
      expect(data.attendance).toHaveLength(6);
      expect(data.attendance[0].eventId).toBe("e5");
      expect(data.attendance[0].time).toBe("21:02");
    },
  );
  it("enforces group and element scope for recorders", () => {
    expect(() =>
      recordAttendance(fixture(), "dangroup", "e5", rows(["s4"])),
    ).toThrow("luar cakupan");
    expect(() =>
      recordAttendance(fixture(), "danelemen", "e5", rows(["s3"])),
    ).toThrow("luar cakupan");
    expect(
      recordAttendance(fixture(), "danelemen", "e5", rows(["me", "s2", "s6"]))
        .attendance,
    ).toHaveLength(3);
  });
  it("keeps morning and evening separate, updates rather than duplicating", () => {
    let data = recordAttendance(fixture(), "pengasuh", "e1", rows(["me"]), now);
    expect(attendanceFor(data, "e5", "me")).toBeUndefined();
    data = recordAttendance(
      data,
      "pengasuh",
      "e5",
      [{ personId: "me", status: "Sakit", reason: "Demam" }],
      now,
    );
    data = recordAttendance(data, "pengasuh", "e5", rows(["me"]), now);
    expect(data.attendance).toHaveLength(2);
    expect(attendanceFor(data, "e1", "me")?.status).toBe("Hadir");
    expect(attendanceFor(data, "e5", "me")?.recordedBy).toContain("Pengasuh");
  });
  it("requires an absence reason and rejects duplicate or invalid entries", () => {
    expect(() =>
      recordAttendance(fixture(), "pengasuh", "e5", [
        { personId: "me", status: "Izin", reason: "  " },
      ]),
    ).toThrow("keterangan");
    expect(() =>
      recordAttendance(fixture(), "pengasuh", "e5", rows(["me", "me"])),
    ).toThrow("lebih dari sekali");
    expect(() =>
      recordAttendance(fixture(), "pengasuh", "e5", [
        {
          personId: "me",
          status: "Invalid" as Attendance["status"],
          reason: "test",
        },
      ]),
    ).toThrow("tidak valid");
    expect(() =>
      recordAttendance(fixture(), "pengasuh", "e2", rows(["me"])),
    ).toThrow("tidak tersedia");
  });
  it("treats registration as separate from verified attendance", () => {
    const data = fixture();
    const event = data.events.find((e) => e.id === "e1")!;
    expect(event.attendees.length).toBeGreaterThan(0);
    expect(recap(data, event, activityRoster(event, "pengasuh")).hadir).toBe(0);
    expect(recap(data, event, activityRoster(event, "pengasuh")).pending).toBe(
      6,
    );
  });
  it("can return an edited record to pending without affecting other activity records", () => {
    let data = recordAttendance(fixture(), "pengasuh", "e5", rows(["me"]));
    data = recordAttendance(data, "pengasuh", "e1", rows(["me"]));
    data = recordAttendance(
      data,
      "pengasuh",
      "e5",
      rows(["me"], null),
    );
    expect(attendanceFor(data, "e5", "me")).toBeUndefined();
    expect(attendanceFor(data, "e1", "me")).toBeDefined();
  });
});
describe("Accurate report template", () => {
  it("renders the supplied structure with real counts, date, reasons and recipient", () => {
    let data = fixture();
    data.events = data.events.map((e) =>
      e.id === "e5" ? { ...e, date: "2026-10-12" } : e,
    );
    data = recordAttendance(
      data,
      "pengasuh",
      "e5",
      [
        { personId: "s4", status: "Hadir", reason: "" },
        { personId: "s5", status: "Sakit", reason: "Demam" },
      ],
      now,
    );
    const report = buildAttendanceReport(
      data,
      "pengasuh",
      data.events.find((e) => e.id === "e5")!,
      "Group 2",
    );
    expect(report.message).toBe(
      [
        "*LAPORAN RESMI ABSENSI APEL MALAM (21.00 WIB)*",
        "*PORTAL GRUP 2 | P3MD FASE 2*",
        "Nawasena Camp • Batch 1 Angkatan Soedirman TA. 2026",
        "━━━━━━━━━━━━━━━━━━━━━",
        "📅 *Hari/Tanggal:* Senin, 12 Oktober 2026",
        "⏰ *Sesi:* APEL MALAM (21.00 WIB)",
        "",
        "*📊 REKAPITULASI KESELURUHAN (2 SISWA):*",
        "• Hadir      : 1 Siswa",
        "• Sakit      : 1 Siswa",
        "• Izin       : 0 Siswa",
        "• Dinas Dalam : 0 Siswa",
        "• Total      : 2 Siswa (50% Kehadiran)",
        "",
        "*📌 RINCIAN PER ELEMEN:*",
        "1. Elemen C : Hadir 1/1 (S:0, I:0, DD:0)",
        "2. Elemen D : Hadir 0/1 (S:1, I:0, DD:0)",
        "",
        "*📋 DAFTAR SISWA BERHALANGAN / KETERANGAN:*",
        "1. Alya Rahma (2026.0152, Elemen D) — Sakit: Demam",
        "",
        "━━━━━━━━━━━━━━━━━━━━━",
        "Demikian laporan disampaikan kepada Komandan Grup 2 (Dimas Satria Dwi Putra).",
        "_Laporan otomatis digenerate via Portal Komunitas Grup 2_",
      ].join("\n"),
    );
    expect(report.stats.complete).toBe(true);
    expect(report.message).not.toContain("NIHIL");
  });
  it("never declares NIHIL while records are missing or roster is empty", () => {
    const data = fixture();
    const event = data.events.find((e) => e.id === "e5")!;
    const r = buildAttendanceReport(data, "pengasuh", event, "Group 2");
    expect(r.message).toContain("*DRAF LAPORAN");
    expect(r.message).not.toContain("✅ *NIHIL*");
    expect(r.stats.pending).toBe(2);
    expect(r.stats.complete).toBe(false);
    expect(
      buildAttendanceReport(data, "pengasuh", event, "No such group").stats
        .complete,
    ).toBe(false);
  });
  it("declares NIHIL only when the full selected roster is actually present", () => {
    const data = recordAttendance(
      fixture(),
      "pengasuh",
      "e5",
      rows(["s4", "s5"]),
    );
    const r = buildAttendanceReport(
      data,
      "pengasuh",
      data.events.find((e) => e.id === "e5")!,
      "Group 2",
    );
    expect(r.message).toContain("Seluruh 2 Siswa Hadir Lengkap");
    expect(r.message).toContain("(100% Kehadiran)");
  });
  it("counts all exception types and does not modify source data during aggregation", () => {
    let data = fixture();
    data = recordAttendance(data, "pengasuh", "e5", [
      { personId: "me", status: "Hadir", reason: "" },
      { personId: "s2", status: "Sakit", reason: "Demam" },
      { personId: "s3", status: "Izin", reason: "Keluarga" },
      { personId: "s6", status: "Dinas Dalam", reason: "Penugasan" },
    ]);
    const before = JSON.stringify(data);
    const r = buildAttendanceReport(
      data,
      "pengasuh",
      data.events.find((e) => e.id === "e5")!,
      "Group 1",
    );
    expect(r.stats).toMatchObject({
      hadir: 1,
      sakit: 1,
      izin: 1,
      dinas: 1,
      pending: 0,
      total: 4,
      percentage: 25,
    });
    expect(JSON.stringify(data)).toBe(before);
  });
  it("labels scoped element reports and prevents regular users accessing member reports", () => {
    const data = recordAttendance(
      fixture(),
      "danelemen",
      "e5",
      rows(["me", "s2", "s6"]),
    );
    const event = data.events.find((e) => e.id === "e5")!;
    const r = buildAttendanceReport(
      data,
      "danelemen",
      event,
      currentPerson.group,
    );
    expect(r.message).toContain("PORTAL GRUP 1 | ELEMEN A |");
    expect(r.stats.total).toBe(3);
    expect(() =>
      buildAttendanceReport(data, "serdik", event, "Group 1"),
    ).toThrow("tidak memiliki akses");
    expect(
      buildAttendanceReport(data, "dangroup", event, "Group 2").stats.total,
    ).toBe(0);
  });
  it("encodes WhatsApp text and supports manual recipient selection", () => {
    const text = "*Hello*\n📅 12 Oktober & teman";
    const url = new URL(whatsappLink(text, "+62 812-3456-7890"));
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/6281234567890");
    expect(url.searchParams.get("text")).toBe(text);
    expect(whatsappLink(text)).toMatch(/^https:\/\/wa.me\/\?text=/);
    expect(() => whatsappLink(text, "081234567890")).toThrow("kode negara");
    expect(() => whatsappLink(text, "javascript:alert(1)")).toThrow();
  });
});
describe("Actionable home", () => {
  it("gives recorders scoped recording actions and Ops a read-only monitoring action", () => {
    const data = fixture();
    expect(
      homeActions(data, "dangroup").find((a) => a.id === "attendance")?.title,
    ).toBe("Catat presensi kegiatan");
    expect(
      homeActions(data, "ops-head").find((a) => a.id === "attendance")?.title,
    ).toBe("Pantau presensi kegiatan");
    expect(
      homeActions(data, "serdik").find((a) => a.id === "attendance")?.title,
    ).toBe("Lihat status presensi saya");
    expect(
      homeActions(data, "serdik").some((a) => /Catat presensi/.test(a.title)),
    ).toBe(false);
  });
  it("provides permission/project actions for pengasuh and aspiration actions for LMS", () => {
    const data = fixture();
    expect(homeActions(data, "pengasuh").map((a) => a.id)).toContain("leave");
    expect(homeActions(data, "pengasuh").map((a) => a.id)).toContain("project");
    expect(homeActions(data, "lms").map((a) => a.id)).toContain("aspiration");
  });
  it("does not ask local officials to edit documentation on global activities", () => {
    expect(homeActions(fixture(), "dangroup").map((a) => a.id)).not.toContain(
      "documentation",
    );
  });
  it("uses shared activity links and skips archived records", () => {
    const data = fixture();
    data.events[0].archived = true;
    expect(
      homeActions(data, "danbatch").find((a) => a.id === "attendance")?.href,
    ).toBe(activityHref("attendance", "e5"));
    expect(activityHref("schedule", "a&b")).toBe(
      "#/app/schedule?activity=a%26b",
    );
  });
});
