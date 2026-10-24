"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, RoleBadge, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithProfile, MiniProfile, Role } from "@/lib/types";
import { displayName, formatDate } from "@/lib/utils";

export function MembersPanel({
  projectId,
  members,
  past,
  meId,
  myRole,
}: {
  projectId: string;
  members: MemberWithProfile[];
  past: MemberWithProfile[];
  meId: string;
  myRole: Role;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MiniProfile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const isOwner = myRole === "owner";
  const isManager = myRole !== "member";
  const refresh = () => startTransition(() => router.refresh());

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) return setResults([]);
    const { data } = await createClient()
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q.trim().replace(/[%,()]/g, "")}%,display_name.ilike.%${q.trim().replace(/[%,()]/g, "")}%`)
      .limit(8);
    setResults(((data ?? []) as MiniProfile[]).filter((p) => !members.some((m) => m.user_id === p.id)));
  }

  async function add(p: MiniProfile) {
    setErr(null);
    const { error } = await createClient()
      .from("project_members")
      .upsert({ project_id: projectId, user_id: p.id, left_at: null }, { onConflict: "project_id,user_id" });
    if (error) return setErr(error.message);
    setQuery("");
    setResults([]);
    refresh();
  }

  async function setRole(m: MemberWithProfile, role: Role) {
    setErr(null);
    const { error } = await createClient()
      .from("project_members")
      .update({ role })
      .eq("project_id", projectId)
      .eq("user_id", m.user_id);
    if (error) return setErr(error.message);
    refresh();
  }

  async function removeMember(m: MemberWithProfile) {
    const self = m.user_id === meId;
    if (!confirm(self ? "Rời khỏi dự án này?" : `Cho ${displayName(m.profile)} rời dự án?`)) return;
    setErr(null);
    const { error } = await createClient()
      .from("project_members")
      .update({ left_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("user_id", m.user_id);
    if (error) return setErr(error.message);
    if (self) {
      router.push("/projects");
      router.refresh();
    } else refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <SectionTitle>Thành viên ({members.length})</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-smoke">
          Owner tạo dự án → bổ nhiệm Managers (tuỳ) → Owner/Managers giao việc → Members nhận thông báo & đánh dấu tiến độ.
        </p>
        {err && <p className="sketch mb-3 bg-white px-3 py-2 text-sm text-danger">⚠ {err}</p>}
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="box flex flex-wrap items-center gap-3 p-3">
              <Avatar profile={m.profile} size={40} />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${m.profile.username}`} className="font-semibold hover:underline">
                  {displayName(m.profile)}
                </Link>
                <p className="text-xs text-smoke">
                  @{m.profile.username} · vào từ {formatDate(m.joined_at, true)}
                </p>
              </div>
              <RoleBadge role={m.role} />
              <div className="flex gap-1">
                {isOwner && m.role === "member" && (
                  <button className="btn btn-sm" onClick={() => setRole(m, "manager")}>
                    ↑ Bổ nhiệm Manager
                  </button>
                )}
                {isOwner && m.role === "manager" && (
                  <button className="btn btn-sm" onClick={() => setRole(m, "member")}>
                    ↓ Về Member
                  </button>
                )}
                {m.role !== "owner" && (m.user_id === meId || (isManager && (isOwner || m.role === "member"))) && (
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => removeMember(m)}>
                    {m.user_id === meId ? "Rời dự án" : "Mời ra"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {past.length > 0 && (
          <>
            <p className="h-hand mt-6 text-xl text-smoke">Đã từng tham gia</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {past.map((m) => (
                <li key={m.user_id} className="chip gap-1.5 bg-white py-1 opacity-70">
                  <Avatar profile={m.profile} size={18} />
                  {displayName(m.profile)}
                  {isManager && (
                    <button className="ml-1 underline" onClick={() => add(m.profile)}>
                      mời lại
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {isManager && (
        <aside className="box h-fit p-4">
          <p className="h-hand text-2xl">Thêm thành viên</p>
          <p className="mb-2 text-xs text-smoke">Tìm theo username hoặc tên. Người được thêm sẽ nhận thông báo.</p>
          <input className="input" value={query} onChange={(e) => search(e.target.value)} placeholder="@username" />
          <ul className="mt-2 space-y-1">
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-fog">
                <Avatar profile={p} size={26} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold">{displayName(p)}</p>
                  <p className="text-xs text-smoke">@{p.username}</p>
                </div>
                <button className="btn btn-sm" onClick={() => add(p)}>
                  + Thêm
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && results.length === 0 && <li className="p-2 text-xs text-smoke">Không thấy ai.</li>}
          </ul>
        </aside>
      )}
    </div>
  );
}
