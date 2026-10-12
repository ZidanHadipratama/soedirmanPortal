import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  MessageSquareHeart,
  Network,
  Camera,
  Shirt,
} from "lucide-react";
import { localDate, visibleEvent } from "./model";
import { activityHref, homeActions } from "./operations";
import { Badge, SectionTitle } from "./ui";
import type { PageProps } from "./workflows";

const icons = {
  attendance: ClipboardList,
  leave: FileCheck2,
  aspiration: MessageSquareHeart,
  project: Network,
  documentation: Camera,
};
export function HomeActions({ data, role }: Pick<PageProps, "data" | "role">) {
  const actions = homeActions(data, role);
  return (
    <section className="home-actions">
      <SectionTitle
        title="Langkah hari ini"
        subtitle="Tindakan yang relevan dengan tugas dan cakupanmu."
      />
      <div className="home-action-grid">
        {actions.map((action) => {
          const Icon = icons[action.id as keyof typeof icons] ?? CalendarDays;
          return (
            <a className="home-action" href={action.href} key={action.id}>
              <span className={"action-icon " + action.tone}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          );
        })}
      </div>
      {!actions.length && (
        <div className="actions-clear">
          <Badge tone="success">Tidak ada tindakan tertunda</Badge>
          <p>Lihat Agenda untuk menyiapkan kegiatan berikutnya.</p>
        </div>
      )}
    </section>
  );
}
export function NextActivityCard({
  data,
  role,
}: Pick<PageProps, "data" | "role">) {
  const now = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const activities = data.events
    .filter(
      (e) => !e.archived && e.date === localDate() && visibleEvent(role, e),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const activity = activities.find((e) => e.end >= now) ?? activities.at(-1);
  if (!activity)
    return (
      <div className="next-activity-card">
        <CalendarDays size={22} />
        <h3>Belum ada kegiatan hari ini</h3>
        <a className="text-button" href="#/app/schedule">
          Lihat Agenda
          <ArrowRight size={15} />
        </a>
      </div>
    );
  return (
    <div className="next-activity-card">
      <div className="next-activity-top">
        <CalendarDays size={20} aria-hidden="true" />
        <span>
          {activity.end < now
            ? "Kegiatan terakhir hari ini"
            : "Siapkan kegiatan berikutnya"}
        </span>
      </div>
      <h3>{activity.title}</h3>
      <p>
        {activity.time} – {activity.end} WIB · {activity.location}
      </p>
      {activity.outfit && (
        <div className="outfit-note">
          <Shirt size={15} aria-hidden="true" />
          <span>{activity.outfit}</span>
        </div>
      )}
      <a className="text-button" href={activityHref("schedule", activity.id)}>
        Buka detail kegiatan
        <ArrowRight size={15} />
      </a>
    </div>
  );
}
