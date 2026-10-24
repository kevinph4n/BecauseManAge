import { loadProject } from "@/lib/project-data";
import type { Task } from "@/lib/types";
import { Gantt } from "@/components/projects/gantt";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data } = await ctx.supabase.from("tasks").select("*").eq("project_id", id);
  return (
    <Gantt
      project={ctx.project}
      milestones={ctx.milestones}
      marks={ctx.marks}
      tasks={(data ?? []) as Task[]}
      members={ctx.members}
    />
  );
}
