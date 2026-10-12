import { describe, expect, it } from "vitest";
import {
  can,
  canManageEvent,
  createSeed,
  currentPerson,
  inScope,
  localDate,
  people,
  policies,
  safeUrl,
  visibleEvent,
  type Role,
} from "./model";

describe("Role permissions", () => {
  it("keeps regular serdik management private", () => {
    expect(policies.serdik.capabilities).toEqual([]);
    expect(people.filter((p) => inScope("serdik", p))).toEqual([currentPerson]);
  });
  it.each(["danbatch", "wadanbatch"] as Role[])(
    "%s can record batch attendance but cannot approve leave",
    (role) => {
      expect(can(role, "attendance.view")).toBe(true);
      expect(can(role, "leave.view")).toBe(true);
      expect(can(role, "leave.manage")).toBe(false);
      expect(can(role, "attendance.manage")).toBe(true);
      expect(people.filter((p) => inScope(role, p))).toHaveLength(6);
    },
  );
  it("limits DanGroup to members of the same group", () => {
    expect(
      people.filter((p) => inScope("dangroup", p)).map((p) => p.id),
    ).toEqual(["me", "s2", "s3", "s6"]);
    expect(inScope("dangroup", people[3])).toBe(false);
  });
  it("limits DanElemen to the same element", () => {
    expect(
      people.filter((p) => inScope("danelemen", p)).map((p) => p.id),
    ).toEqual(["me", "s2", "s6"]);
    expect(inScope("danelemen", people[2])).toBe(false);
  });
  it("grants global attendance only to authorized Ops roles", () => {
    expect(can("ops", "attendance.view")).toBe(false);
    expect(can("ops-head", "attendance.view")).toBe(true);
    expect(can("ops-head", "attendance.manage")).toBe(false);
    expect(can("ops", "schedule.manage")).toBe(true);
    expect(can("ops", "learning.manage")).toBe(true);
  });
  it("gives LMS aspiration management without attendance or leave approvals", () => {
    expect(can("lms", "aspiration.manage")).toBe(true);
    expect(can("lms", "aspiration.view")).toBe(true);
    expect(can("lms", "attendance.view")).toBe(false);
    expect(can("lms", "leave.manage")).toBe(false);
  });
  it("gives Polisi Serdik global attendance and leave management", () => {
    expect(can("polserdik", "attendance.manage")).toBe(true);
    expect(can("polserdik", "leave.manage")).toBe(true);
    expect(can("polserdik", "aspiration.manage")).toBe(false);
    expect(can("polserdik", "learning.manage")).toBe(false);
  });
  it("allows pengasuh to supervise projects and approve leave while LMS owns aspiration responses", () => {
    expect(can("pengasuh", "project.supervise")).toBe(true);
    expect(can("pengasuh", "leave.manage")).toBe(true);
    expect(can("pengasuh", "good.view")).toBe(true);
    expect(can("pengasuh", "aspiration.view")).toBe(true);
    expect(can("pengasuh", "aspiration.manage")).toBe(false);
  });
});
describe("Event audience and safe links", () => {
  it("shows shared events to everyone, hides other groups from serdik and local officials", () => {
    const events = createSeed().events;
    expect(visibleEvent("serdik", events[0])).toBe(true);
    expect(visibleEvent("serdik", events[3])).toBe(false);
    expect(visibleEvent("dangroup", events[3])).toBe(false);
    expect(visibleEvent("pengasuh", events[3])).toBe(true);
  });
  it("lets DanGroup see its elements while regular serdik only sees its own", () => {
    const event = {
      ...createSeed().events[0],
      group: "Group 1",
      element: "Elemen B",
    };
    expect(visibleEvent("dangroup", event)).toBe(true);
    expect(visibleEvent("serdik", event)).toBe(false);
    expect(visibleEvent("danelemen", event)).toBe(false);
  });
  it("lets Ops manage global schedules without exposing global attendance", () => {
    const event = createSeed().events[3];
    expect(visibleEvent("ops", event)).toBe(true);
    expect(canManageEvent("ops", event)).toBe(true);
    expect(can("ops", "attendance.view")).toBe(false);
  });
  it("prevents local officials editing shared global event documentation", () => {
    const event = createSeed().events[0];
    expect(canManageEvent("dangroup", event)).toBe(false);
    expect(canManageEvent("danelemen", event)).toBe(false);
    expect(canManageEvent("pengasuh", event)).toBe(true);
    expect(canManageEvent("dangroup", { ...event, group: "Group 1" })).toBe(
      true,
    );
    expect(
      canManageEvent("danelemen", {
        ...event,
        group: "Group 1",
        element: "Elemen A",
      }),
    ).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "not a url",
    "",
  ])("rejects unsafe or invalid link %s", (url) =>
    expect(safeUrl(url)).toBe(false),
  );
  it.each(["https://example.com/resource", "http://localhost:3000/docs"])(
    "accepts web link %s",
    (url) => expect(safeUrl(url)).toBe(true),
  );
  it("seeds independent stores with a local calendar date", () => {
    const a = createSeed();
    const b = createSeed();
    a.projects[0].members.push("new");
    expect(b.projects[0].members).not.toContain("new");
    expect(a.events[0].date).toBe(localDate());
    expect(localDate(new Date(2026, 9, 12))).toBe("2026-10-12");
  });
});
