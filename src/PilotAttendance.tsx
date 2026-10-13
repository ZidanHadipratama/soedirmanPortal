import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, CircleAlert, Plus, X } from "lucide-react";
import { whatsappLink } from "./operations";
import AttendanceStatusButtons, { attendanceStatusTone } from "./AttendanceStatusButtons";
import { requiresAttendanceReason } from "./AttendanceNotices";
import { localDate } from "./model";
import { pilotDraftCounts, pilotProgress, pilotReport, pilotSessionName, shiftDate, type PilotEntry, type PilotProfile, type PilotSession, type PilotSnapshot } from "./pilot-model";
import { Badge, Field, Modal } from "./ui";

type Access = { profile: PilotProfile; token: string; config: { url: string; key: string } };
type RosterView = "all" | "pending" | "away";
type Live = "connecting" | "live" | "reconnecting";
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error || "Permintaan gagal.", response.status);
  return body;
}
const json = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const defaultTime = (kind: PilotSession["kind"]) => kind === "pagi" ? "06:00" : kind === "malam" ? "20:00" : "12:00";
const dayLabel = (date: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const clock = (iso: string) => iso ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso)) : "";
const liveText: Record<Live, string> = { connecting: "Menghubungkan…", live: "Realtime terhubung", reconnecting: "Menyambung ulang…" };

function Banner({ message, onClose }: { message: string; onClose?: () => void }) {
  return <div className="pilot-banner" role="alert"><CircleAlert size={18} aria-hidden="true" /><p>{message}</p>{onClose && <button type="button" className="pilot-icon-button" aria-label="Tutup pesan" onClick={onClose}><X size={16} aria-hidden="true" /></button>}</div>;
}

