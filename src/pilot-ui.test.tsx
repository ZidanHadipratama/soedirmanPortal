// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PilotAttendance from "./PilotAttendance";
import type { PilotSnapshot } from "./pilot-model";
let realtime: () => void;
vi.mock("@supabase/supabase-js", () => ({ createClient: () => {
  const channel = { on: (_type: string, _filter: unknown, callback: () => void) => { realtime = callback; return channel; }, subscribe: (callback: (status: string) => void) => { callback("SUBSCRIBED"); return channel; } };
  return { channel: () => channel, removeChannel: vi.fn(), realtime: { setAuth: vi.fn(async () => {}) } };
} }));
let snapshot: PilotSnapshot;
let posted: unknown;
let failure = false;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  snapshot = {
    profile: { user_id: "u", unit: "group-2-element-1", role: "danelemen", group_number: 2, element_number: 1, display_name: "DanElemen Satu", participant_number: 1 },
    members: Array.from({ length: 30 }, (_, n) => ({ participant_number: n+1, full_name: `Anggota ${n+1}`, group_number: 2, element_number: 1 })),
    sessions: [{ id: "session", group_number: 2, date: "2026-10-13", kind: "pagi", label: "", time: "06:00:00" }], records: [], commander: "DanGrup Dua",
  };
  posted = undefined; failure = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      posted = JSON.parse(init.body as string);
      return { ok: !failure, json: async () => failure ? { error: "Gagal menyimpan" } : { session_id: "session" } };
    }
    return { ok: true, json: async () => url.includes("/session") ? { profile: snapshot.profile, token: "test-token", config: { url: "https://example.supabase.co", key: "test-public" } } : structuredClone(snapshot) };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function beginRecording() {
  await screen.findByRole("radiogroup", { name: "Status Anggota 1" });
}
const radio = (member: string, status: string) => within(screen.getByRole("radiogroup", { name: `Status ${member}` })).getByRole("radio", { name: status });
describe("Pilot attendance user flow", () => {
  it("saves exactly the element roster only after an explicit save", async () => {
    render(<PilotAttendance />);
    await beginRecording();
    fireEvent.click(screen.getByRole("button", { name: "Tandai sisanya hadir (30)" }));
    expect(posted).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Simpan (30/30)" }));
    await screen.findByText("Pencatatan tersimpan. DanGrup dapat melihat hasilnya.");
    expect((posted as { entries: unknown[] }).entries).toHaveLength(30);
  });
  it("preserves an unsaved draft when realtime data arrives and warns about the conflict", async () => {
    render(<PilotAttendance />);
    await beginRecording();
    fireEvent.click(radio("Anggota 1", "Sakit"));
    snapshot.records = [{ session_id: "session", participant_number: 1, status: "Hadir", reason: "", revision: 1, recorded_by: "u", recorded_at: "" }];
    realtime();
    await screen.findByText("Data elemen ini berubah di perangkat lain. Batalkan perubahan untuk memuat data terbaru.");
    expect(radio("Anggota 1", "Sakit").getAttribute("aria-checked")).toBe("true");
    expect(posted).toBeUndefined();
  });
  it("keeps a failed save editable and shows the error inline", async () => {
    failure = true; render(<PilotAttendance />);
    await beginRecording();
    fireEvent.click(screen.getByRole("button", { name: "Tandai sisanya hadir (30)" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan (30/30)" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Gagal menyimpan");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Pencatatan tersimpan. DanGrup dapat melihat hasilnya.")).toBeNull();
    expect(screen.getByLabelText("Status Anggota 1")).toBeDefined();
  });
  it("gives DanGrup element cards first and a read-only roster per element", async () => {
    snapshot.profile = { ...snapshot.profile, unit: "group-2", role: "dangroup", element_number: null };
    render(<PilotAttendance />);
    await screen.findByText("Pantau kekuatan Grup 2");
    const card = await screen.findByRole("button", { name: /Elemen 1/ });
    expect(screen.queryByText("Anggota 1")).toBeNull();
    fireEvent.click(card);
    expect(await screen.findByText("Anggota 1")).toBeDefined();
    expect(screen.queryByRole("radiogroup", { name: "Status Anggota 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Simpan/ })).toBeNull();
  });
  it("offers five full-label status buttons, sends null for untouched members and saves Dinas Dalam", async () => {
    render(<PilotAttendance />); await beginRecording();
    const statuses = within(screen.getByRole("radiogroup", { name: "Status Anggota 1" }));
    expect(statuses.getAllByRole("radio").map(r => r.textContent)).toEqual(["Hadir", "Sakit", "Izin", "Dinas Dalam", "Tidak Hadir"]);
    expect(statuses.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    fireEvent.click(statuses.getByRole("radio", { name: "Dinas Dalam" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const reason = screen.getByLabelText("Keterangan Anggota 1");
    await waitFor(() => expect(document.activeElement).toBe(reason));
    fireEvent.change(reason, { target: { value: "Penugasan internal" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan (1/30)" }));
    await screen.findByText("Pencatatan tersimpan. DanGrup dapat melihat hasilnya.");
    expect((posted as { entries: unknown[] }).entries[0]).toMatchObject({ status: "Dinas Dalam", reason: "Penugasan internal" });
    expect((posted as { entries: unknown[] }).entries[1]).toMatchObject({ status: null, reason: "" });
  });
  it("blocks saving and marks every member missing a reason inline", async () => {
    render(<PilotAttendance />); await beginRecording();
    fireEvent.click(radio("Anggota 1", "Sakit"));
    fireEvent.click(radio("Anggota 2", "Izin"));
    fireEvent.click(screen.getByRole("button", { name: "Simpan · 2 keterangan kosong" }));
    expect(screen.getAllByRole("alert").map(a => a.textContent)).toEqual(["Keterangan untuk Anggota 1 wajib diisi.", "Keterangan untuk Anggota 2 wajib diisi."]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Keterangan Anggota 1")));
    expect(screen.queryByRole("dialog")).toBeNull(); expect(posted).toBeUndefined();
  });
  it("marks only pending members present and keeps existing statuses", async () => {
    render(<PilotAttendance />); await beginRecording();
    fireEvent.click(radio("Anggota 1", "Sakit"));
    fireEvent.change(screen.getByLabelText("Keterangan Anggota 1"), { target: { value: "Demam" } });
    fireEvent.click(screen.getByRole("button", { name: "Tandai sisanya hadir (29)" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan (30/30)" }));
    await screen.findByText("Pencatatan tersimpan. DanGrup dapat melihat hasilnya.");
    const entries = (posted as { entries: { status: string; reason: string }[] }).entries;
    expect(entries[0]).toMatchObject({ status: "Sakit", reason: "Demam" });
    expect(entries.slice(1).every(e => e.status === "Hadir")).toBe(true);
  });
  it("does not steal focus while arrowing through statuses", async () => {
    render(<PilotAttendance />); await beginRecording();
    const hadir = radio("Anggota 1", "Hadir");
    hadir.focus();
    fireEvent.keyDown(hadir, { key: "ArrowRight" });
    expect(screen.getByLabelText("Keterangan Anggota 1")).toBeDefined();
    expect(document.activeElement).toBe(radio("Anggota 1", "Sakit"));
  });
  it("filters the roster to pending members", async () => {
    render(<PilotAttendance />); await beginRecording();
    fireEvent.click(radio("Anggota 1", "Hadir"));
    fireEvent.click(screen.getByRole("button", { name: "Belum 29" }));
    expect(screen.queryByText("Anggota 1")).toBeNull();
    expect(screen.getByText("Anggota 2")).toBeDefined();
  });
  it("shows PIN login errors inline without a popup", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: "PIN tidak sesuai." }) })));
    render(<PilotAttendance />);
    fireEvent.change(await screen.findByLabelText("PIN akses"), { target: { value: "11111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toContain("PIN tidak sesuai.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers the report after saving but blocks WhatsApp for an incomplete session", async () => {
    snapshot.records = [{ session_id: "session", participant_number: 1, status: "Hadir", reason: "", revision: 1, recorded_by: "u", recorded_at: "" }];
    render(<PilotAttendance />);
    fireEvent.click(await screen.findByRole("button", { name: "✓ Tersimpan · Buat laporan WA" }));
    expect(screen.queryByRole("link", { name: "Buka WhatsApp" })).toBeNull();
    expect(screen.getByLabelText("Isi laporan").textContent).toContain("DRAF LAPORAN");
  });
});
