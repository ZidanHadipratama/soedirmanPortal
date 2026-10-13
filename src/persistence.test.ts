import { describe, expect, it, vi, afterEach } from "vitest";
import { createSeed } from "./model";
import { migrateStore } from "./persistence";
import { readStore, STORAGE_KEY, LEGACY_STORAGE_KEY } from "./store";

function legacy() {
  const seed = createSeed();
  const { reporting: _reporting, ...rest } = seed;
  return {
    ...rest,
    version: 1,
    attendance: [
      {
        id: "old",
        personId: "me",
        date: "2026-10-01",
        time: "06:45",
        status: "Hadir",
      },
      {
        id: "old2",
        personId: "s2",
        date: "2026-10-01",
        time: "—",
        status: "Belum hadir",
      },
    ],
    events: seed.events
      .filter((e) => e.id !== "e5")
      .map(
        ({
          outfit: _outfit,
          description: _description,
          attendanceRequired: _required,
          ...e
        }) => e,
      ),
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("Reversible storage migration", () => {
  it("maps the old unrecorded placeholder to null", () => {
    const original = { ...createSeed(), attendance: [{ id: "pending", personId: "me", eventId: "e1", date: "2026-10-13", time: "06:00", status: "Belum dicatat", reason: "", recordedBy: "Komandan", recordedAt: "2026-10-13T00:00:00Z" }] };
    expect(migrateStore(original).attendance[0]).toEqual({ ...original.attendance[0], status: null });
    expect(original.attendance[0].status).toBe("Belum dicatat");
  });
  it("renames legacy Dinas Luar without changing attribution or the source data", () => {
    const original = { ...createSeed(), attendance: [{ id: "old-duty", personId: "me", eventId: "e1", date: "2026-10-13", time: "06:00", status: "Dinas Luar", reason: "Penugasan", recordedBy: "Komandan", recordedAt: "2026-10-13T00:00:00Z" }] };
    const migrated = migrateStore(original);
    expect(migrated.attendance[0]).toEqual({ ...original.attendance[0], status: "Dinas Dalam" });
    expect(original.attendance[0].status).toBe("Dinas Luar");
    expect(migrateStore(migrated)).toEqual(migrated);
  });
  it("preserves old attendance as archive rather than guessing an apel session", () => {
    const original = legacy();
    const before = JSON.stringify(original);
    const migrated = migrateStore(original);
    expect(migrated.version).toBe(2);
    expect(migrated.attendance[0]).toMatchObject({
      id: "old",
      eventId: "legacy-daily-2026-10-01",
      date: "2026-10-01",
      time: "06:45",
      status: "Hadir",
    });
    expect(migrated.attendance[1].status).toBeNull();
    expect(
      migrated.events.find((e) => e.id === "legacy-daily-2026-10-01")?.archived,
    ).toBe(true);
    expect(migrated.attendance.some((a) => a.eventId === "e1")).toBe(false);
    expect(JSON.stringify(original)).toBe(before);
  });
  it("retains unrelated feature data and makes migration idempotent", () => {
    const original = legacy();
    const migrated = migrateStore(original);
    for (const key of [
      "posts",
      "leaves",
      "projects",
      "goodNotes",
      "resources",
      "favorites",
      "bookmarks",
      "aspirations",
    ] as const)
      expect(migrated[key]).toEqual(original[key]);
    expect(migrateStore(migrated)).toEqual(migrated);
    expect(
      migrated.events.filter((e) =>
        e.title.toLowerCase().includes("apel malam"),
      ),
    ).toHaveLength(1);
  });
  it("reads v1 without modifying or deleting its backup key", () => {
    const getItem = vi.fn((key: string) =>
      key === LEGACY_STORAGE_KEY ? JSON.stringify(legacy()) : null,
    );
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });
    expect(readStore().version).toBe(2);
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });
  it("prefers valid v2 data and recovers from invalid v2 using the retained v1 key", () => {
    const seed = createSeed();
    seed.favorites = ["projects"];
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === STORAGE_KEY ? JSON.stringify(seed) : JSON.stringify(legacy()),
    });
    expect(readStore().favorites).toEqual(["projects"]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === STORAGE_KEY ? "{bad JSON" : JSON.stringify(legacy()),
    });
    expect(readStore().attendance[0].eventId).toContain("legacy-daily");
  });
  it("rejects unrecognized data structures", () => {
    expect(() => migrateStore({ version: 3 })).toThrow();
    expect(() => migrateStore({ ...createSeed(), events: null })).toThrow();
  });
});