export default function PilotAttendance() {
  const [access, setAccess] = useState<Access | null>(null);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [date, setDate] = useState(localDate);
  const [kind, setKind] = useState<PilotSession["kind"]>("pagi");
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("06:00");
  const [element, setElement] = useState(0);
  const [snapshot, setSnapshot] = useState<PilotSnapshot | null>(null);
  const [draft, setDraft] = useState<PilotEntry[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [checkReasons, setCheckReasons] = useState(false);
  const [view, setView] = useState<RosterView>("all");
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [copyError, setCopyError] = useState("");
  const [focusTarget, setFocusTarget] = useState<{ participant: number; scroll: boolean } | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<Live>("connecting");
  const generation = useRef(0);
  const [snapshotDate, setSnapshotDate] = useState("");
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await api<PilotSnapshot>(`/api/pilot/attendance?date=${date}`);
      if (generation.current === current) { setSnapshot(result); setSnapshotDate(date); setError(""); }
    } catch (err) { if (generation.current === current) setError((err as Error).message); }
  }, [date]);
  useEffect(() => {
    let active = true;
    api<Access>("/api/pilot/session").then(result => { if (active) setAccess(result); }).catch(err => { if (active && (!(err instanceof ApiError) || err.status !== 401)) setLoginError((err as Error).message); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!access) return;
    setSnapshot(null); setSnapshotDate(""); setDraft(null); setDirty(false); setError("");
    void refresh();
    const client = createClient(access.config.url, access.config.key, { auth: { persistSession: false, autoRefreshToken: false }, accessToken: async () => access.token });
    const onChange = () => { void refresh(); };
    let active = true;
    const channel = client.channel(`attendance-${access.profile.unit}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_records" }, onChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "attendance_records" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_sessions" }, onChange);
    // The realtime client rejoins dropped channels by itself; the header dot reports the state and SUBSCRIBED refetches what was missed.
    void client.realtime.setAuth(access.token).then(() => {
      if (!active) return;
      channel.subscribe(status => {
        if (!active) return;
        if (status === "SUBSCRIBED") { setLive("live"); void refresh(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("reconnecting");
      });
    }).catch(() => { if (active) setLive("reconnecting"); });
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    return () => { active = false; generation.current++; void client.removeChannel(channel); window.removeEventListener("focus", focus); };
  }, [access, refresh]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!focusTarget) return;
    const input = document.getElementById(`pilot-reason-${focusTarget.participant}`);
    if (focusTarget.scroll) input?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    input?.focus({ preventScroll: focusTarget.scroll });
    setFocusTarget(null);
  }, [focusTarget]);
  const loaded = !!snapshot && snapshotDate === date;
  const selected = snapshot?.sessions.find(s => s.kind === kind && (kind !== "insidental" || s.label === label.trim().toLowerCase()));
  const canRecord = access?.profile.role === "danelemen";
  const visibleElement = access?.profile.element_number ?? (element || undefined);
  const members = snapshot?.members.filter(m => !visibleElement || m.element_number === visibleElement) || [];
  const report = loaded && selected ? pilotReport(snapshot, selected, visibleElement) : null;
  const existing = snapshot?.records.filter(r => r.session_id === selected?.id) || [];
  const recordable = canRecord && loaded && members.length === 30 && (kind !== "insidental" || !!label.trim());
  // An untouched draft mirrors saved data, so realtime updates and session switches never leave stale revisions behind.
  const sessionKey = `${date}|${kind}|${kind === "insidental" ? label.trim().toLowerCase() : ""}`;
  useEffect(() => {
    if (dirty) return;
    if (!recordable) { setDraft(null); return; }
    setDraft(members.map(m => { const r = existing.find(r => r.participant_number === m.participant_number); return { participant_number: m.participant_number, status: r?.status ?? null, reason: r?.reason || "", revision: r?.revision || 0 }; }));
  }, [snapshot, sessionKey, recordable, dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  const statusOf = (participant: number) => (draft?.find(r => r.participant_number === participant) || existing.find(r => r.participant_number === participant))?.status ?? null;
  const counts = pilotDraftCounts(draft || members.map(m => ({ status: statusOf(m.participant_number) })));
  const stale = dirty && !!draft?.some(d => (existing.find(r => r.participant_number === d.participant_number)?.revision ?? 0) !== d.revision);
  const missing = (draft || []).filter(r => requiresAttendanceReason(r.status) && !r.reason.trim());
  const showRoster = canRecord || !!element;
  const shown = members.filter(m => { const status = statusOf(m.participant_number); return view === "all" || (view === "pending" ? status === null : requiresAttendanceReason(status)); });
  const overview: Pick<PilotSession, "kind" | "label">[] = [{ kind: "pagi", label: "" }, { kind: "malam", label: "" }, ...(snapshot?.sessions.filter(s => s.kind === "insidental") || [])];
  const newIncident = kind === "insidental" && !selected;
  const locked = dirty || busy;
  const title = access?.profile.role === "dangroup" ? "Pantau kekuatan Grup 2" : `Presensi Elemen ${access?.profile.element_number} · Grup 2`;
  function chooseSession(next: Pick<PilotSession, "kind" | "label">) {
    setKind(next.kind); setLabel(next.label); setTime(defaultTime(next.kind)); setSaveError("");
  }
  function updateDraft(update: (entries: PilotEntry[]) => PilotEntry[]) {
    setDraft(d => d && update(d)); setDirty(true); setSaveError("");
  }
  function discard() { setDirty(false); setCheckReasons(false); setSaveError(""); void refresh(); }
  function openReport() { setCopyError(""); setReportOpen(true); }
  async function login(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{8}$/.test(pin)) { setLoginError("PIN harus terdiri dari 8 digit angka."); return; }
    setBusy(true); setLoginError("");
    try { await api("/api/pilot/session", json({ pin })); setPin(""); setAccess(await api<Access>("/api/pilot/session")); }
    catch (err) { setLoginError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await api("/api/pilot/session", { method: "DELETE" }); setAccess(null); setSnapshot(null); setDraft(null); setError(""); setLive("connecting"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || !canRecord || !dirty) return;
    if (missing.length) {
      setCheckReasons(true); setView("all");
      setFocusTarget({ participant: missing[0].participant_number, scroll: true });
      return;
    }
    setBusy(true); setSaveError("");
    try {
      await api("/api/pilot/attendance", json({ date, kind, label, time: selected?.time || time, entries: draft }));
      setDirty(false); setCheckReasons(false); await refresh(); setToast("Pencatatan tersimpan. DanGrup dapat melihat hasilnya.");
    } catch (err) { setSaveError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function copyReport(message: string) {
    try { await navigator.clipboard.writeText(message); setToast("Laporan disalin."); setCopyError(""); }
    catch { setCopyError("Clipboard tidak tersedia. Pilih teks laporan lalu salin manual."); }
  }

  if (checking) return <div className="panel" role="status">Memeriksa sesi akses…</div>;
  if (!access) return <div className="panel pilot-login"><h2>Masuk absensi Grup 2</h2><p>Gunakan PIN DanGrup atau DanElemen Anda.</p><form onSubmit={login} noValidate>
    <Field label="PIN akses"><input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" minLength={8} maxLength={8} required value={pin} aria-invalid={!!loginError} aria-describedby={loginError ? "pilot-login-error" : undefined} onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setLoginError(""); }} /></Field>
    {loginError && <p id="pilot-login-error" className="pilot-field-error" role="alert">{loginError}</p>}
    <button className="button primary" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
  </form></div>;

  const primary = !canRecord ? null
    : dirty ? <button className="button primary" disabled={busy}>{busy ? "Menyimpan…" : missing.length ? `Simpan · ${missing.length} keterangan kosong` : `Simpan (${counts.total - counts.pending}/${counts.total})`}</button>
    : report && existing.length ? <button type="button" className="button primary" onClick={openReport}>✓ Tersimpan · Buat laporan WA</button>
    : <button type="button" className="button primary" disabled>Pilih status anggota</button>;

  return <div className="pilot-attendance">
    <header className="panel pilot-top">
      <div className="pilot-heading">
        <div><h2>{title}</h2><span className={`pilot-live ${live}`} role="status"><i aria-hidden="true" />{liveText[live]}</span></div>
        <details className="pilot-menu"><summary aria-label="Menu akun">{access.profile.display_name}</summary>
          <div><p>{access.profile.display_name}</p>
            <button type="button" className="button subtle" disabled={busy} onClick={() => { setError(""); void refresh(); }}>Muat ulang data</button>
            <button type="button" className="button subtle" disabled={busy || dirty} onClick={logout}>Keluar</button>
            {dirty && <small>Simpan atau batalkan perubahan sebelum keluar.</small>}</div>
        </details>
      </div>
      <div className="pilot-date">
        <button type="button" className="pilot-icon-button" aria-label="Hari sebelumnya" disabled={locked} onClick={() => setDate(d => shiftDate(d, -1))}><ChevronLeft size={20} aria-hidden="true" /></button>
        <label className="pilot-date-label"><span>{dayLabel(date)}</span><input type="date" aria-label="Tanggal" value={date} disabled={locked} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></label>
        <button type="button" className="pilot-icon-button" aria-label="Hari berikutnya" disabled={locked} onClick={() => setDate(d => shiftDate(d, 1))}><ChevronRight size={20} aria-hidden="true" /></button>
        {date !== localDate() && <button type="button" className="pilot-link" disabled={locked} onClick={() => setDate(localDate())}>Hari ini</button>}
      </div>
      <div className="pilot-sessions" role="tablist" aria-label="Sesi">{overview.map(s => {
        const session = snapshot?.sessions.find(x => x.kind === s.kind && x.label === s.label);
        const progress = loaded ? pilotProgress(snapshot, session?.id) : [];
        const scoped = visibleElement ? progress.filter(p => p.element === visibleElement) : progress;
        const recorded = scoped.reduce((sum, p) => sum + p.recorded, 0), total = scoped.reduce((sum, p) => sum + p.total, 0);
        const active = s.kind === kind && (s.kind !== "insidental" || s.label === label.trim().toLowerCase());
        return <button type="button" role="tab" key={`${s.kind}-${s.label}`} className={`pilot-session${total && recorded === total ? " done" : ""}`} aria-selected={active} disabled={locked && !active} onClick={() => chooseSession(s)}>
          <span>{pilotSessionName(s)}</span><small>{!loaded ? "…" : session ? `${recorded}/${total} tercatat` : "Belum dibuka"}</small>
        </button>;
      })}
        {canRecord && <button type="button" role="tab" className="pilot-session add" aria-selected={newIncident} disabled={locked && !newIncident} onClick={() => chooseSession({ kind: "insidental", label: "" })}><span><Plus size={14} aria-hidden="true" /> Insidental</span><small>Kegiatan baru</small></button>}
      </div>
      {canRecord && newIncident && <div className="pilot-incident">
        <Field label="Nama kegiatan"><input autoFocus value={label} maxLength={120} disabled={locked} placeholder="Contoh: senam pagi" onChange={e => setLabel(e.target.value)} list="pilot-incidents" /><datalist id="pilot-incidents">{snapshot?.sessions.filter(s => s.kind === "insidental").map(s => <option key={s.id} value={s.label} />)}</datalist></Field>
        <Field label="Waktu (WIB)"><input type="time" value={time} disabled={locked} onChange={e => setTime(e.target.value)} /></Field>
      </div>}
      {loaded && (showRoster || report) && <div className="pilot-meter" aria-hidden="true"><span style={{ width: `${counts.total ? (counts.total - counts.pending) / counts.total * 100 : 0}%` }} /></div>}
    </header>
    {error && <Banner message={error} onClose={() => setError("")} />}
    {!loaded && !error && <div className="panel" role="status">Memuat data…</div>}
    {loaded && !canRecord && <section className="pilot-elements" aria-label="Kekuatan per elemen">
      {pilotProgress(snapshot, selected?.id).map(p => <button type="button" key={p.element} className={`pilot-element${p.recorded === p.total ? " done" : ""}`} aria-pressed={element === p.element} onClick={() => { const next = element === p.element ? 0 : p.element; setElement(next); setView("all"); if (next) requestAnimationFrame(() => document.getElementById("pilot-roster")?.scrollIntoView?.({ block: "start", behavior: "smooth" })); }}>
        <span className="pilot-element-head"><strong>Elemen {p.element}</strong><small>{p.recorded === p.total ? "Lengkap" : p.recorded ? `${p.recorded}/${p.total} tercatat` : "Belum disetor"}</small></span>
        <progress max={p.total} value={p.recorded} aria-label={`Progres Elemen ${p.element}`} />
        <span className="pilot-element-stats"><span>{p.hadir} hadir</span><span>{p.away} berhalangan</span>{p.lastAt && <span>Disetor {clock(p.lastAt)}</span>}</span>
      </button>)}
      <div className="pilot-elements-foot"><p>{report ? `${report.stats.hadir} hadir · ${report.stats.sakit + report.stats.izin + report.stats.dinas + report.stats.absent} berhalangan · ${report.stats.pending} belum dicatat dari ${report.stats.total}` : "Belum ada pencatatan untuk sesi ini."}</p>
        <button type="button" className="button primary" disabled={!report} onClick={openReport}>Laporan WhatsApp{element ? ` · Elemen ${element}` : ""}</button></div>
    </section>}
    {loaded && showRoster && <form id="pilot-roster" className="panel pilot-roster-panel" onSubmit={save} noValidate>
      <div className="pilot-roster-head">
        {!canRecord && <button type="button" className="pilot-link" onClick={() => setElement(0)}><ChevronLeft size={16} aria-hidden="true" /> Semua elemen</button>}
        <div className="pilot-view" role="group" aria-label="Tampilkan anggota">
          {([["all", `Semua ${counts.total}`], ["pending", `Belum ${counts.pending}`], ["away", `Berhalangan ${counts.away}`]] as const).map(([value, text]) => <button type="button" key={value} className={`pilot-chip${view === value ? " active" : ""}`} aria-pressed={view === value} onClick={() => setView(value)}>{text}</button>)}
        </div>
        {draft && counts.pending > 0 && <button type="button" className="button subtle" disabled={busy} onClick={() => updateDraft(d => d.map(r => r.status === null ? { ...r, status: "Hadir", reason: "" } : r))}>Tandai sisanya hadir ({counts.pending})</button>}
      </div>
      {canRecord && kind === "insidental" && !label.trim() && <p className="pilot-hint">Isi nama kegiatan untuk mulai mencatat.</p>}
      {shown.length === 0 && (draft || !canRecord) && <p className="pilot-hint">Tidak ada anggota pada tampilan ini.</p>}
      <ul className="pilot-roster">{shown.map(m => {
        const row = draft?.find(r => r.participant_number === m.participant_number) || existing.find(r => r.participant_number === m.participant_number);
        const status = row?.status ?? null;
        const change = (updates: Partial<PilotEntry>) => updateDraft(d => d.map(r => r.participant_number === m.participant_number ? { ...r, ...updates } : r));
        const empty = !!draft && requiresAttendanceReason(status) && !row?.reason.trim();
        return <li className={`pilot-member ${attendanceStatusTone(status)}${checkReasons && empty ? " missing" : ""}`} key={m.participant_number}>
          <div className="pilot-member-name"><span className="pilot-number">{m.participant_number}</span><strong>{m.full_name}</strong></div>
          {draft ? <AttendanceStatusButtons name={m.full_name} value={status} disabled={busy} onChange={(next, via) => {
            change({ status: next, ...(!requiresAttendanceReason(next) ? { reason: "" } : {}) });
            if (requiresAttendanceReason(next) && via === "pointer") setFocusTarget({ participant: m.participant_number, scroll: false });
          }} /> : <Badge tone={attendanceStatusTone(status)}>{status ?? "Belum dicatat"}</Badge>}
          {draft && requiresAttendanceReason(status) && <label className="pilot-reason"><span>Keterangan {status}</span>
            <input id={`pilot-reason-${m.participant_number}`} aria-label={`Keterangan ${m.full_name}`} aria-invalid={checkReasons && empty} placeholder="Wajib diisi, mis. demam / tugas piket" maxLength={1000} value={row?.reason || ""} disabled={busy} onChange={e => change({ reason: e.target.value })} />
            {checkReasons && empty && <small role="alert">Keterangan untuk {m.full_name} wajib diisi.</small>}</label>}
          {!draft && row?.reason && <p className="pilot-reason-text">{row.reason}</p>}
        </li>;
      })}</ul>
      {canRecord && draft && <div className="pilot-savebar">
        {stale && <Banner message="Data elemen ini berubah di perangkat lain. Batalkan perubahan untuk memuat data terbaru." />}
        {saveError && <Banner message={`${saveError} Perubahan Anda belum tersimpan.`} onClose={() => setSaveError("")} />}
        <div className="pilot-savebar-row">
          <div aria-live="polite"><strong>{counts.total - counts.pending}/{counts.total} terisi</strong><span>{counts.hadir} hadir · {counts.away} berhalangan · {counts.pending} belum</span></div>
          <div className="pilot-actions">{dirty && <button type="button" className="button subtle" disabled={busy} onClick={discard}>Batalkan</button>}{primary}</div>
        </div>
      </div>}
    </form>}
    {reportOpen && report && <Modal title="Laporan kekuatan untuk WhatsApp" onClose={() => setReportOpen(false)}><Badge tone={report.stats.complete ? "success" : "warning"}>{report.stats.complete ? "Lengkap" : "Draf — belum lengkap"}</Badge><textarea className="report-preview" aria-label="Isi laporan" readOnly rows={18} value={report.message} />
      {copyError && <p className="pilot-field-error" role="alert">{copyError}</p>}
      <div className="pilot-actions"><button className="button subtle" onClick={() => copyReport(report.message)}>Salin laporan</button>
        {report.stats.complete ? <a className="button primary" href={whatsappLink(report.message)} target="_blank" rel="noopener noreferrer">Buka WhatsApp</a> : <p>Lengkapi pencatatan sebelum membuka WhatsApp.</p>}</div><p>Pesan siap kirim. Pilih penerima dan kirim di WhatsApp.</p></Modal>}
    {toast && <div className="pilot-toast" role="status">{toast}</div>}
  </div>;
}
