"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Commit, MiniProfile } from "@/lib/types";
import { cn, displayName, formatDateTime, shortHash, timeAgo } from "@/lib/utils";

const KIND_TAG: Record<Commit["kind"], string> = {
  manual: "commit",
  milestone: "milestone",
  task: "task",
  note: "note",
  project: "init",
};

export function CommitLog({
  projectId,
  commits,
  profiles,
  meId,
}: {
  projectId: string;
  commits: Commit[];
  profiles: Record<string, MiniProfile>;
  meId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [who, setWho] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, number>();
    commits.forEach((c) => map.set(c.user_id, (map.get(c.user_id) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [commits]);
  const max = stats[0]?.[1] ?? 1;
  const shown = who ? commits.filter((c) => c.user_id === who) : commits;

  async function commit() {
    const message = msg.trim();
    if (!message) return;
    const { error } = await createClient().from("commits").insert({ project_id: projectId, message, kind: "manual", user_id: meId });
    if (error) return setErr(error.message);
    setMsg("");
    setErr(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="box flex items-center gap-2 bg-ink! p-2 font-mono text-sm text-paper">
          <span className="pl-2 text-ms-2">$</span>
          <span className="hidden sm:inline">git commit -m</span>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="min-w-0 flex-1 bg-transparent text-paper placeholder:text-paper/40 outline-none"
            placeholder='"fix: chốt xong layout trang chủ"'
          />
          <button className="btn btn-sm" onClick={commit}>
            commit
          </button>
        </div>
        {err && <p className="text-sm text-danger">⚠ {err}</p>}

        <ol className="box divide-y divide-line p-0! font-mono text-sm">
          {shown.length === 0 && <li className="p-4 text-smoke">nothing to commit, working tree clean</li>}
          {shown.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 shrink-0 text-xs text-smoke">{shortHash(c.id)}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words">
                  <span className={cn("mr-2 rounded border border-ink px-1 text-[10px]", c.kind === "manual" ? "bg-ink text-white" : "bg-white")}>
                    {KIND_TAG[c.kind]}
                  </span>
                  {c.message}
                </p>
                <p className="mt-0.5 font-sans text-xs text-smoke" title={formatDateTime(c.created_at)}>
                  <Avatar profile={profiles[c.user_id]} size={14} className="mr-1 align-[-2px]" />
                  {displayName(profiles[c.user_id])} committed {timeAgo(c.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <aside className="space-y-2">
        <p className="h-hand text-2xl">Contributors</p>
        <button className={cn("chip py-1", !who ? "bg-ink text-white" : "bg-white")} onClick={() => setWho(null)}>
          Tất cả ({commits.length})
        </button>
        {stats.map(([uid, n]) => (
          <button
            key={uid}
            onClick={() => setWho(uid)}
            className={cn("box block w-full p-2 text-left", who === uid && "shadow-sketch")}
          >
            <div className="flex items-center gap-2 text-sm">
              <Avatar profile={profiles[uid]} size={22} />
              <span className="flex-1 truncate font-semibold">{displayName(profiles[uid])}</span>
              <span className="font-mono text-xs">{n}</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-fog">
              <div className="h-full bg-ink" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </button>
        ))}
      </aside>
    </div>
  );
}
