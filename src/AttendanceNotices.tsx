import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { Field, Modal } from "./ui";
import type { Attendance } from "./model";

export function requiresAttendanceReason(status: Attendance["status"]) {
  return status !== null && status !== "Hadir";
}
export function AttendanceErrorPopup({ message, members = [], onClose }: {
  message: string; members?: string[]; onClose: () => void;
}) {
  return <Modal title="Pencatatan perlu diperiksa" tone="danger" onClose={onClose}>
    <div className="attendance-popup-alert" role="alert"><CircleAlert size={22} aria-hidden="true" /><p>{message}</p></div>
    {members.length > 0 && <div className="attendance-missing-reasons"><strong>Anggota yang belum diberikan keterangan:</strong><ul>{members.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul></div>}
    <button className="button primary" onClick={onClose}>Mengerti</button>
  </Modal>;
}
export function AttendanceReasonPopup({ name, status, value, onChange, onClose, maxLength = 1000 }: {
  name: string; status: Attendance["status"]; value: string;
  onChange: (value: string) => void; onClose: () => void; maxLength?: number;
}) {
  const [validation, setValidation] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) { setValidation(`Keterangan untuk ${name} wajib diisi.`); return; }
    onChange(value.trim()); onClose();
  }
  return <Modal title="Keterangan wajib diisi" tone="danger" onClose={onClose}>
    <div className="attendance-popup-alert" role="alert"><CircleAlert size={22} aria-hidden="true" /><p>Isi keterangan untuk <strong>{name}</strong> yang berstatus <strong>{status}</strong>.</p></div>
    <form onSubmit={submit} noValidate>
      <Field label={`Keterangan untuk ${name}`}><textarea autoFocus rows={3} value={value} maxLength={maxLength} onChange={event => { onChange(event.target.value); setValidation(""); }} placeholder="Tuliskan alasan atau penugasan anggota" /></Field>
      {validation && <p className="attendance-popup-validation" role="alert">{validation}</p>}
      <button className="button primary">Gunakan keterangan</button>
    </form>
  </Modal>;
}
