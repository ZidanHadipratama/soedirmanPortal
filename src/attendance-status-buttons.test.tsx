// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceStatusButtons from "./AttendanceStatusButtons";
import type { Attendance } from "./model";
afterEach(cleanup);
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState<Attendance["status"]>(null);
  return <AttendanceStatusButtons name="Anggota" value={value} onChange={setValue} disabled={disabled} />;
}
describe("Attendance status button interaction", () => {
  it("shows five mutually exclusive selections and no active status before choosing", async () => {
    const user = userEvent.setup(); render(<Harness />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(screen.queryByRole("radio", { name: "Belum dicatat" })).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Dinas Dalam" }));
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Dinas Dalam", checked: true })).toBeDefined();
  });
  it("supports arrow navigation, wraparound and one tab stop", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Hadir" }));
    await user.keyboard("{ArrowRight}"); expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Sakit", checked: true }));
    await user.keyboard("{Home}{ArrowLeft}"); expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Tidak Hadir", checked: true }));
    await user.keyboard("{Home}{End}"); expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Tidak Hadir", checked: true }));
    expect(screen.getAllByRole("radio").filter(r => r.tabIndex === 0)).toHaveLength(1);
  });
  it("disables changes while a save is pending", async () => {
    const user = userEvent.setup(); render(<Harness disabled />);
    await user.click(screen.getByRole("radio", { name: "Dinas Dalam" }));
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
  });
});
