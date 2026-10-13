import type { Attendance, Event, Person, Store } from "./model";
import { defaultReporting } from "./model";
import { buildRosterAttendanceReport } from "./operations";

export const pilotUnits = ["group-2", "group-2-element-1", "group-2-element-2", "group-2-element-3"] as const;
export type PilotUnit = typeof pilotUnits[number];
export type PilotProfile = { user_id: string; unit: PilotUnit; role: "dangroup" | "danelemen"; group_number: number; element_number: number | null; display_name: string; participant_number: number };
export type PilotMember = { participant_number: number; full_name: string; group_number: number; element_number: number };
export type PilotSession = { id: string; group_number: number; date: string; kind: "pagi" | "malam" | "insidental"; label: string; time: string };
export type PilotRecord = { session_id: string; participant_number: number; status: Attendance["status"]; reason: string; recorded_by: string; recorded_at: string; revision: number };
export type PilotEntry = { participant_number: number; status: Attendance["status"]; reason: string; revision: number };
export type PilotSnapshot = { profile: PilotProfile; members: PilotMember[]; sessions: PilotSession[]; records: PilotRecord[]; commander: string };

export function pilotReport(snapshot: PilotSnapshot, session: PilotSession, element?: number) {
  const members: Person[] = snapshot.members.filter(m => !element || m.element_number === element).map(m => ({
    id: String(m.participant_number), name: m.full_name, number: String(m.participant_number),
    group: "Group 2", element: `Elemen ${m.element_number}`, position: "Serdik", email: "",
  }));
  const event: Event = { id: session.id, title: session.kind === "insidental" ? session.label : `Apel ${session.kind}`, date: session.date, time: session.time.slice(0, 5), end: "", location: "", category: "Apel", attendees: [], group: "Group 2", element: "Semua elemen", documentation: "", outfit: "", description: "", attendanceRequired: true };
  const reporting = defaultReporting();
  reporting.commanders = { "Group 2": { name: snapshot.commander, phone: "" } };
  const data = { reporting, attendance: snapshot.records.map(r => ({
    id: `${r.session_id}-${r.participant_number}`, personId: String(r.participant_number), eventId: r.session_id,
    date: session.date, time: session.time.slice(0, 5), status: r.status, reason: r.reason,
    recordedBy: r.recorded_by, recordedAt: r.recorded_at,
  })) } as Store;
  return buildRosterAttendanceReport(data, event, "Group 2", members, element ? `Elemen ${element}` : undefined);
}

export function pilotSessionName(session: Pick<PilotSession, "kind" | "label">) {
  return session.kind === "insidental" ? session.label : `Apel ${session.kind}`;
}
export function pilotProgress(snapshot: PilotSnapshot, sessionId?: string) {
  return [1, 2, 3].map(element => {
    const members = new Set(snapshot.members.filter(m => m.element_number === element).map(m => m.participant_number));
    const records = snapshot.records.filter(r => r.session_id === sessionId && r.status !== null && members.has(r.participant_number));
    const hadir = records.filter(r => r.status === "Hadir").length;
    const lastAt = records.reduce((last, r) => r.recorded_at > last ? r.recorded_at : last, "");
    return { element, total: members.size, recorded: records.length, hadir, away: records.length - hadir, lastAt };
  }).filter(p => p.total > 0);
}
export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function pilotDraftCounts(entries: Pick<PilotEntry, "status">[]) {
  const hadir = entries.filter(e => e.status === "Hadir").length;
  const pending = entries.filter(e => e.status === null).length;
  return { hadir, pending, away: entries.length - hadir - pending, total: entries.length };
}
