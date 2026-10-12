import {
  useState,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
} from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Download,
  MapPin,
  UsersRound,
  Shirt,
} from "lucide-react";
import {
  activityHref,
  activityRoster,
  approvedLeaveFor,
  recap,
} from "./operations";
import {
  can,
  canManageEvent,
  currentPerson,
  formatDate,
  inScope,
  localDate,
  people,
  personFor,
  policies,
  roleLabels,
  safeUrl,
  uid,
  visibleEvent,
  type Role,
  type Store,
  type Event,
} from "./model";
import {
  AddButton,
  Avatar,
  Badge,
  Empty,
  ExternalLink,
  Field,
  FormFooter,
  Modal,
  SearchInput,
  SectionTitle,
} from "./ui";

export type PageProps = {
  data: Store;
  setData: Dispatch<SetStateAction<Store>>;
  role: Role;
  notify: (message: string) => void;
};
export type FieldSpec = {
  name: string;
  label: string;
  type?: string;
  options?: string[];
  initial?: string;
  required?: boolean;
  min?: string;
};
export function EntryForm({
  title,
  fields,
  onSave,
  onClose,
  validate,
  submitLabel,
}: {
  title: string;
  fields: FieldSpec[];
  onSave: (v: Record<string, string>) => void;
  onClose: () => void;
  validate?: (v: Record<string, string>) => string;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, f.initial ?? f.options?.[0] ?? ""]),
    ),
  );
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]),
    );
    if (fields.some((f) => f.required !== false && !cleaned[f.name])) {
      setError("Lengkapi semua kolom wajib.");
      return;
    }
    const issue = validate?.(cleaned);
    if (issue) {
      setError(issue);
      return;
    }
    onSave(cleaned);
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {fields.map((f) => (
          <Field
            key={f.name}
            label={`${f.label}${f.required === false ? " (opsional)" : ""}`}
          >
            {f.options ? (
              <select
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              >
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={4}
                required={f.required !== false}
                maxLength={4000}
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              />
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required !== false}
                min={f.min}
                maxLength={f.type === "text" || !f.type ? 200 : undefined}
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              />
            )}
          </Field>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <FormFooter onCancel={onClose} label={submitLabel} />
      </form>
    </Modal>
  );
}
export function ScopeFilters({
  group,
  setGroup,
  element,
  setElement,
}: {
  group: string;
  setGroup: (s: string) => void;
  element: string;
  setElement: (s: string) => void;
}) {
  return (
    <div className="scope-filters">
      <label>
        Group
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setElement("Semua elemen");
          }}
        >
          <option>Semua group</option>
          {[...new Set(people.map((p) => p.group))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Elemen
        <select value={element} onChange={(e) => setElement(e.target.value)}>
          <option>Semua elemen</option>
          {[
            ...new Set(
              people
                .filter((p) => group === "Semua group" || p.group === group)
                .map((p) => p.element),
            ),
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
function matchesFilter(personId: string, group: string, element: string) {
  const p = personFor(personId);
  return (
    (group === "Semua group" || p.group === group) &&
    (element === "Semua elemen" || p.element === element)
  );
}

export { default as AttendancePage } from "./AttendancePage";

export function LeavePage({ data, setData, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [status, setStatus] = useState("Semua status");
  const [group, setGroup] = useState("Semua group");
  const [element, setElement] = useState("Semua elemen");
  const view = can(role, "leave.view");
  const rows = data.leaves.filter(
    (l) =>
      (view ? inScope(role, personFor(l.personId)) : l.personId === "me") &&
      (status === "Semua status" || l.status === status) &&
      matchesFilter(l.personId, group, element),
  );
  return (
    <div className="panel">
      <SectionTitle
        title={view ? "Pengajuan izin serdik" : "Pengajuan izin saya"}
        subtitle="Ajukan izin dan ikuti proses persetujuannya."
      >
        <AddButton onClick={() => setAdding(true)}>Ajukan izin</AddButton>
      </SectionTitle>
      <div className="toolbar">
        <select
          aria-label="Filter status izin"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["Semua status", "Menunggu", "Diizinkan", "Ditolak"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {view && policies[role].scope === "global" && (
          <ScopeFilters {...{ group, setGroup, element, setElement }} />
        )}
      </div>
      <div className="record-list">
        {rows.map((l) => (
          <article className="record" key={l.id}>
            <div className="record-top">
              <div>
                <Badge>{l.status}</Badge>
                <h3>{l.type}</h3>
                <p>
                  {personFor(l.personId).name} · {formatDate(l.from, true)} –{" "}
                  {formatDate(l.to, true)}
                </p>
              </div>
              {can(role, "leave.manage") && l.status === "Menunggu" && (
                <button
                  className="button subtle"
                  onClick={() => setReview(l.id)}
                >
                  Tinjau pengajuan
                </button>
              )}
            </div>
            <p>{l.reason}</p>
            {l.response && (
              <div className="response">
                <strong>Tanggapan pengelola</strong>
                <p>{l.response}</p>
              </div>
            )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Belum ada pengajuan izin"
          description="Pengajuan izin dan perkembangannya akan muncul di sini."
        />
      )}
      {adding && (
        <EntryForm
          title="Ajukan perizinan"
          submitLabel="Ajukan izin"
          fields={[
            {
              name: "type",
              label: "Jenis izin",
              options: [
                "Keperluan keluarga",
                "Kesehatan",
                "Keperluan pribadi",
                "Lainnya",
              ],
            },
            {
              name: "from",
              label: "Tanggal mulai",
              type: "date",
              initial: localDate(),
              min: localDate(),
            },
            {
              name: "to",
              label: "Tanggal selesai",
              type: "date",
              initial: localDate(),
              min: localDate(),
            },
            { name: "reason", label: "Alasan izin", type: "textarea" },
          ]}
          validate={(v) =>
            v.to < v.from
              ? "Tanggal selesai harus sama atau setelah tanggal mulai."
              : ""
          }
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              leaves: [
                {
                  id: uid(),
                  personId: "me",
                  type: v.type,
                  from: v.from,
                  to: v.to,
                  reason: v.reason,
                  status: "Menunggu",
                },
                ...d.leaves,
              ],
            }));
            setAdding(false);
            notify("Izin diajukan. Menunggu persetujuan pengelola.");
          }}
        />
      )}
      {review && can(role, "leave.manage") && (
        <EntryForm
          title="Tinjau perizinan"
          fields={[
            {
              name: "status",
              label: "Keputusan",
              options: ["Diizinkan", "Ditolak"],
            },
            { name: "response", label: "Catatan keputusan", type: "textarea" },
          ]}
          onClose={() => setReview(null)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              leaves: d.leaves.map((l) =>
                l.id === review && inScope(role, personFor(l.personId))
                  ? {
                      ...l,
                      status: v.status as "Diizinkan" | "Ditolak",
                      response: v.response,
                    }
                  : l,
              ),
            }));
            setReview(null);
            notify("Keputusan perizinan tersimpan.");
          }}
        />
      )}
    </div>
  );
}

