import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Mail,
  MessageSquare,
  Pin,
  UsersRound,
} from "lucide-react";
import {
  can,
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
  type Aspiration,
} from "./model";
import {
  AddButton,
  Avatar,
  Badge,
  Empty,
  ExternalLink,
  Modal,
  SaveButton,
  SearchInput,
  SectionTitle,
} from "./ui";
import {
  EntryForm,
  ScopeFilters,
  matchesFilter,
  commonCategories,
  type PageProps,
} from "./workflows";

export function InformationPage({ data, setData, role, notify }: PageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const rows = data.posts.filter(
    (p) =>
      (category === "Semua" || p.category === category) &&
      `${p.title} ${p.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  const active = data.posts.find((p) => p.id === selected);
  return (
    <div className="panel">
      <SectionTitle
        title="Kabar Soedirman"
        subtitle="Tetap terhubung dengan informasi dan hasil musyawarah."
      >
        {can(role, "information.manage") && (
          <AddButton onClick={() => setAdding(true)}>
            Terbitkan informasi
          </AddButton>
        )}
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari informasi atau notulensi…"
        />
        <select
          aria-label="Kategori informasi"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Semua", "Pengumuman", "Informasi", "Notulensi"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="record-list">
        {rows.map((p) => (
          <article className="post-record" key={p.id}>
            <div className="post-icon">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="post-meta">
                <Badge>{p.category}</Badge>
                <span>{formatDate(p.date, true)}</span>
                {p.pinned && (
                  <span className="pin">
                    <Pin size={13} />
                    Disematkan
                  </span>
                )}
              </div>
              <button
                className="title-button"
                onClick={() => setSelected(p.id)}
              >
                {p.title}
              </button>
              <p className="line-clamp">{p.body}</p>
              <small>{p.author}</small>
            </div>
            <SaveButton
              saved={data.bookmarks.includes(p.id)}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  bookmarks: d.bookmarks.includes(p.id)
                    ? d.bookmarks.filter((b) => b !== p.id)
                    : [...d.bookmarks, p.id],
                }))
              }
            />
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Informasi tidak ditemukan"
          description="Coba kata kunci atau kategori lain."
        />
      )}
      {active && (
        <Modal title={active.title} onClose={() => setSelected(null)}>
          <div className="post-meta">
            <Badge>{active.category}</Badge>
            {formatDate(active.date)}
          </div>
          <p className="article-body">{active.body}</p>
          <p className="muted">Diterbitkan oleh {active.author}</p>
        </Modal>
      )}
      {adding && can(role, "information.manage") && (
        <EntryForm
          title="Terbitkan informasi"
          submitLabel="Terbitkan"
          fields={[
            { name: "title", label: "Judul informasi" },
            {
              name: "category",
              label: "Jenis informasi",
              options: ["Pengumuman", "Informasi", "Notulensi"],
            },
            {
              name: "body",
              label: "Isi informasi / hasil musyawarah",
              type: "textarea",
            },
          ]}
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              posts: [
                {
                  id: uid(),
                  title: v.title,
                  category: v.category,
                  body: v.body,
                  date: localDate(),
                  author: roleLabels[role],
                  pinned: false,
                },
                ...d.posts,
              ],
            }));
            setAdding(false);
            notify("Informasi diterbitkan.");
          }}
        />
      )}
    </div>
  );
}

export function DirectoryPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Semua group");
  const [element, setElement] = useState("Semua elemen");
  const [selected, setSelected] = useState<string | null>(null);
  const rows = people.filter(
    (p) =>
      `${p.name} ${p.number} ${p.position}`
        .toLowerCase()
        .includes(query.toLowerCase()) && matchesFilter(p.id, group, element),
  );
  const active = people.find((p) => p.id === selected);
  return (
    <div className="panel">
      <SectionTitle
        title="Direktori serdik"
        subtitle="Temukan rekan, elemen, dan penanggung jawab group."
      >
        <Badge>{people.length} serdik contoh</Badge>
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari nama, nomor, atau jabatan…"
        />
        <ScopeFilters {...{ group, setGroup, element, setElement }} />
      </div>
      <div className="directory-grid">
        {rows.map((p) => (
          <button
            className="person-card"
            key={p.id}
            onClick={() => setSelected(p.id)}
          >
            <Avatar name={p.name} />
            <h3>{p.name}</h3>
            <p>{p.number}</p>
            <Badge>{p.position}</Badge>
            <small>
              {p.group} · {p.element}
            </small>
          </button>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Serdik tidak ditemukan"
          description="Coba nama, nomor, atau group lain."
        />
      )}
      {active && (
        <Modal title="Profil serdik" onClose={() => setSelected(null)}>
          <div className="profile-detail">
            <Avatar name={active.name} />
            <h2>{active.name}</h2>
            <p>{active.number}</p>
            <Badge>{active.position}</Badge>
            <p>
              {active.group} · {active.element}
            </p>
            <a className="button subtle" href={`mailto:${active.email}`}>
              <Mail size={17} />
              {active.email}
            </a>
            <small className="muted">Kontak contoh untuk demonstrasi.</small>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AspirationsPage({ data, setData, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [status, setStatus] = useState("Semua status");
  const view = can(role, "aspiration.view");
  const rows = data.aspirations.filter(
    (a) =>
      (view ? inScope(role, personFor(a.personId)) : a.personId === "me") &&
      (status === "Semua status" || a.status === status),
  );
  const active = data.aspirations.find((a) => a.id === review);
  return (
    <div className="panel">
      <SectionTitle
        title={view ? "Aspirasi serdik" : "Aspirasi saya"}
        subtitle="Setiap masukan menjadi langkah untuk perbaikan bersama."
      >
        <AddButton onClick={() => setAdding(true)}>
          Sampaikan aspirasi
        </AddButton>
      </SectionTitle>
      <div className="notice">
        <MessageSquare size={19} />
        <span>
          Aspirasi ditinjau oleh Lembaga Musyawarah Serdik. Pantau status dan
          tanggapannya di sini.
        </span>
      </div>
      <div className="toolbar">
        <select
          aria-label="Filter status aspirasi"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["Semua status", "Diterima", "Diproses", "Diajukan", "Selesai"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <div className="record-list">
        {rows.map((a) => (
          <article className="record" key={a.id}>
            <div className="record-top">
              <div>
                <div className="post-meta">
                  <Badge>{a.status}</Badge>
                  <span>{a.category}</span>
                </div>
                <h3>{a.title}</h3>
                <small>
                  {personFor(a.personId).name} · {formatDate(a.date, true)}
                </small>
              </div>
              {can(role, "aspiration.manage") && (
                <button
                  className="button subtle"
                  onClick={() => setReview(a.id)}
                >
                  Kelola aspirasi
                </button>
              )}
            </div>
            <p>{a.body}</p>
            {a.response && (
              <div className="response">
                <strong>Tanggapan LMS</strong>
                <p>{a.response}</p>
              </div>
            )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Belum ada aspirasi"
          description="Sampaikan masukan atau ide untuk kegiatan dan kehidupan serdik."
        />
      )}
      {adding && (
        <EntryForm
          title="Sampaikan aspirasi"
          submitLabel="Kirim aspirasi"
          fields={[
            { name: "title", label: "Judul aspirasi" },
            {
              name: "category",
              label: "Kategori",
              options: [
                "Sarana belajar",
                "Kegiatan",
                "Kesejahteraan",
                "Administrasi",
                "Lainnya",
              ],
            },
            {
              name: "body",
              label: "Masukan dan usulan perbaikan",
              type: "textarea",
            },
          ]}
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              aspirations: [
                {
                  id: uid(),
                  personId: "me",
                  title: v.title,
                  category: v.category,
                  body: v.body,
                  status: "Diterima",
                  response: "",
                  date: localDate(),
                },
                ...d.aspirations,
              ],
            }));
            setAdding(false);
            notify("Aspirasi terkirim ke LMS.");
          }}
        />
      )}
      {active && can(role, "aspiration.manage") && (
        <EntryForm
          title="Kelola dan tanggapi aspirasi"
          fields={[
            {
              name: "status",
              label: "Status penanganan",
              options: ["Diterima", "Diproses", "Diajukan", "Selesai"],
              initial: active.status,
            },
            {
              name: "response",
              label: "Tanggapan / catatan pengajuan",
              type: "textarea",
              initial: active.response,
            },
          ]}
          onClose={() => setReview(null)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              aspirations: d.aspirations.map((a) =>
                a.id === review
                  ? {
                      ...a,
                      status: v.status as Aspiration["status"],
                      response: v.response,
                    }
                  : a,
              ),
            }));
            setReview(null);
            notify("Status dan tanggapan aspirasi tersimpan.");
          }}
        />
      )}
    </div>
  );
}

export function GoodNotesPage({ data, setData, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Semua group");
  const [element, setElement] = useState("Semua elemen");
  const view = can(role, "good.view");
  const rows = data.goodNotes.filter(
    (g) =>
      (view ? inScope(role, personFor(g.personId)) : g.personId === "me") &&
      matchesFilter(g.personId, group, element) &&
      `${g.title} ${g.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="panel">
      <SectionTitle
        title={view ? "Catatan baik serdik" : "Catatan baik saya"}
        subtitle="Kebaikan kecil hari ini, kebiasaan baik untuk masa depan."
      >
        <AddButton onClick={() => setAdding(true)}>
          Tulis catatan baik
        </AddButton>
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari catatan baik…"
        />
        {view && policies[role].scope === "global" && (
          <ScopeFilters {...{ group, setGroup, element, setElement }} />
        )}
      </div>
      <div className="note-grid">
        {rows.map((g) => (
          <article className="good-note" key={g.id}>
            <div className="post-meta">
              <Badge tone="success">{g.category}</Badge>
              <small>{formatDate(g.date, true)}</small>
            </div>
            <h3>{g.title}</h3>
            <p>{g.body}</p>
            <div className="mini-person">
              <Avatar name={personFor(g.personId).name} small />
              <span>{personFor(g.personId).name}</span>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Belum ada catatan baik"
          description="Catat kegiatan baik dan refleksi yang ingin kamu ingat."
        />
      )}
      {adding && (
        <EntryForm
          title="Tulis catatan baik"
          fields={[
            { name: "title", label: "Kegiatan baik yang dilakukan" },
            {
              name: "date",
              label: "Tanggal kegiatan",
              type: "date",
              initial: localDate(),
            },
            {
              name: "category",
              label: "Nilai kebaikan",
              options: [
                "Kepedulian",
                "Kerja sama",
                "Integritas",
                "Disiplin",
                "Inisiatif",
              ],
            },
            { name: "body", label: "Cerita dan refleksi", type: "textarea" },
          ]}
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              goodNotes: [
                {
                  id: uid(),
                  personId: "me",
                  title: v.title,
                  date: v.date,
                  category: v.category,
                  body: v.body,
                },
                ...d.goodNotes,
              ],
            }));
            setAdding(false);
            notify("Catatan baik tersimpan.");
          }}
        />
      )}
    </div>
  );
}

