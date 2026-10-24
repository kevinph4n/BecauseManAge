import { loadProject } from "@/lib/project-data";
import { ProjectSettings } from "@/components/projects/project-settings";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data: fields } = await ctx.supabase.from("fields").select("*").order("position");
  return (
    <ProjectSettings
      project={ctx.project}
      labels={ctx.labels}
      fields={(fields ?? []) as { id: string; label: string }[]}
      isManager={ctx.isManager}
      isOwner={ctx.myRole === "owner"}
    />
  );
}
