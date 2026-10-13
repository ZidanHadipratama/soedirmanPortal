// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendancePage from "./AttendancePage";
import App from "./App";
import { SchedulePage } from "./workflows";
import { createSeed, type Role, type Store } from "./model";
import { STORAGE_KEY } from "./store";

function seed() {
  const data = createSeed();
  data.attendance = [];
  return data;
}
function Harness({ role, initial = seed() }: { role: Role; initial?: Store }) {
  const [data, setData] = useState(initial);
  return (
    <AttendancePage
      key={role}
      role={role}
      data={data}
      setData={setData}
      notify={() => {}}
    />
  );
}
beforeEach(() => {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  localStorage.clear();
  window.history.replaceState({}, "", "#/app/attendance?activity=e5");
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Attendance interface acceptance", () => {
  it("shows serdik read-only personal attendance without recording or member-report controls", () => {
    render(<Harness role="serdik" />);
    expect(screen.queryByRole("button", { name: "Catat presensi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Absen sekarang" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Laporan WhatsApp" }),
    ).toBeNull();
    expect(screen.getByText("Arif Pratama")).toBeTruthy();
    expect(screen.queryByText("Nadia Putri")).toBeNull();
  });
  it("lets DanElemen record only its element and produces a scoped report", async () => {
    const user = userEvent.setup();
    render(<Harness role="danelemen" />);
    await user.click(screen.getByRole("button", { name: "Catat presensi" }));
    expect(screen.queryByLabelText("Status Rizky Aditya")).toBeNull();
    expect(
      (screen.getByLabelText("Elemen") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Laporan WhatsApp",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Tandai semua hadir" }),
    );
    await user.click(within(screen.getByRole("radiogroup", { name: "Status Nadia Putri" })).getByRole("radio", { name: "Sakit" }));
    await user.type(screen.getByLabelText("Keterangan untuk Nadia Putri"), "Demam");
    await user.click(screen.getByRole("button", { name: "Gunakan keterangan" }));
    await user.click(screen.getByRole("button", { name: "Simpan pencatatan" }));
    await user.click(screen.getByRole("button", { name: "Laporan WhatsApp" }));
    const preview = screen.getByLabelText(
      "Pratinjau laporan",
    ) as HTMLTextAreaElement;
    expect(preview.value).toContain("PORTAL GRUP 1 | ELEMEN A");
    expect(preview.value).toContain("(3 SISWA)");
    expect(preview.value).toContain("66,7% Kehadiran");
    expect(preview.value).toContain("Nadia Putri");
    expect(preview.value).not.toContain("✅ *NIHIL*");
    expect(
      screen.getByRole("link", { name: "Buka WhatsApp" }).getAttribute("href"),
    ).toMatch(/^https:\/\/wa.me\/\?text=/);
  });
  it("blocks official WhatsApp reporting until the selected group is fully recorded", async () => {
    const user = userEvent.setup();
    render(<Harness role="pengasuh" />);
    await user.selectOptions(screen.getByLabelText("Group"), "Group 2");
    await user.click(screen.getByRole("button", { name: "Laporan WhatsApp" }));
    expect(
      (screen.getByLabelText("Pratinjau laporan") as HTMLTextAreaElement).value,
    ).toContain("DRAF LAPORAN");
    expect(
      (
        screen.getByRole("button", {
          name: "Buka WhatsApp",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Tutup" }));
    await user.click(screen.getByRole("button", { name: "Catat presensi" }));
    await user.click(
      screen.getByRole("button", { name: "Tandai semua hadir" }),
    );
    await user.click(screen.getByRole("button", { name: "Simpan pencatatan" }));
    await user.click(screen.getByRole("button", { name: "Laporan WhatsApp" }));
    await user.type(
      screen.getByLabelText("Nomor WhatsApp (opsional)"),
      "+62 812-3456-7890",
    );
    const url = new URL(
      screen.getByRole("link", { name: "Buka WhatsApp" }).getAttribute("href")!,
    );
    expect(url.pathname).toBe("/6281234567890");
    expect(url.searchParams.get("text")).toContain(
      "Seluruh 2 Siswa Hadir Lengkap",
    );
  });
  it("applies approved leave suggestions only when a recorder chooses them", async () => {
    const initial = seed();
    initial.leaves[0].status = "Diizinkan";
    const user = userEvent.setup();
    render(<Harness role="pengasuh" initial={initial} />);
    await user.selectOptions(screen.getByLabelText("Group"), "Group 2");
    await user.click(screen.getByRole("button", { name: "Catat presensi" }));
    expect(within(screen.getByRole("radiogroup", { name: "Status Alya Rahma" })).queryAllByRole("radio", { checked: true })).toHaveLength(0);
    await user.click(
      screen.getByRole("button", { name: "Tandai semua hadir" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Terapkan izin disetujui" }),
    );
    expect(
      within(screen.getByRole("radiogroup", { name: "Status Alya Rahma" })).getByRole("radio", { name: "Izin" }).getAttribute("aria-checked"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Simpan pencatatan" }));
    await user.click(screen.getByRole("button", { name: "Laporan WhatsApp" }));
    const message = (
      screen.getByLabelText("Pratinjau laporan") as HTMLTextAreaElement
    ).value;
    expect(message).toContain(initial.leaves[0].reason);
    expect(message).not.toContain("✅ *NIHIL*");
  });
  it("retains the draft and lists the member in a red popup when a reason is missing", async () => {
    const user = userEvent.setup();
    render(<Harness role="dangroup" />);
    await user.click(screen.getByRole("button", { name: "Catat presensi" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Status Arif Pratama" })).getByRole("radio", { name: "Sakit" }));
    await user.click(within(screen.getByRole("dialog", { name: "Keterangan wajib diisi" })).getByRole("button", { name: "Tutup" }));
    await user.click(screen.getByRole("button", { name: "Simpan pencatatan" }));
    const error = screen.getByRole("alert");
    expect(error.textContent).toContain("keterangan");
    expect(screen.getByRole("dialog", { name: "Pencatatan perlu diperiksa" }).classList.contains("modal-danger")).toBe(true);
    expect(within(screen.getByRole("dialog", { name: "Pencatatan perlu diperiksa" })).getByRole("listitem").textContent).toBe("Arif Pratama");
    expect(
      within(screen.getByRole("radiogroup", { name: "Status Arif Pratama" })).getByRole("radio", { name: "Sakit" }).getAttribute("aria-checked"),
    ).toBe("true");
  });
  it("connects an activity detail to the exact attendance session", () => {
    window.history.replaceState({}, "", "#/app/schedule?activity=e5");
    const data = seed();
    render(
      <SchedulePage
        data={data}
        setData={() => {}}
        role="serdik"
        notify={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog)
        .getByRole("link", { name: "Lihat presensi kegiatan" })
        .getAttribute("href"),
    ).toBe("#/app/attendance?activity=e5");
    expect(
      within(dialog).getByText(
        "Pakaian / perlengkapan: Sesuai arahan apel malam",
      ),
    ).toBeTruthy();
  });
  it("prevents changing the identity of an activity that already has attendance", async () => {
    window.history.replaceState({}, "", "#/app/schedule?activity=e1");
    const setData = vi.fn();
    const user = userEvent.setup();
    render(
      <SchedulePage
        data={createSeed()}
        setData={setData}
        role="ops"
        notify={() => {}}
      />,
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ubah jadwal",
      }),
    );
    await user.clear(screen.getByLabelText("Nama kegiatan"));
    await user.type(screen.getByLabelText("Nama kegiatan"), "Kegiatan berbeda");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Simpan",
      }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Kegiatan sudah memiliki presensi",
    );
    expect(setData).not.toHaveBeenCalled();
  });
  it("navigates from role-specific home actions to attendance and back to shared activity context", async () => {
    window.history.replaceState({}, "", "#/home");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed()));
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Peran aktif"), "dangroup");
    await user.click(
      screen.getByRole("link", { name: /Catat presensi kegiatan/ }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Presensi kegiatan" }),
      ).toBeTruthy(),
    );
    expect(
      (screen.getByLabelText("Kegiatan / sesi") as HTMLSelectElement).value,
    ).toBe("e1");
    await user.click(screen.getByRole("link", { name: "Lihat kegiatan" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      within(screen.getByRole("dialog")).getByText(
        "Pakaian / perlengkapan: Sesuai arahan apel pagi",
      ),
    ).toBeTruthy();
  });
});