export function ProjectsPage({ data, setData, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const rows = data.projects.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) &&
      (!mine || p.members.includes("me")),
  );
  const active = data.projects.find((p) => p.id === selected);
  function join(id: string) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === id && !p.members.includes("me")
          ? { ...p, members: [...p.members, "me"] }
          : p,
      ),
    }));
    notify("Kamu bergabung dengan project.");
  }
  return (
    <div className="panel">
      <SectionTitle
        title="Bergerak bersama"
        subtitle="Temukan ide, bergabung dengan tim, dan wujudkan dampak."
      >
        <AddButton onClick={() => setAdding(true)}>
          Ajukan ide project
        </AddButton>
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari project…"
        />
        <button
          className={`button ${mine ? "primary" : "subtle"}`}
          aria-pressed={mine}
          onClick={() => setMine(!mine)}
        >
          Project saya
        </button>
      </div>
      <div className="project-grid">
        {rows.map((p) => {
          const progress = p.tasks.length
            ? Math.round(
                (p.tasks.filter((t) => t.done).length / p.tasks.length) * 100,
              )
            : 0;
          return (
            <article className="project-card" key={p.id}>
              <div className="project-cover">
                <UsersRound size={34} />
                <Badge>{p.category}</Badge>
              </div>
              <div className="project-content">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="progress-meta">
                  <span>Progress kegiatan</span>
                  <strong>{progress}%</strong>
                </div>
                <progress
                  value={progress}
                  max={100}
                  aria-label={`Progress ${p.title}`}
                />
                <div className="project-footer">
                  <span>
                    <UsersRound size={16} />
                    {p.members.length} anggota
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setSelected(p.id)}
                  >
                    Buka project
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title="Project tidak ditemukan"
          description="Ajukan ide baru atau lihat semua project untuk bergabung."
        />
      )}
      {adding && (
        <EntryForm
          title="Ajukan ide project"
          submitLabel="Buat project"
          fields={[
            { name: "title", label: "Nama project" },
            {
              name: "category",
              label: "Bidang project",
              options: ["Sosial", "Pendidikan", "Lingkungan", "Inovasi"],
            },
            {
              name: "body",
              label: "Tujuan dan rencana kegiatan",
              type: "textarea",
            },
          ]}
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              projects: [
                {
                  id: uid(),
                  title: v.title,
                  category: v.category,
                  body: v.body,
                  owner: "me",
                  members: ["me"],
                  tasks: [],
                  feedback: "",
                },
                ...d.projects,
              ],
            }));
            setAdding(false);
            notify(
              "Ide project dibuat. Ajak rekan bergabung dan tambahkan tugas.",
            );
          }}
        />
      )}
      {active && !feedback && !newTask && (
        <Modal title={active.title} onClose={() => setSelected(null)}>
          <Badge>{active.category}</Badge>
          <p>{active.body}</p>
          <h3>Tim project</h3>
          <div className="member-chips">
            {active.members.map((id) => (
              <span key={id}>
                <Avatar name={personFor(id).name} small />
                {personFor(id).name}
              </span>
            ))}
          </div>
          {!active.members.includes("me") && (
            <button className="button primary" onClick={() => join(active.id)}>
              Gabung project
            </button>
          )}
          <div className="section-title">
            <h3>Daftar tugas</h3>
            {active.members.includes("me") && (
              <button className="text-button" onClick={() => setNewTask(true)}>
                Tambah tugas
              </button>
            )}
          </div>
          {active.tasks.length ? (
            active.tasks.map((t) => (
              <label className="task" key={t.id}>
                <input
                  type="checkbox"
                  checked={t.done}
                  disabled={!active.members.includes("me")}
                  onChange={() => {
                    if (!active.members.includes("me")) return;
                    setData((d) => ({
                      ...d,
                      projects: d.projects.map((p) =>
                        p.id === active.id
                          ? {
                              ...p,
                              tasks: p.tasks.map((task) =>
                                task.id === t.id
                                  ? { ...task, done: !task.done }
                                  : task,
                              ),
                            }
                          : p,
                      ),
                    }));
                  }}
                />
                <span className={t.done ? "done" : ""}>{t.title}</span>
                {t.done && <Check size={16} />}
              </label>
            ))
          ) : (
            <p className="muted">
              Belum ada tugas. Tambahkan rencana kerja pertama.
            </p>
          )}
          {active.feedback && (
            <div className="response">
              <strong>Catatan supervisi pengasuh</strong>
              <p>{active.feedback}</p>
            </div>
          )}
          {can(role, "project.supervise") && (
            <button className="button subtle" onClick={() => setFeedback(true)}>
              Berikan catatan supervisi
            </button>
          )}
        </Modal>
      )}
      {active && newTask && (
        <EntryForm
          title="Tambah tugas project"
          fields={[{ name: "title", label: "Nama tugas" }]}
          onClose={() => setNewTask(false)}
          onSave={(v) => {
            if (active.members.includes("me"))
              setData((d) => ({
                ...d,
                projects: d.projects.map((p) =>
                  p.id === active.id
                    ? {
                        ...p,
                        tasks: [
                          ...p.tasks,
                          { id: uid(), title: v.title, done: false },
                        ],
                      }
                    : p,
                ),
              }));
            setNewTask(false);
            notify("Tugas ditambahkan.");
          }}
        />
      )}
      {active && feedback && can(role, "project.supervise") && (
        <EntryForm
          title="Catatan supervisi project"
          fields={[
            {
              name: "feedback",
              label: "Arahan dan evaluasi",
              type: "textarea",
              initial: active.feedback,
            },
          ]}
          onClose={() => setFeedback(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              projects: d.projects.map((p) =>
                p.id === active.id ? { ...p, feedback: v.feedback } : p,
              ),
            }));
            setFeedback(false);
            notify("Catatan supervisi tersimpan.");
          }}
        />
      )}
    </div>
  );
}

