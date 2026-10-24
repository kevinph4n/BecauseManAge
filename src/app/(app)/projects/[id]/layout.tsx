import Link from "next/link";
import { loadProject } from "@/lib/project-data";
import { Labels, RoleBadge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { formatDate } from "@/lib/utils";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { project, myRole, labels, progress, members } = ctx;

  return (
    <div>
      <div className="mb-2 text-sm">
        <Link href="/projects" className="text-smoke hover:text-ink">
          ← Dự án
        </Link>
      </div>
      <div className="box shadow-sketch mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="h-hand text-4xl leading-tight break-words">{project.name}</h1>
            <Labels labels={labels} className="mt-2" />
            {project.description && <p className="mt-2 max-w-3xl text-sm text-smoke">{project.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-smoke">
            {myRole && <RoleBadge role={myRole} />}
            <span>{members.length} thành viên</span>
            {project.end_date && <span>Hạn: {formatDate(project.end_date, true)}</span>}
            {project.status !== "active" && <span className="chip bg-fog">{project.status}</span>}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar progress={progress} />
        </div>
      </div>
      <ProjectTabs projectId={project.id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
