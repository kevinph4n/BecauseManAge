import Link from "next/link";
import { requireUser } from "@/lib/data";
import { computeProgress, groupMarks, milestoneState } from "@/lib/progress";
import type {
  Milestone,
  MilestoneMark,
  Mindmap,
  Notification,
  PersonalPriority,
  Project,
  ProjectMember,
  Task,
} from "@/lib/types";
import { ProgressBar } from "@/components/progress-bar";
import { EmptyState, SectionTitle } from "@/components/ui";
import { addDays, cn, diffDays, displayName, formatDate, parseDate, timeAgo, toISODate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, user, profile } = await requireUser();

  const { data: mems } = await supabase.from("project_members").select("*").eq("user_id", user.id).is("left_at", null);
  const ids = ((mems ?? []) as ProjectMember[]).map((m) => m.project_id);
  const none = Promise.resolve({ data: [] });
  const weekAgo = addDays(new Date(), -7).toISOString();

  const [
    { data: projects },
    { data: milestones },
    { data: myTasks },
    { data: notifs },
    { data: prios },
    { data: maps },
    { count: weekCommits },
  ] = await Promise.all([
    ids.length ? supabase.from("projects").select("*").in("id", ids).order("updated_at", { ascending: false }) : none,
    ids.length ? supabase.from("milestones").select("*").in("project_id", ids) : none,
    supabase.from("tasks").select("*").eq("assignee_id", user.id).neq("status", "done"),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("personal_priorities").select("*").eq("user_id", user.id).eq("priority", "high"),
    supabase.from("mindmaps").select("id, title, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(4),
    supabase.from("commits").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekAgo),
  ]);

  const msList = (milestones ?? []) as Milestone[];
  const { data: marks } = msList.length
    ? await supabase.from("milestone_marks").select("*").in("milestone_id", msList.map((m) => m.id))
    : { data: [] };
  const markList = (marks ?? []) as MilestoneMark[];
  const byMs = groupMarks(markList);
  const projectList = (projects ?? []) as Project[];
  const projectName = (id: string) => projectList.find((p) => p.id === id)?.name ?? "";
  const tasks = (myTasks ?? []) as Task[];

  // deadline 14 ngày tới (+ quá hạn)
  const today = new Date();
  const horizon = toISODate(addDays(today, 14));
  type Due = { key: string; date: string; title: string; project: string; href: string; kind: "task" | "milestone" };
  const dues: Due[] = [
    ...tasks
      .filter((t) => t.due_date && t.due_date <= horizon)
      .map((t) => ({
        key: `t${t.id}`,
        date: t.due_date!,
        title: t.title,
        project: projectName(t.project_id),
        href: `/projects/${t.project_id}/tasks`,
        kind: "task" as const,
      })),
    ...msList
      .filter((m) => m.due_date && m.due_date <= horizon && milestoneState(byMs.get(m.id) ?? []) !== "completed")
      .map((m) => ({
        key: `m${m.id}`,
        date: m.due_date!,
        title: m.title,
        project: projectName(m.project_id),
        href: `/projects/${m.project_id}`,
        kind: "milestone" as const,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const highs = (prios ?? []) as PersonalPriority[];
  const highTasks = tasks.filter((t) => highs.some((h) => h.task_id === t.id));
  const highMs = msList.filter(
    (m) => highs.some((h) => h.milestone_id === m.id) && milestoneState(byMs.get(m.id) ?? []) !== "completed",
  );

  const hour = new Date().getHours();
  const greet = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="space-y-8">
      <header>
        <p className="h-hand text-xl text-smoke">{greet},</p>
        <h1 className="h-hand text-5xl leading-tight">{displayName(profile)} 👋</h1>
        <p className="mt-1 text-smoke">Con người rồi sẽ già đi — hôm nay làm gì cho tử tế?</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox n={projectList.length} label="dự án đang chạy" href="/projects" />
        <StatBox n={tasks.length} label="việc đang mở của bạn" />
        <StatBox n={weekCommits ?? 0} label="commits 7 ngày qua" href={profile ? `/u/${profile.username}` : undefined} />
        <StatBox n={dues.length} label="deadline 14 ngày tới" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section>
            <SectionTitle right={<Link href="/projects" className="text-sm underline">tất cả</Link>}>Dự án</SectionTitle>
            {projectList.length === 0 ? (
              <EmptyState title="Chưa có dự án">
                <Link href="/projects" className="underline">Tạo dự án đầu tiên →</Link>
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {projectList.slice(0, 5).map((p) => {
                  const ms = msList.filter((m) => m.project_id === p.id);
                  const set = new Set(ms.map((m) => m.id));
                  const prog = computeProgress(ms, markList.filter((k) => set.has(k.milestone_id)));
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`} className="box block p-4 transition hover:shadow-sketch">
                      <p className="h-hand mb-2 text-2xl">{p.name}</p>
                      <ProgressBar progress={prog} size="sm" showLegend={false} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Sắp tới hạn</SectionTitle>
            {dues.length === 0 ? (
              <p className="text-sm text-smoke">Không có deadline nào trong 14 ngày tới. Thở đi 🌿</p>
            ) : (
              <ul className="box divide-y divide-line p-0!">
                {dues.map((d) => {
                  const left = diffDays(parseDate(d.date), today);
                  return (
                    <li key={d.key}>
                      <Link href={d.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-fog">
                        <span className="w-4">{d.kind === "task" ? "■" : "◆"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{d.title}</span>
                          <span className="text-xs text-smoke">{d.project}</span>
                        </span>
                        <span className={cn("chip", left < 0 ? "bg-ink text-white" : left <= 2 ? "bg-fog" : "bg-white")}>
                          {left < 0 ? `quá ${-left} ngày` : left === 0 ? "hôm nay" : `${left} ngày · ${formatDate(d.date)}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="box p-4">
            <p className="h-hand text-2xl">🔒 High priority của bạn</p>
            <p className="mb-2 text-xs text-smoke">Chỉ mình bạn thấy.</p>
            {highTasks.length + highMs.length === 0 ? (
              <p className="text-sm text-smoke">Chưa đánh dấu gì là High.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {highMs.map((m) => (
                  <li key={m.id}>
                    <Link href={`/projects/${m.project_id}`} className="hover:underline">
                      ◆ {m.title} <span className="text-xs text-smoke">· {projectName(m.project_id)}</span>
                    </Link>
                  </li>
                ))}
                {highTasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/projects/${t.project_id}/tasks`} className="hover:underline">
                      ■ {t.title} <span className="text-xs text-smoke">· {projectName(t.project_id)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="box p-4">
            <div className="flex items-center justify-between">
              <p className="h-hand text-2xl">Thông báo</p>
              <Link href="/notifications" className="text-sm underline">
                tất cả
              </Link>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {((notifs ?? []) as Notification[]).map((n) => (
                <li key={n.id} className={cn(!n.read_at && "font-semibold")}>
                  <Link href={n.link ?? "/notifications"} className="hover:underline">
                    {!n.read_at && "• "}
                    {n.title}
                  </Link>
                  <p className="text-xs font-normal text-smoke">{timeAgo(n.created_at)}</p>
                </li>
              ))}
              {(notifs ?? []).length === 0 && <li className="text-smoke">Yên ắng.</li>}
            </ul>
          </section>

          <section className="box p-4">
            <div className="flex items-center justify-between">
              <p className="h-hand text-2xl">Notes gần đây</p>
              <Link href="/notes" className="text-sm underline">
                tất cả
              </Link>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {((maps ?? []) as Pick<Mindmap, "id" | "title" | "updated_at">[]).map((m) => (
                <li key={m.id}>
                  <Link href={`/notes/${m.id}`} className="hover:underline">
                    ✎ {m.title}
                  </Link>{" "}
                  <span className="text-xs text-smoke">{timeAgo(m.updated_at)}</span>
                </li>
              ))}
              {(maps ?? []).length === 0 && <li className="text-smoke">Chưa có bảng note.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatBox({ n, label, href }: { n: number; label: string; href?: string }) {
  const inner = (
    <>
      <p className="h-hand text-4xl">{n}</p>
      <p className="text-xs text-smoke">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="box block p-4 transition hover:shadow-sketch">
      {inner}
    </Link>
  ) : (
    <div className="box p-4">{inner}</div>
  );
}