export function LearningPage({ data, setData, role, notify }: PageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua materi");
  const [adding, setAdding] = useState(false);
  const canPublish = can(role, "learning.manage");
  const rows = data.resources.filter(
    (r) =>
      (canPublish ||
        r.audience === "Semua serdik" ||
        r.audience === currentPerson.group ||
        r.audience === currentPerson.element) &&
      `${r.title} ${r.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "Semua materi" || r.category === category),
  );
  return (
    <div className="panel">
      <SectionTitle
        title="Ruang belajar"
        subtitle="Pengetahuan untuk berkembang, referensi untuk bergerak."
      >
        {canPublish && (
          <AddButton onClick={() => setAdding(true)}>
            Bagikan sumber belajar
          </AddButton>
        )}
      </SectionTitle>
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari materi atau referensi…"
        />
        <select
          aria-label="Kategori materi"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Semua materi", ...commonCategories].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="learning-grid">
        {rows.map((r) => (
          <article className="learning-card" key={r.id}>
            <div className="learning-top">
              <span className="app-icon cyan">
                <BookOpen size={25} />
              </span>
              <SaveButton
                saved={data.bookmarks.includes(r.id)}
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    bookmarks: d.bookmarks.includes(r.id)
                      ? d.bookmarks.filter((b) => b !== r.id)
                      : [...d.bookmarks, r.id],
                  }))
                }
              />
            </div>
            <Badge>{r.category}</Badge>
            <h3>{r.title}</h3>
            <p>{r.description}</p>
            <small>
              {r.author} · {r.audience}
            </small>
            {safeUrl(r.url) && (
              <ExternalLink href={r.url}>Buka materi</ExternalLink>
            )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="Materi tidak ditemukan"
          description="Coba kata kunci atau kategori lain."
        />
      )}
      {adding && canPublish && (
        <EntryForm
          title="Bagikan sumber belajar"
          fields={[
            { name: "title", label: "Judul materi" },
            { name: "category", label: "Kategori", options: commonCategories },
            {
              name: "description",
              label: "Deskripsi materi",
              type: "textarea",
            },
            { name: "url", label: "Tautan sumber", type: "url" },
            {
              name: "audience",
              label: "Akses materi",
              options:
                policies[role].scope === "element"
                  ? [currentPerson.element]
                  : policies[role].scope === "group"
                    ? [currentPerson.group]
                    : [
                        "Semua serdik",
                        "Group 1",
                        "Group 2",
                        ...new Set(people.map((p) => p.element)),
                      ],
            },
          ]}
          validate={(v) =>
            safeUrl(v.url) ? "" : "Gunakan tautan http atau https yang valid."
          }
          onClose={() => setAdding(false)}
          onSave={(v) => {
            setData((d) => ({
              ...d,
              resources: [
                {
                  id: uid(),
                  title: v.title,
                  category: v.category,
                  description: v.description,
                  url: v.url,
                  audience: v.audience,
                  author: roleLabels[role],
                },
                ...d.resources,
              ],
            }));
            setAdding(false);
            notify("Sumber belajar dibagikan.");
          }}
        />
      )}
    </div>
  );
}