export function SchedulePage({ data, setData, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [selected, setSelected] = useState<Event | null>(() => {
    const id = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.hash.split("?")[1],
    ).get("activity");
    return (
      data.events.find(
        (e) => e.id === id && !e.archived && visibleEvent(role, e),
      ) ?? null
    );
  });
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Mendatang");
  const visible = data.events
    .filter(
      (e) =>
        !e.archived &&
        visibleEvent(role, e) &&
        (period === "Semua kegiatan" || e.date >= localDate()) &&
        e.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const managed = can(role, "schedule.manage");
  const active = selected && data.events.find((e) => e.id === selected.id);
  function attend(id: string) {
    setData((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === id && visibleEvent(role, e)
          ? {
              ...e,
              attendees: e.attendees.includes("me")
                ? e.attendees.filter((a) => a !== "me")
                : [...e.attendees, "me"],
            }
          : e,
      ),
    }));
    notify(
      data.events.find((e) => e.id === id)?.attendees.includes("me")
        ? "Keikutsertaan dibatalkan."
        : "Keikutsertaanmu tercatat.",
    );
  }
  return (
    <div className="panel">
      <SectionTitle
        title="Agenda kegiatan"
        subtitle="Rencanakan harimu dan ambil bagian dalam kegiatan."
      >
        {managed && (
          <AddButton onClick={() => setAdding(true)}>Tambah kegiatan</AddButton>
        )}
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari kegiatan…"
        />
        <select
          aria-label="Periode agenda"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>Mendatang</option>
          <option>Semua kegiatan</option>
        </select>
      </div>
      <div className="event-list">
        {visible.map((e) => (
          <article className="event-record" key={e.id}>
            <div className="date-block">
              <span>
                {new Date(`${e.date}T12:00:00`).toLocaleDateString("id-ID", {
                  month: "short",
                })}
              </span>
              <strong>{e.date.slice(-2)}</strong>
            </div>
            <div className="event-main">
              <Badge>{e.category}</Badge>
              <h3>{e.title}</h3>
              <p>
                <Clock3 size={15} />
                {e.time} – {e.end} WIB <MapPin size={15} />
                {e.location}
              </p>
              <small>
                {e.attendees.length} pendaftaran · {e.group}
                {e.element !== "Semua elemen" ? ` · ${e.element}` : ""}
              </small>
              {e.outfit && (
                <small className="outfit-note">
                  <Shirt size={14} />
                  {e.outfit}
                </small>
              )}
            </div>
            <div className="event-actions">
              <button
                className={`button ${e.attendees.includes("me") ? "subtle" : "primary"}`}
                onClick={() => attend(e.id)}
              >
                {e.attendees.includes("me") ? (
                  <>
                    <Check size={16} />
                    Terdaftar · Batalkan
                  </>
                ) : (
                  "Ikut kegiatan"
                )}
              </button>
              <button className="text-button" onClick={() => setSelected(e)}>
                Detail kegiatan
              </button>
              {e.attendanceRequired && (
                <a
                  className="text-button"
                  href={activityHref("attendance", e.id)}
                >
                  Lihat presensi kegiatan
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <Empty
          title="Tidak ada kegiatan"
          description="Coba kata kunci lain atau pilih semua kegiatan."
        />
      )}
      {adding && managed && (
        <EntryForm
          title={editing ? "Ubah jadwal kegiatan" : "Tambah kegiatan"}
          fields={[
            { name: "title", label: "Nama kegiatan", initial: editing?.title },
            {
              name: "date",
              label: "Tanggal",
              type: "date",
              initial: editing?.date ?? localDate(),
            },
            {
              name: "time",
              label: "Waktu mulai",
              type: "time",
              initial: editing?.time ?? "08:00",
            },
            {
              name: "end",
              label: "Waktu selesai",
              type: "time",
              initial: editing?.end ?? "09:00",
            },
            { name: "location", label: "Lokasi", initial: editing?.location },
            {
              name: "outfit",
              label: "Pakaian / perlengkapan",
              initial: editing?.outfit,
              required: false,
            },
            {
              name: "description",
              label: "Arahan kegiatan",
              initial: editing?.description,
              type: "textarea",
              required: false,
            },
            {
              name: "attendanceRequired",
              label: "Pencatatan presensi oleh pejabat",
              options: ["Ya", "Tidak"],
              initial: editing
                ? editing.attendanceRequired
                  ? "Ya"
                  : "Tidak"
                : "Ya",
            },
            {
              name: "category",
              label: "Kategori",
              options: ["Wajib", "Akademik", "Sosial", "Project"],
              initial: editing?.category,
            },
            {
              name: "group",
              label: "Peserta group",
              initial: editing?.group,
              options:
                policies[role].scope === "group" ||
                policies[role].scope === "element"
                  ? [currentPerson.group]
                  : ["Semua group", "Group 1", "Group 2"],
            },
            {
              name: "element",
              label: "Peserta elemen",
              initial: editing?.element,
              options:
                policies[role].scope === "element"
                  ? [currentPerson.element]
                  : ["Semua elemen", ...new Set(people.map((p) => p.element))],
            },
          ]}
          validate={(v) =>
            v.end <= v.time
              ? "Waktu selesai harus setelah waktu mulai."
              : editing &&
                  data.attendance.some((a) => a.eventId === editing.id) &&
                  (v.title !== editing.title ||
                    v.date !== editing.date ||
                    v.time !== editing.time ||
                    v.group !== editing.group ||
                    v.element !== editing.element ||
                    (v.attendanceRequired === "Ya") !==
                      editing.attendanceRequired)
                ? "Kegiatan sudah memiliki presensi. Buat kegiatan baru untuk mengubah nama, tanggal, sesi, atau cakupan peserta."
                : v.element !== "Semua elemen" &&
                    !people.some(
                      (p) =>
                        p.element === v.element &&
                        (v.group === "Semua group" || p.group === v.group),
                    )
                  ? "Elemen tersebut tidak termasuk dalam group yang dipilih."
                  : ""
          }
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(v) => {
            const values = {
              title: v.title,
              date: v.date,
              time: v.time,
              end: v.end,
              location: v.location,
              category: v.category,
              group: v.group,
              element: v.element,
              outfit: v.outfit,
              description: v.description,
              attendanceRequired: v.attendanceRequired === "Ya",
            };
            setData((d) => ({
              ...d,
              events: editing
                ? d.events.map((e) =>
                    e.id === editing.id && canManageEvent(role, e)
                      ? { ...e, ...values }
                      : e,
                  )
                : [
                    ...d.events,
                    {
                      id: uid(),
                      ...values,
                      attendees: [],
                      documentation: "",
                    },
                  ],
            }));
            setAdding(false);
            setEditing(null);
            notify(
              editing
                ? "Jadwal kegiatan diperbarui."
                : "Kegiatan ditambahkan ke agenda.",
            );
          }}
        />
      )}
      {active && (
        <Modal title={active.title} onClose={() => setSelected(null)}>
          <div className="detail-meta">
            <p>
              <CalendarDays size={17} />
              {formatDate(active.date)}
            </p>
            <p>
              <Clock3 size={17} />
              {active.time} – {active.end} WIB
            </p>
            <p>
              <MapPin size={17} />
              {active.location}
            </p>
          </div>
          {active.description && (
            <p className="activity-description">{active.description}</p>
          )}
          {active.outfit && (
            <div className="notice">
              <Shirt size={18} />
              <span>Pakaian / perlengkapan: {active.outfit}</span>
            </div>
          )}
          {canManageEvent(role, active) && (
            <button
              className="button subtle"
              onClick={() => {
                setEditing(active);
                setSelected(null);
                setAdding(true);
              }}
            >
              Ubah jadwal
            </button>
          )}
          <h3>
            <UsersRound size={18} /> Pendaftaran kegiatan (
            {active.attendees.length})
          </h3>
          {active.attendees.length ? (
            active.attendees.map((id) => (
              <div className="mini-person" key={id}>
                <Avatar name={personFor(id).name} small />
                {personFor(id).name}
              </div>
            ))
          ) : (
            <p className="muted">Belum ada peserta terdaftar.</p>
          )}
          <p className="muted">
            Pendaftaran menyatakan keikutsertaan; kehadiran dicatat terpisah
            oleh pejabat berwenang.
          </p>
          {active.attendanceRequired && (
            <div className="activity-attendance-box">
              <strong>Presensi kegiatan</strong>
              <p>
                {recap(data, active, activityRoster(active, role)).pending}{" "}
                serdik belum dicatat dalam cakupanmu.
              </p>
              <a
                className="button primary"
                href={activityHref("attendance", active.id)}
              >
                {can(role, "attendance.manage")
                  ? "Catat presensi kegiatan"
                  : "Lihat presensi kegiatan"}
              </a>
            </div>
          )}
          {data.leaves.some(
            (l) =>
              approvedLeaveFor(data, active.date, l.personId)?.id === l.id &&
              activityRoster(active, role).some((p) => p.id === l.personId),
          ) && (
            <div className="activity-leaves">
              <h3>Izin disetujui pada tanggal kegiatan</h3>
              {activityRoster(active, role).map((p) => {
                const leave = approvedLeaveFor(data, active.date, p.id);
                return leave ? (
                  <p key={p.id}>
                    <strong>{p.name}</strong> · {leave.type} ·{" "}
                    {formatDate(leave.from, true)} –{" "}
                    {formatDate(leave.to, true)}
                  </p>
                ) : null;
              })}
            </div>
          )}
          <h3>Dokumentasi kegiatan</h3>
          {active.documentation && safeUrl(active.documentation) ? (
            <ExternalLink href={active.documentation}>
              Buka dokumentasi
            </ExternalLink>
          ) : (
            <p className="muted">Dokumentasi belum ditambahkan.</p>
          )}
          {canManageEvent(role, active) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const url = String(
                  new FormData(e.currentTarget).get("url") ?? "",
                );
                if (!safeUrl(url)) {
                  notify("Gunakan tautan http atau https yang valid.");
                  return;
                }
                setData((d) => ({
                  ...d,
                  events: d.events.map((ev) =>
                    ev.id === active.id && canManageEvent(role, ev)
                      ? { ...ev, documentation: url }
                      : ev,
                  ),
                }));
                notify("Tautan dokumentasi tersimpan.");
              }}
            >
              <Field label="Tautan dokumentasi">
                <input
                  type="url"
                  name="url"
                  defaultValue={active.documentation}
                  required
                  placeholder="https://…"
                />
              </Field>
              <button className="button primary" type="submit">
                Simpan dokumentasi
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

export const commonCategories = [
  "Kepemimpinan",
  "Pengembangan diri",
  "Kolaborasi",
  "Akademik",
];
export { matchesFilter, roleLabels };
