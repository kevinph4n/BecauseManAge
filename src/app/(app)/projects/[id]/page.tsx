import { loadProject } from "@/lib/project-data";
import type { PersonalPriority } from "@/lib/types";
import { MilestonesBoard } from "@/components/projects/milestones-board";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data: prio } = ctx.milestones.length
    ? await ctx.supabase
        .from("personal_priorities")
        .select("*")
        .eq("user_id", ctx.user.id)
        .in(
          "milestone_id",
          ctx.milestones.map((m) => m.id),
        )
    : { data: [] };

  const priorities: Record<string, PersonalPriority["priority"]> = {};
  for (const p of (prio ?? []) as PersonalPriority[]) if (p.milestone_id) priorities[p.milestone_id] = p.priority;

  return (
    <MilestonesBoard
      projectId={id}
      milestones={ctx.milestones}
      marks={ctx.marks}
      members={ctx.members}
      meId={ctx.user.id}
      isManager={ctx.isManager}
      priorities={priorities}
    />
  );
}
