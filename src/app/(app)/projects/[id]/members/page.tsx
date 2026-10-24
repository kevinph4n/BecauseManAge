import { loadProject } from "@/lib/project-data";
import { fetchMembers } from "@/lib/data";
import { MembersPanel } from "@/components/projects/members-panel";

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const all = await fetchMembers(ctx.supabase, id, true);
  return (
    <MembersPanel
      projectId={id}
      members={ctx.members}
      past={all.filter((m) => m.left_at)}
      meId={ctx.user.id}
      myRole={ctx.myRole ?? "member"}
    />
  );
}
