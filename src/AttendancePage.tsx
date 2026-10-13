import { useState, type FormEvent } from "react";
import {
  Check,
  ClipboardCopy,
  FileText,
  Download,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import {
  can,
  currentPerson,
  formatDate,
  localDate,
  policies,
  visibleEvent,
} from "./model";
import {
  activityHref,
  activityRoster,
  approvedLeaveFor,
  buildAttendanceReport,
  recap,
  recordAttendance,
  whatsappLink,
  type AttendanceEntry,
} from "./operations";
import { Avatar, Badge, Empty, Field, Modal, SectionTitle } from "./ui";
import type { PageProps } from "./workflows";
import AttendanceStatusButtons, { attendanceStatusTone } from "./AttendanceStatusButtons";
import { AttendanceErrorPopup, AttendanceReasonPopup, requiresAttendanceReason } from "./AttendanceNotices";

function requestedActivity() {
  return new URLSearchParams(
    (typeof window !== "undefined" ? window.location.hash : "").split("?")[1],
  ).get("activity");
}
export default function AttendancePage({
  data,
  setData,
  role,
  notify,
}: PageProps) {
  const requested = data.events.find(
    (e) => e.id === requestedActivity() && visibleEvent(role, e),
  );
  const [date, setDate] = useState(requested?.date ?? localDate());
  const [eventId, setEventId] = useState(requested?.id ?? "");
  const [group, setGroup] = useState(currentPerson.group);
  const [element, setElement] = useState(
    policies[role].scope === "element" ? currentPerson.element : "Semua elemen",
  );
  const [draft, setDraft] = useState<AttendanceEntry[] | null>(null);
  const [error, setError] = useState("");
  const [reasonPersonId, setReasonPersonId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const manage = can(role, "attendance.manage");
  const viewMembers = can(role, "attendance.view");
  const events = data.events
    .filter(
      (e) => e.date === date && e.attendanceRequired && visibleEvent(role, e),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const event =
    events.find((e) => e.id === eventId) ??
    events.find((e) => !e.archived) ??
    events[0];
  const groups = event
    ? [...new Set(activityRoster(event, role).map((p) => p.group))]
    : [];
  const activeGroup = groups.includes(group) ? group : groups[0];
  const groupMembers = event ? activityRoster(event, role, activeGroup) : [];
  const elements = [...new Set(groupMembers.map((p) => p.element))];
  const activeElement =
    element !== "Semua elemen" && elements.includes(element)
      ? element
      : undefined;
  const members = event
    ? activityRoster(event, role, activeGroup, activeElement)
    : [];
  const reasonPerson = members.find(p => p.id === reasonPersonId);
  const reasonEntry = draft?.find(r => r.personId === reasonPersonId);
  const missingNames = (draft || []).filter(r => requiresAttendanceReason(r.status) && !r.reason.trim()).map(r => members.find(p => p.id === r.personId)?.name || r.personId);
  const stats = event ? recap(data, event, members) : null;
  const canEdit = manage && event && !event.archived && members.length > 0;
  const reportData = {
    ...data,
    reporting: {
      ...data.reporting,
      commanders: {
        ...data.reporting.commanders,
        ...(activeGroup
          ? {
              [activeGroup]: {
                name:
                  recipient ||
                  data.reporting.commanders[activeGroup]?.name ||
                  "",
                phone,
              },
            }
          : {}),
      },
    },
  };
  const report =
    event && viewMembers && activeGroup
      ? buildAttendanceReport(
          reportData,
          role,
          event,
          activeGroup,
          activeElement,
        )
      : null;
  let reportHref = "";
  let phoneError = "";
  if (report) {
    try {
      reportHref = whatsappLink(report.message, phone);
    } catch (e) {
      phoneError = (e as Error).message;
    }
  }
  function begin() {
    if (!canEdit || !stats) return;
    setError("");
    setDraft(
      stats.rows.map((r) => ({
        personId: r.person.id,
        status: r.record?.status ?? null,
        reason: r.record?.reason ?? "",
      })),
    );
  }
  function update(personId: string, changes: Partial<AttendanceEntry>) {
    setDraft(
      (d) =>
        d?.map((row) =>
          row.personId === personId ? { ...row, ...changes } : row,
        ) ?? null,
    );
    setError("");
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!event || !draft || !canEdit) return;
    try {
      recordAttendance(data, role, event.id, draft);
      setData((d) => recordAttendance(d, role, event.id, draft));
      setDraft(null);
      setError("");
      notify("Presensi kegiatan tersimpan. Rekap dan laporan diperbarui.");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function openReport() {
    if (!report || draft || event?.archived) return;
    setRecipient(data.reporting.commanders[activeGroup]?.name ?? "");
    setPhone(data.reporting.commanders[activeGroup]?.phone ?? "");
    setReportOpen(true);
  }
  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.message);
      notify("Laporan disalin.");
    } catch {
      setError(
        "Clipboard tidak tersedia. Pilih dan salin teks pada pratinjau laporan.",
      );
    }
  }
  function exportCsv() {
    if (!stats || !event) return;
    const cell = (v: string) => '"' + v.replaceAll('"', '""') + '"';
    const csv = [
      "Nama,Nomor,Group,Elemen,Kegiatan,Tanggal,Status,Keterangan,Pencatat",
      ...stats.rows.map((r) =>
        [
          r.person.name,
          r.person.number,
          r.person.group,
          r.person.element,
          event.title,
          event.date,
          r.record?.status ?? "Belum dicatat",
          r.record?.reason ?? "",
          r.record?.recordedBy ?? "",
        ]
          .map(cell)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "presensi-" + event.id + "-" + event.date + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="attendance-intro">
        <ShieldCheck size={25} aria-hidden="true" />
        <div>
          <h2>
            {manage
              ? "Pencatatan oleh pejabat berwenang"
              : "Presensi dicatat oleh pejabat berwenang"}
          </h2>
          <p>
            {manage
              ? "Pilih kegiatan, catat kehadiran anggota dalam cakupanmu, lalu tinjau laporan."
              : "Kamu dapat melihat status yang dicatat petugas. Serdik tidak melakukan absensi sendiri."}
          </p>
        </div>
        <Badge tone={manage ? "success" : ""}>
          {manage ? "Akses pencatatan" : "Akses baca"}
        </Badge>
      </div>
      <div className="panel">
        <SectionTitle
          title={viewMembers ? "Presensi kegiatan" : "Presensi saya"}
          subtitle="Setiap kegiatan memiliki pencatatan tersendiri. Pendaftaran kegiatan tidak dianggap sebagai kehadiran."
        >
          <button
            className="button subtle"
            onClick={exportCsv}
            disabled={!members.length || !!draft}
          >
            <Download size={16} />
            Unduh rekap
          </button>
        </SectionTitle>
        <div className="attendance-filters">
          <Field label="Tanggal">
            <input
              type="date"
              required
              value={date}
              disabled={!!draft}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value);
                  setEventId("");
                  setElement(
                    policies[role].scope === "element"
                      ? currentPerson.element
                      : "Semua elemen",
                  );
                }
              }}
            />
          </Field>
          <Field label="Kegiatan / sesi">
            <select
              value={event?.id ?? ""}
              disabled={!!draft || !events.length}
              onChange={(e) => setEventId(e.target.value)}
            >
              {!events.length && (
                <option value="">Tidak ada kegiatan dengan presensi</option>
              )}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.archived ? "[Arsip] " : ""}
                  {e.title} · {e.time} WIB
                </option>
              ))}
            </select>
          </Field>
          {viewMembers && (
            <>
              <Field label="Group">
                <select
                  value={activeGroup ?? ""}
                  disabled={!!draft || groups.length <= 1}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setElement(
                      policies[role].scope === "element"
                        ? currentPerson.element
                        : "Semua elemen",
                    );
                  }}
                >
                  {groups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Elemen">
                <select
                  value={activeElement ?? "Semua elemen"}
                  disabled={!!draft || policies[role].scope === "element"}
                  onChange={(e) => setElement(e.target.value)}
                >
                  {policies[role].scope !== "element" && (
                    <option>Semua elemen</option>
                  )}
                  {elements.map((el) => (
                    <option key={el}>{el}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
        {event && stats ? (
          <>
            <div className="activity-context">
              <div>
                <strong>{event.title}</strong>
                <p>
                  {formatDate(event.date)} · {event.time} – {event.end} WIB ·{" "}
                  {event.location}
                </p>
                {event.outfit && <small>Pakaian: {event.outfit}</small>}
              </div>
              <a
                className="text-button"
                href={activityHref("schedule", event.id)}
              >
                Lihat kegiatan
                <ArrowRight size={16} />
              </a>
            </div>
            {event.archived && (
              <div className="notice">
                Arsip pencatatan harian lama. Data dipertahankan dan tidak
                dianggap sebagai presensi apel; arsip tidak dapat diedit.
              </div>
            )}
            <div className="attendance-summary">
              <div>
                <strong>{stats.total}</strong>
                <span>
                  {viewMembers ? "Serdik dalam cakupan" : "Catatan saya"}
                </span>
              </div>
              <div>
                <strong>{stats.hadir}</strong>
                <span>Hadir</span>
              </div>
              <div>
                <strong>
                  {stats.sakit + stats.izin + stats.dinas + stats.absent}
                </strong>
                <span>Berhalangan</span>
              </div>
              <div className={stats.pending ? "pending" : "complete"}>
                <strong>{stats.pending}</strong>
                <span>Belum dicatat</span>
              </div>
            </div>
            <div className="attendance-controls">
              <Badge tone={stats.complete ? "success" : "warning"}>
                {stats.complete
                  ? "Pencatatan lengkap"
                  : "Pencatatan belum lengkap"}
              </Badge>
              <div>
                {canEdit && !draft && (
                  <button className="button primary" onClick={begin}>
                    {stats.pending ? "Catat presensi" : "Ubah pencatatan"}
                  </button>
                )}
                {viewMembers && !event.archived && (
                  <button
                    className="button subtle"
                    onClick={openReport}
                    disabled={!!draft || !members.length}
                  >
                    <MessageCircle size={17} />
                    Laporan WhatsApp
                  </button>
                )}
              </div>
            </div>
            <form onSubmit={save}>
              {draft && (
                <div className="draft-tools">
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() =>
                      setDraft(
                        (d) =>
                          d?.map((row) => ({
                            ...row,
                            status: "Hadir",
                            reason: "",
                          })) ?? null,
                      )
                    }
                  >
                    Tandai semua hadir
                  </button>
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() =>
                      setDraft(
                        (d) =>
                          d?.map((row) => {
                            const leave = approvedLeaveFor(
                              data,
                              event.date,
                              row.personId,
                            );
                            return leave
                              ? {
                                  ...row,
                                  status:
                                    leave.type === "Kesehatan"
                                      ? "Sakit"
                                      : "Izin",
                                  reason: leave.reason,
                                }
                              : row;
                          }) ?? null,
                      )
                    }
                  >
                    Terapkan izin disetujui
                  </button>
                  <p>
                    Perubahan belum tersimpan. Keterangan wajib untuk serdik
                    yang berhalangan.
                  </p>
                </div>
              )}
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Serdik</th>
                      <th>Group / Elemen</th>
                      <th>Status</th>
                      <th>Keterangan</th>
                      <th>Pencatatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.rows.map(({ person, record }) => {
                      const row = draft?.find((r) => r.personId === person.id);
                      const leave = approvedLeaveFor(
                        data,
                        event.date,
                        person.id,
                      );
                      return (
                        <tr key={person.id}>
                          <td>
                            <div className="person-cell">
                              <Avatar name={person.name} small />
                              <div>
                                <strong>{person.name}</strong>
                                <small>{person.number}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {person.group}
                            <small>{person.element}</small>
                          </td>
                          <td>
                            {row ? (
                              <AttendanceStatusButtons
                                name={person.name} value={row.status}
                                onChange={(status) => {
                                  update(person.id, {
                                    status,
                                    reason:
                                      status === null || status === "Hadir"
                                        ? ""
                                        : row.reason,
                                  });
                                  if (requiresAttendanceReason(status)) setReasonPersonId(person.id);
                                }}
                              />
                            ) : (
                              <Badge
                                tone={
                                  record?.status == null
                                    ? "warning"
                                    : attendanceStatusTone(record.status)
                                }
                              >
                                {record?.status ?? "Belum dicatat"}
                              </Badge>
                            )}
                          </td>
                          <td>
                            {row ? (
                              <input
                                aria-label={"Keterangan " + person.name}
                                placeholder="Alasan / keterangan"
                                value={row.reason}
                                disabled={row.status === null || row.status === "Hadir"}
                                maxLength={300}
                                onChange={(e) =>
                                  update(person.id, { reason: e.target.value })
                                }
                              />
                            ) : (
                              <span className="attendance-reason">
                                {record?.reason || "—"}
                              </span>
                            )}
                            {leave && (
                              <small className="approved-leave">
                                Izin disetujui: {leave.type}
                              </small>
                            )}
                          </td>
                          <td>
                            <small>
                              {record?.recordedBy || "Belum ada pencatatan"}
                            </small>
                            {record?.time && <small>{record.time} WIB</small>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!members.length && (
                <Empty title="Tidak ada serdik dalam cakupan" />
              )}
              {draft && (
                <div className="form-footer">
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() => {
                      setDraft(null);
                      setError("");
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="button primary">
                    <Check size={17} />
                    Simpan pencatatan
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          <Empty
            title="Belum ada kegiatan dengan presensi"
            description="Tambahkan kegiatan melalui Agenda dan aktifkan pencatatan presensi, atau pilih tanggal lain."
          />
        )}
      </div>
      {reportOpen && report && (
        <Modal
          title="Laporan absensi untuk WhatsApp"
          onClose={() => setReportOpen(false)}
        >
          <div className="report-status">
            <Badge tone={report.stats.complete ? "success" : "warning"}>
              {report.stats.complete
                ? "Laporan lengkap"
                : "Draf — belum lengkap"}
            </Badge>
            <small>
              {report.stats.total} serdik · {activeGroup}
              {activeElement ? " · " + activeElement : ""}
            </small>
          </div>
          <Field label="Nama Komandan Grup (penerima laporan)">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="Nomor WhatsApp (opsional)">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => { if (phoneError) setError(phoneError); }}
              placeholder="628…; kosongkan untuk memilih penerima di WhatsApp"
              aria-invalid={!!phoneError}
            />
          </Field>
          <Field label="Pratinjau laporan">
            <textarea
              className="report-preview"
              rows={18}
              readOnly
              value={report.message}
            />
          </Field>
          {!report.stats.complete && (
            <div className="notice">
              Lengkapi {report.stats.pending} catatan sebelum membuka laporan
              resmi di WhatsApp. Draf tidak menyatakan semua siswa hadir.
            </div>
          )}
          <div className="report-actions">
            <button className="button subtle" onClick={copyReport}>
              <ClipboardCopy size={17} />
              {report.stats.complete ? "Salin laporan" : "Salin draf"}
            </button>
            {report.stats.complete && reportHref ? (
              <a
                className="button primary"
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                Buka WhatsApp
              </a>
            ) : (
              <button className="button primary" disabled>
                <MessageCircle size={17} />
                Buka WhatsApp
              </button>
            )}
          </div>
          <p className="report-note">
            <FileText size={14} />
            Pesan hanya disiapkan. Pilih penerima dan kirim sendiri di WhatsApp.
          </p>
        </Modal>
      )}
      {reasonPerson && reasonEntry && <AttendanceReasonPopup key={reasonPerson.id} name={reasonPerson.name} status={reasonEntry.status} value={reasonEntry.reason} maxLength={300} onChange={reason => update(reasonPerson.id, { reason })} onClose={() => setReasonPersonId(null)} />}
      {error && <AttendanceErrorPopup message={error} members={error === "Lengkapi keterangan untuk serdik yang berhalangan." ? missingNames : []} onClose={() => setError("")} />}
    </>
  );
}
