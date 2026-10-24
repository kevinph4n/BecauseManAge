import Link from "next/link";
import { requireUser } from "@/lib/data";
import { computeProgress } from "@/lib/progress";
import type { Milestone, MilestoneMark, Project, ProjectLabel, ProjectMember } from "@/lib/types";
import { EmptyState, Labels, PageHeader, RoleBadge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { CreateProjectButton } from "@/components/projects/create-project";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser();

  const { data: mems } = await supabase.from("project_members").select("*").eq("user_id", user.id);
  const memberships = (mems ?? []) as ProjectMember[];
  const activeIds = memberships.filter((m) => !m.left_at).map((m) => m.project_id);

  const [{ data: projects }, { data: milestones }, { data: labels }, { data: fields }] = await Promise.all([
    activeIds.length
      ? supabase.from("projects").select("*").in("id", activeIds).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    activeIds.length ? supabase.from("milestones").select("*").in("project_id", activeIds) : Promise.resolve({ data: [] }),
    activeIds.length ? supabase.from("project_labels").select("*").in("project_id", activeIds) : Promise.resolve({ data: [] }),
    supabase.from("fields").select("*").order("position"),
  ]);
  const msList = (milestones ?? []) as Milestone[];
  const { data: marks } = msList.length
    ? await supabase.from("milestone_marks").select("*").in("milestone_id", msList.map((m) => m.id))
    : { data: [] };
  const markList = (marks ?? []) as MilestoneMark[];
  const labelList = (labels ?? []) as ProjectLabel[];

  const list = (projects ?? []) as Project[];
  const past = memberships.filter((m) => m.left_at).length;

  return (
    <>
      <PageHeader
        title="Dự án"
        subtitle={`${list.length} đang tham gia · ${past} đã rời`}
        actions={<CreateProjectButton fields={(fields ?? []) as { id: string; label: string }[]} />}
      />
      {list.length === 0 ? (
        <EmptyState title="Chưa có dự án nào">Tạo dự án đầu tiên, đặt vài milestones và rủ team vào.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => {
            const ms = msList.filter((m) => m.project_id === p.id);
            const ids = new Set(ms.map((m) => m.id));
            const progress = computeProgress(
              ms,
              markList.filter((k) => ids.has(k.milestone_id)),
            );
            const role = memberships.find((m) => m.project_id === p.id)?.role ?? "member";
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="box block p-5 transition hover:shadow-sketch">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="h-hand text-3xl leading-tight">{p.name}</h3>
                  <RoleBadge role={role} />
                </div>
                <Labels labels={labelList.filter((l) => l.project_id === p.id)} className="mt-2" />
                {p.description && <p className="mt-2 line-clamp-2 text-sm text-smoke">{p.description}</p>}
                <div className="mt-4">
                  <ProgressBar progress={progress} size="sm" showLegend={false} />
                </div>
                <p className="mt-2 text-xs text-smoke">
                  {progress.done}/{progress.total} mốc · {progress.phases.length} phase
                  {p.end_date ? ` · hạn ${formatDate(p.end_date, true)}` : ""}
                  {p.status !== "active" ? ` · ${p.status}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
