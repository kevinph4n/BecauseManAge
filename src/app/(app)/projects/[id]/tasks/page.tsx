import { loadProject } from "@/lib/project-data";
import type { PersonalPriority, Task } from "@/lib/types";
import { TaskBoard } from "@/components/projects/task-board";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data } = await ctx.supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false });
  const tasks = (data ?? []) as Task[];
  const { data: prio } = tasks.length
    ? await ctx.supabase
        .from("personal_priorities")
        .select("*")
        .eq("user_id", ctx.user.id)
        .in(
          "task_id",
          tasks.map((t) => t.id),
        )
    : { data: [] };
  const priorities: Record<string, PersonalPriority["priority"]> = {};
  for (const p of (prio ?? []) as PersonalPriority[]) if (p.task_id) priorities[p.task_id] = p.priority;

  // cần profile của cả người đã rời dự án (vẫn có thể là người giao/nhận cũ)
  return (
    <TaskBoard
      projectId={id}
      tasks={tasks}
      milestones={ctx.milestones}
      members={ctx.members}
      meId={ctx.user.id}
      isManager={ctx.isManager}
      priorities={priorities}
    />
  );
}
