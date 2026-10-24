import { loadProject } from "@/lib/project-data";
import type { ProjectEvent, Task } from "@/lib/types";
import { ProjectCalendar } from "@/components/projects/project-calendar";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const [{ data: tasks }, { data: events }] = await Promise.all([
    ctx.supabase.from("tasks").select("*").eq("project_id", id),
    ctx.supabase.from("project_events").select("*").eq("project_id", id).order("starts_at"),
  ]);
  return (
    <ProjectCalendar
      projectId={id}
      project={ctx.project}
      milestones={ctx.milestones}
      tasks={(tasks ?? []) as Task[]}
      events={(events ?? []) as ProjectEvent[]}
      members={ctx.members}
      meId={ctx.user.id}
      isManager={ctx.isManager}
    />
  );
}
