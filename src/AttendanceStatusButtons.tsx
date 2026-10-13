import { Check } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { Attendance } from "./model";
import { attendanceStatuses } from "./operations";

const statusColor = { Hadir: "present", Sakit: "sick", Izin: "permission", "Dinas Dalam": "duty", "Tidak Hadir": "absent" };
const statusShort = { Hadir: "H", Sakit: "S", Izin: "I", "Dinas Dalam": "DD", "Tidak Hadir": "TH" };
export function attendanceStatusTone(status: Attendance["status"]) {
  return status === null ? "" : `status-${statusColor[status]}`;
}

export default function AttendanceStatusButtons({ name, value, onChange, disabled = false, compact = false }: {
  name: string;
  value: Attendance["status"];
  onChange: (status: Attendance["status"], via: "pointer" | "keyboard") => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % attendanceStatuses.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + attendanceStatuses.length - 1) % attendanceStatuses.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = attendanceStatuses.length - 1;
    else return;
    event.preventDefault();
    onChange(attendanceStatuses[next], "keyboard");
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <div className={`attendance-status-buttons${compact ? " compact" : ""}`} role="radiogroup" aria-label={`Status ${name}`} aria-orientation="horizontal">
    {attendanceStatuses.map((status, index) => <button
      type="button" key={status} role="radio" aria-checked={value === status}
      tabIndex={value === status || (value === null && index === 0) ? 0 : -1} disabled={disabled}
      className={`attendance-status-button status-${statusColor[status]}${value === status ? " selected" : ""}`}
      onClick={() => onChange(status, "pointer")} onKeyDown={event => navigate(event, index)}
      {...(compact ? { "aria-label": status, title: status } : {})}
    >{compact ? statusShort[status] : <>{value === status && <Check size={15} aria-hidden="true" />}{status}</>}</button>)}
  </div>;
}
