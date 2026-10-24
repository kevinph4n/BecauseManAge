import { loadProject } from "@/lib/project-data";
import { fetchProfilesByIds } from "@/lib/data";
import type { Commit } from "@/lib/types";
import { CommitLog } from "@/components/projects/commit-log";

export default async function CommitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data } = await ctx.supabase
    .from("commits")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(500);
  const commits = (data ?? []) as Commit[];
  const profiles = await fetchProfilesByIds(ctx.supabase, commits.map((c) => c.user_id));
  return <CommitLog projectId={id} commits={commits} profiles={profiles} meId={ctx.user.id} />;
}
