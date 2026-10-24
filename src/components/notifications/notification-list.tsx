"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const ICON: Record<string, string> = {
  task_assigned: "■",
  task_flagged: "⚑",
  member_added: "＋",
  role_changed: "◆",
};

export function NotificationList({ initial, meId }: { initial: Notification[]; meId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);

  // realtime: thông báo mới tự hiện
  useEffect(() => {
    const ch = supabase
      .channel(`notif:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` },
        (payload: { new: Record<string, unknown> }) =>
          setItems((xs) => [payload.new as unknown as Notification, ...xs]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, meId]);

  async function readAll() {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", meId).is("read_at", null);
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at ?? now })));
    router.refresh();
  }

  async function open(n: Notification) {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    router.push(n.link ?? "/dashboard");
    router.refresh();
  }

  async function clearRead() {
    await supabase.from("notifications").delete().eq("user_id", meId).not("read_at", "is", null);
    setItems((xs) => xs.filter((x) => !x.read_at));
  }

  if (!items.length) return <EmptyState title="Không có thông báo nào" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button className="btn btn-sm" onClick={readAll}>
          Đánh dấu đã đọc hết
        </button>
        <button className="btn btn-ghost btn-sm" onClick={clearRead}>
          Xoá thông báo đã đọc
        </button>
      </div>
      <ul className="box divide-y divide-line p-0!">
        {items.map((n) => (
          <li key={n.id}>
            <button onClick={() => open(n)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-fog", !n.read_at && "bg-white")}>
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink", !n.read_at && "bg-ink text-white")}>
                {ICON[n.type] ?? "•"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block", !n.read_at && "font-semibold")}>{n.title}</span>
                {n.body && <span className="block text-sm text-smoke">{n.body}</span>}
                <span className="text-xs text-smoke">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/dashboard" className="block text-center text-sm underline">
        ← Dashboard
      </Link>
    </div>
  );
}
