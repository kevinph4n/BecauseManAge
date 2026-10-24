import { loadProject } from "@/lib/project-data";
import type { MemberNote, NoteRead } from "@/lib/types";
import { ProjectNotes } from "@/components/projects/project-notes";
import { fetchProfilesByIds } from "@/lib/data";

export default async function NotesTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data } = await ctx.supabase
    .from("member_notes")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  const notes = (data ?? []) as MemberNote[];
  const { data: reads } = notes.length
    ? await ctx.supabase.from("note_reads").select("*").in("note_id", notes.map((n) => n.id))
    : { data: [] };
  // profile của cả người đã rời dự án
  const profiles = await fetchProfilesByIds(ctx.supabase, [
    ...notes.map((n) => n.author_id),
    ...((reads ?? []) as NoteRead[]).map((r) => r.user_id),
  ]);

  return (
    <ProjectNotes
      projectId={id}
      notes={notes}
      reads={(reads ?? []) as NoteRead[]}
      profiles={profiles}
      meId={ctx.user.id}
      isManager={ctx.isManager}
    />
  );
}
