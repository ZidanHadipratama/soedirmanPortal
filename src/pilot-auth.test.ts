import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { pinUnit, sameOrigin } from "./server/pilot";
beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("PIN_GROUP_2", "01234567"); vi.stubEnv("PIN_GROUP_2_ELEMENT_1", "12345678");
  vi.stubEnv("PIN_GROUP_2_ELEMENT_2", "23456789"); vi.stubEnv("PIN_GROUP_2_ELEMENT_3", "34567890");
});
afterEach(() => { vi.unstubAllEnvs(); });
describe("PIN access and request origin", () => {
  it("preserves leading zeroes and associates the PIN with the assigned unit", () => {
    expect(pinUnit("01234567")).toBe("group-2"); expect(pinUnit("23456789")).toBe("group-2-element-2");
    expect(pinUnit("1234567")).toBeUndefined(); expect(pinUnit("87654321")).toBeUndefined();
  });
  it("refuses ambiguous PIN configurations", () => {
    vi.stubEnv("PIN_GROUP_2_ELEMENT_1", "01234567"); expect(() => pinUnit("01234567")).toThrow("Konfigurasi PIN belum siap");
  });
  it("accepts the actual browser host when Next dev uses its bind address", () => {
    expect(() => sameOrigin(new Request("http://0.0.0.0:3001/api/pilot/session", { headers: { host: "localhost:3001", origin: "http://localhost:3001" } }))).not.toThrow();
  });
  it("rejects cross-origin, missing-origin and mismatched-port mutations", () => {
    for (const origin of ["https://attacker.example", "http://localhost:3002", ""]) {
      expect(() => sameOrigin(new Request("http://0.0.0.0:3001/api/pilot/session", { headers: { host: "localhost:3001", origin } }))).toThrow("Permintaan harus berasal");
    }
  });
  it("requires HTTPS for a Vercel public origin", () => {
    vi.stubEnv("VERCEL", "1");
    expect(() => sameOrigin(new Request("http://internal/api", { headers: { host: "portal.example", origin: "https://portal.example" } }))).not.toThrow();
    expect(() => sameOrigin(new Request("http://internal/api", { headers: { host: "portal.example", origin: "http://portal.example" } }))).toThrow();
  });
});
