import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data";
import type { Mindmap } from "@/lib/types";
import { MindmapEditor } from "@/components/notes/mindmap-editor";

export default async function MindmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("mindmaps").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  // dự án đang tham gia → để trích xuất note sang
  const { data: mem } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)
    .is("left_at", null);
  const ids = (mem ?? []).map((m: { project_id: string }) => m.project_id);
  const { data: projects } = ids.length
    ? await supabase.from("projects").select("id, name").in("id", ids).order("updated_at", { ascending: false })
    : { data: [] };

  return <MindmapEditor initial={data as Mindmap} projects={(projects ?? []) as { id: string; name: string }[]} />;
}
