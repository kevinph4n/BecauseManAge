import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchMembers, requireUser } from "./data";
import { computeProgress } from "./progress";
import type { Milestone, MilestoneMark, Project, ProjectLabel, Role } from "./types";

/**
 * Dữ liệu chung của 1 dự án — dùng ở layout + các tab.
 * `cache` giúp layout và page trong cùng request chỉ query 1 lần.
 */
export const loadProject = cache(async (projectId: string) => {
  const { supabase, user, profile } = await requireUser();

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) notFound();

  const [members, { data: milestones }, { data: labels }] = await Promise.all([
    fetchMembers(supabase, projectId),
    supabase.from("milestones").select("*").eq("project_id", projectId),
    supabase.from("project_labels").select("*").eq("project_id", projectId),
  ]);

  const msList = (milestones ?? []) as Milestone[];
  const { data: marks } = msList.length
    ? await supabase
        .from("milestone_marks")
        .select("*")
        .in(
          "milestone_id",
          msList.map((m) => m.id),
        )
    : { data: [] };

  const me = members.find((m) => m.user_id === user.id);
  const myRole: Role | null = me?.role ?? null;
  const markList = (marks ?? []) as MilestoneMark[];

  return {
    supabase,
    user,
    profile,
    project: project as Project,
    members,
    myRole,
    isManager: myRole === "owner" || myRole === "manager",
    milestones: msList,
    marks: markList,
    labels: (labels ?? []) as ProjectLabel[],
    progress: computeProgress(msList, markList),
  };
});

export type ProjectContext = Awaited<ReturnType<typeof loadProject>>;
