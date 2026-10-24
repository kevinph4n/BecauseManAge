import { loadProject } from "@/lib/project-data";
import type { ChatChannel } from "@/lib/types";
import { ProjectChat } from "@/components/projects/project-chat";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadProject(id);
  const { data } = await ctx.supabase.from("chat_channels").select("*").eq("project_id", id).order("created_at");
  const channels = (data ?? []) as ChatChannel[];
  const customIds = channels.filter((c) => c.kind === "custom").map((c) => c.id);
  const { data: cm } = customIds.length
    ? await ctx.supabase.from("chat_channel_members").select("channel_id, user_id").in("channel_id", customIds)
    : { data: [] };

  return (
    <ProjectChat
      projectId={id}
      channels={channels}
      channelMembers={(cm ?? []) as { channel_id: string; user_id: string }[]}
      members={ctx.members}
      meId={ctx.user.id}
      myRole={ctx.myRole ?? "member"}
    />
  );
}
