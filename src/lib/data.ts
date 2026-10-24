import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberWithProfile, MiniProfile, Profile, ProjectMember } from "./types";

/** Lấy user + profile hiện tại (server). Không có → về /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: profile as Profile | null };
}

export const MINI_PROFILE = "id, username, display_name, avatar_url";

export async function fetchProfilesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null | undefined)[],
): Promise<Record<string, MiniProfile>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return {};
  const { data } = await supabase.from("profiles").select(MINI_PROFILE).in("id", unique);
  const map: Record<string, MiniProfile> = {};
  for (const p of (data ?? []) as MiniProfile[]) map[p.id] = p;
  return map;
}

/** Thành viên (đang tham gia) của 1 dự án kèm profile */
export async function fetchMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  includeLeft = false,
): Promise<MemberWithProfile[]> {
  let q = supabase.from("project_members").select("*").eq("project_id", projectId);
  if (!includeLeft) q = q.is("left_at", null);
  const { data } = await q;
  const rows = (data ?? []) as ProjectMember[];
  const profiles = await fetchProfilesByIds(
    supabase,
    rows.map((r) => r.user_id),
  );
  const order = { owner: 0, manager: 1, member: 2 } as const;
  return rows
    .map((r) => ({
      ...r,
      profile: profiles[r.user_id] ?? { id: r.user_id, username: "unknown", display_name: null, avatar_url: null },
    }))
    .sort((a, b) => order[a.role] - order[b.role] || a.joined_at.localeCompare(b.joined_at));
}
