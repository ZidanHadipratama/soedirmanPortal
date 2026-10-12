import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Grid2X2,
  House,
  LayoutGrid,
  MapPin,
  Megaphone,
  Menu,
  Pencil,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { apps, type AppId } from "./catalog";
import {
  can,
  createSeed,
  currentPerson,
  formatDate,
  localDate,
  policies,
  roleLabels,
  visibleEvent,
  type Role,
} from "./model";
import { useStore } from "./store";
import { activityHref, homeActions } from "./operations";
import { HomeActions, NextActivityCard } from "./HomeActions";
import { Avatar, Badge, Empty, Modal, SearchInput, SectionTitle } from "./ui";
import {
  AttendancePage,
  LeavePage,
  SchedulePage,
  type PageProps,
} from "./workflows";
import {
  AspirationsPage,
  DirectoryPage,
  GoodNotesPage,
  InformationPage,
  LearningPage,
  ProjectsPage,
} from "./community";

const appPages = {
  attendance: AttendancePage,
  leave: LeavePage,
  schedule: SchedulePage,
  information: InformationPage,
  directory: DirectoryPage,
  aspirations: AspirationsPage,
  good: GoodNotesPage,
  projects: ProjectsPage,
  learning: LearningPage,
};
const navItems = [
  { id: "home", label: "Beranda", icon: House },
  { id: "apps", label: "Semua aplikasi", icon: LayoutGrid },
  { id: "agenda", label: "Agenda saya", icon: CalendarDays },
  { id: "news", label: "Kabar terbaru", icon: Megaphone },
  { id: "saved", label: "Tersimpan", icon: Bookmark },
];
function routeValue() {
  return window.location.hash.replace(/^#\/?/, "") || "home";
}
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="#/home"
      className={`brand ${compact ? "compact" : ""}`}
      aria-label="Soedirman Portal — Beranda"
    >
      <span className="brand-mark">
        <svg viewBox="0 0 36 40" aria-hidden="true">
          <path
            d="M18 2 32 7v14c0 8-14 17-14 17S4 29 4 21V7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M23 12h-8a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8h-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="M18 7v5m0 16v5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <span>
        <strong>
          soedirman<span className="brand-dot">.</span>
        </strong>
        <small>Portal kegiatan P3MD</small>
      </span>
    </a>
  );
}
function CampusIllustration() {
  return (
    <svg
      className="campus-art"
      viewBox="0 0 500 260"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="362" cy="94" r="61" fill="#f6ca72" />
      <circle cx="362" cy="94" r="81" stroke="#6489ae" strokeOpacity=".45" />
      <circle cx="362" cy="94" r="102" stroke="#6489ae" strokeOpacity=".2" />
      <path d="M10 251 172 131 284 222 382 128 500 234v26H10" fill="#234f7b" />
      <path d="m196 260 165-108 139 96v12" fill="#32628b" />
      <path d="M117 173h287v74H117z" fill="#f0e8d5" />
      <path d="M106 172h309v10H106zM98 245h323v9H98z" fill="#c9d4d2" />
      <path d="M203 139h113v106H203z" fill="#fcf7e8" />
      <path d="m191 144 68-40 69 40H191Z" fill="#d6e3df" />
      <path d="m202 145 57-30 57 30H202Z" fill="#f0e8d5" />
      <path d="M218 182h20v63h-20zm63 0h20v63h-20z" fill="#d0d9d2" />
      <path d="M247 192a13 13 0 0 1 26 0v53h-26v-53Z" fill="#32577b" />
      {[133, 166, 332, 365].map((x) => (
        <path
          key={x}
          d={`M${x} 198a8 8 0 0 1 16 0v26h-16v-26Z`}
          fill="#32577b"
        />
      ))}
      <circle cx="260" cy="154" r="8" fill="#c99a49" />
      <path d="M258 146v15m-5-8h14" stroke="#f8f2df" strokeWidth="2" />
      <path
        d="M44 247V148m0 8-22 28m22-8 24 22m-24 6-27 23"
        stroke="#779793"
        strokeWidth="5"
      />
      <path
        d="M43 115c-35 27-44 61-26 69 3 17 13 22 29 16 24 13 43-7 39-26 10-20-6-47-42-59Z"
        fill="#688e86"
      />
      <path
        d="M437 247V173m0 1-16 20m16-7 19 22"
        stroke="#779793"
        strokeWidth="4"
      />
      <path
        d="M437 142c-26 22-34 46-20 55 0 12 15 16 23 11 22 6 34-12 25-25 4-16-6-30-28-41Z"
        fill="#688e86"
      />
      <path d="M65 254h391" stroke="#8eaaa7" strokeWidth="3" />
      <path
        d="m328 49 10-5 10 5m30-23 8-4 8 4"
        stroke="#bcd3df"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M102 91h26m-13-13v26" stroke="#6385a5" strokeWidth="1.5" />
      <circle cx="165" cy="65" r="3" fill="#89a9c2" />
    </svg>
  );
}
function Calendar({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (s: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date(`${selected}T12:00:00`));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = (first.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  return (
    <div className="mini-calendar">
      <div className="calendar-head">
        <strong>
          {month.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <div>
          <button
            className="icon-button"
            aria-label="Bulan sebelumnya"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Bulan berikutnya"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
          <span className="day-label" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={`empty${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = localDate(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          return (
            <button
              key={i}
              aria-label={formatDate(date)}
              aria-pressed={selected === date}
              className={`${selected === date ? "selected" : ""} ${date === localDate() ? "today" : ""}`}
              onClick={() => setSelected(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function AppTile({
  app,
  favorite,
  onFavorite,
}: {
  app: (typeof apps)[number];
  favorite?: boolean;
  onFavorite?: () => void;
}) {
  const Icon = app.icon;
  return (
    <div className="app-tile">
      <a
        href={`#/app/${app.id}`}
        className="app-tile-link"
        aria-label={`Buka ${app.name}`}
      >
        <span className={`app-icon ${app.color}`}>
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h3>{app.name}</h3>
          <p>{app.description}</p>
        </div>
        <ArrowUpRight className="launch-arrow" size={17} />
      </a>
      {onFavorite && (
        <button
          className={`favorite-button ${favorite ? "selected" : ""}`}
          aria-label={`${favorite ? "Hapus" : "Tambah"} ${app.name} ${favorite ? "dari" : "ke"} favorit`}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  const { data, setData, storageError } = useStore();
  const [route, setRoute] = useState(routeValue);
  const [role, setRole] = useState<Role>("serdik");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [sidebar, setSidebar] = useState(false);
  const [modal, setModal] = useState<
    | "favorites"
    | "profile"
    | "help"
    | "notifications"
    | "switcher"
    | "reset"
    | null
  >(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [notificationsRead, setNotificationsRead] = useState(false);
  useEffect(() => {
    function change() {
      setRoute(routeValue());
      setSidebar(false);
      setModal(null);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }
  function navigate(value: string) {
    window.location.hash = `/${value}`;
    setModal(null);
  }
  function toggleFavorite(id: string) {
    setData((d) => {
      if (d.favorites.includes(id))
        return { ...d, favorites: d.favorites.filter((f) => f !== id) };
      if (d.favorites.length >= 8) {
        return d;
      }
      return { ...d, favorites: [...d.favorites, id] };
    });
    if (!data.favorites.includes(id) && data.favorites.length >= 8)
      notify("Pilih maksimal 8 aplikasi favorit. Hapus satu untuk mengganti.");
  }
  const appId = route.startsWith("app/")
    ? (route.slice(4).split("?")[0] as AppId)
    : null;
  const activeApp = apps.find((a) => a.id === appId);
  const ActivePage = activeApp ? appPages[activeApp.id] : null;
  const props: PageProps = { data, setData, role, notify };
  const actions = homeActions(data, role);
  const events = data.events
    .filter(
      (e) => !e.archived && e.date === selectedDate && visibleEvent(role, e),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const matchingApps = apps.filter(
    (a) =>
      `${a.name} ${a.description} ${a.category}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "Semua" || a.category === category),
  );
  const favoriteApps = matchingApps.filter((a) =>
    data.favorites.includes(a.id),
  );
  const pageLabel =
    activeApp?.name ??
    navItems.find((n) => n.id === route)?.label ??
    "Halaman tidak ditemukan";
  const pending = data.leaves.filter(
    (l) => l.personId === "me" && l.status === "Menunggu",
  ).length;
  const news = data.posts.slice(0, 3);
  const savedItems = [
    ...data.posts.filter((p) => data.bookmarks.includes(p.id)),
    ...data.resources.filter(
      (r) =>
        data.bookmarks.includes(r.id) &&
        (r.audience === "Semua serdik" ||
          r.audience === currentPerson.group ||
          r.audience === currentPerson.element ||
          can(role, "learning.manage")),
    ),
  ];

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Lewati ke konten
      </a>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Tutup navigasi"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <Brand />
        <div className="workspace-label">
          <span className="workspace-dot" />
          Ruang serdik<span>P3MD</span>
        </div>
        <nav aria-label="Navigasi portal">
          {navItems.map((n) => {
            const Icon = n.icon;
            return (
              <a
                href={`#/${n.id}`}
                className={route === n.id ? "active" : ""}
                aria-current={route === n.id ? "page" : undefined}
                key={n.id}
              >
                <Icon size={20} />
                {n.label}
                {n.id === "saved" && data.bookmarks.length > 0 && (
                  <span className="nav-count">{data.bookmarks.length}</span>
                )}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <ShieldCheck size={24} />
            <strong>Tumbuh dalam kebersamaan.</strong>
            <p>Disiplin, kepedulian, dan kolaborasi dimulai dari kita.</p>
          </div>
          <button onClick={() => setModal("help")}>
            <CircleHelp size={19} />
            Bantuan portal
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-version">
            <span>Soedirman Portal</span>
            <span>v0.2</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka navigasi"
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={22} />
            </button>
            <span>Portal</span>
            <ChevronRight size={15} />
            <strong>{pageLabel}</strong>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("apps");
            }}
          >
            <Search size={17} />
            <input
              aria-label="Cari aplikasi atau layanan"
              placeholder="Cari aplikasi atau layanan…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Buka peluncur aplikasi"
              onClick={() => setModal("switcher")}
            >
              <Grid2X2 size={20} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Lihat notifikasi"
              onClick={() => {
                setModal("notifications");
                setNotificationsRead(true);
              }}
            >
              <Bell size={20} />
              {!notificationsRead && <i />}
            </button>
            <span className="topbar-divider" />
            <button
              className="profile-button"
              onClick={() => setModal("profile")}
              aria-label="Profil dan pengaturan peran"
            >
              <Avatar name={currentPerson.name} small />
              <span>
                <strong>{currentPerson.name}</strong>
                <small>
                  {role === "serdik" ? "Peserta didik" : roleLabels[role]}
                </small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="demo-strip">
            <span>
              <span className="demo-dot" />
              Pratinjau interaktif · data contoh
            </span>
            <label>
              Peran aktif
              <select
                aria-label="Peran aktif"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  notify(`Peran aktif: ${roleLabels[e.target.value as Role]}`);
                }}
              >
                {Object.entries(roleLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {storageError && (
            <p role="alert" className="form-error">
              Penyimpanan browser tidak tersedia. Perubahan hanya bertahan
              selama halaman terbuka.
            </p>
          )}
          {route === "home" ? (
            <>
              <div className="greeting">
                <div>
                  <p>Selamat datang kembali, Arif</p>
                  <h1>Hari baik untuk bergerak bersama.</h1>
                </div>
                <span className="today-label">
                  <CalendarDays size={17} />
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="home-columns">
                <div className="home-main">
                  <section className="hero">
                    <div className="hero-content">
                      <span className="hero-label">
                        <span />
                        Terhubung dalam satu portal
                      </span>
                      <h2>
                        Bersama, bertumbuh.
                        <br />
                        Bersama, berdampak.
                      </h2>
                      <p>
                        Semua kebutuhan kegiatan P3MD,
                        <br />
                        lebih dekat dan lebih terarah.
                      </p>
                      <a className="button hero-button" href="#/apps">
                        Jelajahi aplikasi
                        <ArrowRight size={17} />
                      </a>
                    </div>
                    <CampusIllustration />
                  </section>
                  <HomeActions data={data} role={role} />
                  <section className="favorites-section">
                    <SectionTitle
                      title="Aplikasi favorit"
                      subtitle="Layanan pilihanmu, siap dalam satu klik."
                    >
                      <button
                        className="text-button"
                        onClick={() => setModal("favorites")}
                      >
                        <Pencil size={15} />
                        Atur favorit
                      </button>
                    </SectionTitle>
                    <div className="app-grid">
                      {favoriteApps.map((app) => (
                        <AppTile key={app.id} app={app} />
                      ))}
                    </div>
                    {!favoriteApps.length && (
                      <Empty
                        title={
                          query
                            ? "Aplikasi tidak ditemukan"
                            : "Pilih aplikasi favoritmu"
                        }
                        description={
                          query
                            ? "Coba kata kunci lain."
                            : "Gunakan Atur favorit untuk memilih aplikasi."
                        }
                      />
                    )}
                    <a className="all-apps-link" href="#/apps">
                      <LayoutGrid size={17} />
                      Lihat semua aplikasi
                      <span>
                        {apps.length} aplikasi
                        <ArrowRight size={16} />
                      </span>
                    </a>
                  </section>
                  <section className="news-section">
                    <SectionTitle
                      title="Kabar terbaru"
                      subtitle="Informasi penting untuk langkah berikutnya."
                    >
                      <a className="text-button" href="#/news">
                        Lihat semua
                        <ArrowRight size={15} />
                      </a>
                    </SectionTitle>
                    <div className="home-news-list">
                      {news.map((p) => (
                        <a href="#/news" className="home-news" key={p.id}>
                          <span
                            className={`news-symbol ${p.category === "Notulensi" ? "violet" : "blue"}`}
                          >
                            <Megaphone size={21} />
                          </span>
                          <div>
                            <div className="post-meta">
                              <Badge>{p.category}</Badge>
                              <span>{formatDate(p.date, true)}</span>
                            </div>
                            <h3>{p.title}</h3>
                            <p>{p.author}</p>
                          </div>
                          <ChevronRight size={18} />
                        </a>
                      ))}
                    </div>
                  </section>
                </div>
                <aside className="home-aside">
                  <NextActivityCard data={data} role={role} />
                  <section className="agenda-widget">
                    <div className="widget-heading">
                      <h2>Agenda harian</h2>
                      <CalendarDays size={18} />
                    </div>
                    <Calendar
                      selected={selectedDate}
                      setSelected={setSelectedDate}
                    />
                    <div className="agenda-date">
                      <span>
                        {selectedDate === localDate()
                          ? "Hari ini"
                          : formatDate(selectedDate, true)}
                      </span>
                      <small>{events.length} kegiatan</small>
                    </div>
                    <div className="timeline">
                      {events.map((e, i) => (
                        <a
                          href={activityHref("schedule", e.id)}
                          className="timeline-item"
                          key={e.id}
                        >
                          <span className={`timeline-dot dot-${i % 3}`} />
                          <time>
                            {e.time} – {e.end}
                          </time>
                          <h3>{e.title}</h3>
                          <p>
                            <MapPin size={13} />
                            {e.location}
                          </p>
                          {e.attendees.includes("me") && (
                            <small className="joined">
                              <Check size={12} />
                              Kamu terdaftar
                            </small>
                          )}
                        </a>
                      ))}
                    </div>
                    {!events.length && (
                      <p className="calendar-empty">
                        Belum ada kegiatan pada tanggal ini.
                      </p>
                    )}
                    <a href="#/app/schedule" className="agenda-all">
                      Buka agenda
                      <ArrowRight size={16} />
                    </a>
                  </section>
                  <div className="daily-note">
                    <span className="daily-icon">
                      <Sparkles size={21} />
                    </span>
                    <div>
                      <h3>Satu kebaikan setiap hari.</h3>
                      <p>
                        Hal kecil yang kamu lakukan bisa berarti besar bagi
                        sesama.
                      </p>
                      <a href="#/app/good">
                        Tulis catatan baik
                        <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : route === "apps" ? (
            <>
              <div className="page-intro">
                <h1>Temukan aplikasi yang kamu butuhkan.</h1>
                <p>Satu akun, berbagai layanan untuk kegiatan P3MD.</p>
              </div>
              <div className="catalog-panel">
                <div className="catalog-toolbar">
                  <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Cari aplikasi…"
                  />
                  <span>{matchingApps.length} aplikasi tersedia</span>
                </div>
                <div className="category-chips" aria-label="Kategori aplikasi">
                  {["Semua", ...new Set(apps.map((a) => a.category))].map(
                    (c) => (
                      <button
                        className={category === c ? "selected" : ""}
                        aria-pressed={category === c}
                        key={c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ),
                  )}
                </div>
                <div className="app-grid catalog-grid">
                  {matchingApps.map((app) => (
                    <AppTile
                      key={app.id}
                      app={app}
                      favorite={data.favorites.includes(app.id)}
                      onFavorite={() => toggleFavorite(app.id)}
                    />
                  ))}
                </div>
                {!matchingApps.length && (
                  <Empty
                    title="Aplikasi tidak ditemukan"
                    description="Coba kata kunci atau kategori lain."
                  />
                )}
              </div>
            </>
          ) : route === "agenda" ? (
            <>
              <div className="page-intro">
                <h1>Agenda saya</h1>
                <p>Jadwal kegiatan dan keikutsertaanmu dalam satu tempat.</p>
              </div>
              <SchedulePage key={role} {...props} />
            </>
          ) : route === "news" ? (
            <>
              <div className="page-intro">
                <h1>Kabar terbaru</h1>
                <p>Pengumuman, informasi, dan notulensi kegiatan.</p>
              </div>
              <InformationPage key={role} {...props} />
            </>
          ) : route === "saved" ? (
            <>
              <div className="page-intro">
                <h1>Tersimpan untuk nanti.</h1>
                <p>Informasi dan materi yang ingin kamu kunjungi kembali.</p>
              </div>
              <div className="panel">
                <div className="saved-list">
                  {savedItems.map((item) => (
                    <article className="saved-row" key={item.id}>
                      <span className="app-icon blue">
                        <Bookmark size={23} />
                      </span>
                      <div>
                        <Badge>{item.category}</Badge>
                        <h3>{item.title}</h3>
                      </div>
                      <a
                        className="button subtle"
                        href={`#/app/${"body" in item ? "information" : "learning"}`}
                      >
                        Buka
                        <ArrowUpRight size={16} />
                      </a>
                      <button
                        className="icon-button"
                        aria-label={`Hapus ${item.title} dari tersimpan`}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            bookmarks: d.bookmarks.filter((b) => b !== item.id),
                          }))
                        }
                      >
                        <X size={18} />
                      </button>
                    </article>
                  ))}
                </div>
                {!savedItems.length && (
                  <Empty
                    title="Belum ada yang disimpan"
                    description="Gunakan ikon simpan di Kabar Soedirman atau Ruang Belajar."
                  />
                )}
              </div>
            </>
          ) : ActivePage && activeApp ? (
            <>
              <a className="back-link" href="#/apps">
                <ArrowLeft size={16} />
                Kembali ke semua aplikasi
              </a>
              <div className="app-page-intro">
                <span className={`app-icon ${activeApp.color}`}>
                  <activeApp.icon size={28} />
                </span>
                <div>
                  <h1>{activeApp.name}</h1>
                  <p>{activeApp.description}</p>
                </div>
                <button
                  className="button subtle"
                  onClick={() => setModal("switcher")}
                >
                  <Grid2X2 size={17} />
                  Ganti aplikasi
                </button>
              </div>
              <ActivePage key={`${activeApp.id}-${role}-${route}`} {...props} />
            </>
          ) : (
            <Empty
              title="Halaman tidak ditemukan"
              description="Kembali ke Beranda melalui navigasi portal."
            />
          )}
          <footer className="footer">
            <span>© {new Date().getFullYear()} Soedirman Portal · P3MD</span>
            <span>Dibangun untuk kebersamaan.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Tutup pemberitahuan"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal === "favorites" && (
        <Modal title="Atur aplikasi favorit" onClose={() => setModal(null)}>
          <p className="muted">
            Pilih hingga 8 aplikasi untuk beranda. Perubahan langsung tersimpan.
          </p>
          <div className="favorite-picker">
            {apps.map((a) => {
              const Icon = a.icon;
              const selected = data.favorites.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={selected ? "selected" : ""}
                  aria-pressed={selected}
                  onClick={() => toggleFavorite(a.id)}
                >
                  <span className={`app-icon ${a.color}`}>
                    <Icon size={22} />
                  </span>
                  <span>{a.name}</span>
                  <span className="selection-check">
                    {selected && <Check size={15} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="form-footer">
            <span className="muted">
              {data.favorites.length} / 8 aplikasi dipilih
            </span>
            <button className="button primary" onClick={() => setModal(null)}>
              Selesai
            </button>
          </div>
        </Modal>
      )}
      {modal === "switcher" && (
        <Modal title="Buka aplikasi" onClose={() => setModal(null)}>
          <div className="switcher-grid">
            {apps.map((a) => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => navigate(`app/${a.id}`)}>
                  <span className={`app-icon ${a.color}`}>
                    <Icon size={25} />
                  </span>
                  <strong>{a.name}</strong>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="Profil dan akses" onClose={() => setModal(null)}>
          <div className="profile-detail">
            <Avatar name={currentPerson.name} />
            <h2>{currentPerson.name}</h2>
            <p>
              {currentPerson.number} · {currentPerson.group} ·{" "}
              {currentPerson.element}
            </p>
            <Badge>{roleLabels[role]}</Badge>
          </div>
          <p className="muted">
            Pilihan peran untuk mencoba prototipe. Akun dan autentikasi nyata
            belum terhubung.
          </p>
          <label className="field">
            <span>Peran aktif</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {Object.entries(roleLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Cakupan:{" "}
            {policies[role].scope === "self"
              ? "data pribadi"
              : policies[role].scope === "element"
                ? currentPerson.element
                : policies[role].scope === "group"
                  ? currentPerson.group
                  : "seluruh serdik sesuai kewenangan"}
            .
          </p>
          <button className="button subtle" onClick={() => setModal("reset")}>
            <Settings2 size={17} />
            Pulihkan data contoh
          </button>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="Pulihkan data contoh?" onClose={() => setModal(null)}>
          <p>
            Semua perubahan prototipe di browser ini akan diganti dengan data
            contoh awal, termasuk pengajuan, project, dan favorit.
          </p>
          <div className="form-footer">
            <button className="button subtle" onClick={() => setModal(null)}>
              Batal
            </button>
            <button
              className="button primary"
              onClick={() => {
                setData(createSeed());
                setModal(null);
                notify("Data contoh dipulihkan.");
              }}
            >
              Pulihkan data
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Selamat datang di Soedirman Portal"
          onClose={() => setModal(null)}
        >
          <div className="help-step">
            <LayoutGrid size={23} />
            <div>
              <h3>Buka layanan sebagai aplikasi</h3>
              <p>
                Pilih aplikasi dari beranda, katalog, atau peluncur di bagian
                atas portal.
              </p>
            </div>
          </div>
          <div className="help-step">
            <Bookmark size={23} />
            <div>
              <h3>Sesuaikan ruangmu</h3>
              <p>
                Pilih aplikasi favorit dan simpan informasi atau materi untuk
                nanti.
              </p>
            </div>
          </div>
          <div className="help-step">
            <ShieldCheck size={23} />
            <div>
              <h3>Coba akses sesuai peran</h3>
              <p>
                Gunakan pilihan peran aktif untuk mencoba akses serdik, pejabat,
                dan pengasuh.
              </p>
            </div>
          </div>
          <div className="notice">
            Ini prototipe lokal. Data contoh tersimpan di browser ini dan belum
            disinkronkan antarperangkat.
          </div>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Tindakan dan notifikasi" onClose={() => setModal(null)}>
          {actions.map((action) => (
            <div className="notification-record" key={action.id}>
              <span className={"app-icon " + action.tone}>
                <Clock3 size={23} />
              </span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <button
                  className="text-button"
                  onClick={() => navigate(action.href.replace(/^#\//, ""))}
                >
                  Buka layanan
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
          {!actions.length && (
            <p className="muted">Tidak ada tindakan tertunda.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
