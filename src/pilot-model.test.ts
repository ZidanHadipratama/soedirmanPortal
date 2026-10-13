import { describe, expect, it } from "vitest";
import { pilotDraftCounts, pilotProgress, pilotReport, pilotSessionName, shiftDate, type PilotSnapshot } from "./pilot-model";
const session = { id: "morning", group_number: 2, date: "2026-10-13", kind: "pagi" as const, label: "", time: "06:00:00" };
const snapshot: PilotSnapshot = {
  profile: { user_id: "u", unit: "group-2", role: "dangroup", group_number: 2, element_number: null, display_name: "Komandan Grup", participant_number: 1 },
  members: Array.from({ length: 90 }, (_, i) => ({ participant_number: i + 1, full_name: `Anggota ${i+1}`, group_number: 2, element_number: Math.floor(i/30)+1 })),
  sessions: [session], records: [], commander: "Komandan Grup",
};
describe("Live roster WhatsApp report", () => {
  it("treats a persisted null as pending instead of an absence", () => {
    const report = pilotReport({ ...snapshot, records: snapshot.members.map(m => ({ session_id: session.id, participant_number: m.participant_number, status: m.participant_number === 1 ? null : "Hadir", reason: "", recorded_by: "u", recorded_at: "", revision: 1 })) }, session);
    expect(report.stats.pending).toBe(1); expect(report.stats.hadir).toBe(89); expect(report.stats.complete).toBe(false);
    expect(report.message).toContain("Belum dicatat: Anggota 1.");
    expect(report.message).not.toContain("— null");
  });
  it("reports actual group strength and incomplete records without claiming NIHIL", () => {
    const report = pilotReport(snapshot, session);
    expect(report.stats.total).toBe(90); expect(report.stats.pending).toBe(90);
    expect(report.message).toContain("DRAF LAPORAN"); expect(report.message).toContain("Belum dapat dinyatakan NIHIL");
  });
  it("reports 30 members for an element and ignores records in another session", () => {
    const report = pilotReport({ ...snapshot, records: snapshot.members.map(m => ({ session_id: "night", participant_number: m.participant_number, status: "Hadir", reason: "", recorded_by: "u", recorded_at: "", revision: 1 })) }, session, 2);
    expect(report.stats.total).toBe(30); expect(report.stats.pending).toBe(30); expect(report.message).toContain("ELEMEN 2");
  });
  it("reuses the established complete WA template and commander identity", () => {
    const report = pilotReport({ ...snapshot, records: snapshot.members.map(m => ({ session_id: session.id, participant_number: m.participant_number, status: "Hadir", reason: "", recorded_by: "u", recorded_at: "", revision: 1 })) }, session);
    expect(report.stats.complete).toBe(true); expect(report.stats.hadir).toBe(90);
    expect(report.message).toContain("LAPORAN RESMI"); expect(report.message).toContain("NIHIL"); expect(report.message).toContain("Komandan Grup");
  });
});
describe("Pilot progress helpers", () => {
  it("counts only non-null records of the session per element", () => {
    const records = [
      { session_id: session.id, participant_number: 1, status: "Hadir" as const, reason: "", recorded_by: "u", recorded_at: "", revision: 1 },
      { session_id: session.id, participant_number: 2, status: null, reason: "", recorded_by: "u", recorded_at: "", revision: 1 },
      { session_id: "night", participant_number: 31, status: "Hadir" as const, reason: "", recorded_by: "u", recorded_at: "", revision: 1 },
    ];
    expect(pilotProgress({ ...snapshot, records }, session.id)).toEqual([
      { element: 1, total: 30, recorded: 1, hadir: 1, away: 0, lastAt: "" }, { element: 2, total: 30, recorded: 0, hadir: 0, away: 0, lastAt: "" }, { element: 3, total: 30, recorded: 0, hadir: 0, away: 0, lastAt: "" },
    ]);
  });
  it("splits draft counts into present, away and pending", () => {
    expect(pilotDraftCounts([{ status: "Hadir" }, { status: "Sakit" }, { status: null }, { status: "Hadir" }])).toEqual({ hadir: 2, away: 1, pending: 1, total: 4 });
  });
  it("steps dates across month boundaries", () => {
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("names sessions for display", () => {
    expect(pilotSessionName(session)).toBe("Apel pagi");
    expect(pilotSessionName({ kind: "insidental", label: "senam" })).toBe("senam");
  });
});
