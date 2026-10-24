"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Modal } from "@/components/modal";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ChatChannel, ChatMessage, MemberWithProfile, Role } from "@/lib/types";
import { cn, displayName, formatDateTime } from "@/lib/utils";

const KIND_META: Record<ChatChannel["kind"], { no: number; label: string; desc: string }> = {
  all: { no: 1, label: "Toàn dự án", desc: "Tất cả thành viên" },
  members: { no: 2, label: "Members", desc: "Chỉ Members (không có Owner/Manager)" },
  custom: { no: 3, label: "Tuỳ chọn", desc: "Do Owner/Manager sắp xếp" },
  management: { no: 4, label: "Quản lý", desc: "Owner + Managers" },
};

export function ProjectChat({
  projectId,
  channels,
  channelMembers,
  members,
  meId,
  myRole,
}: {
  projectId: string;
  channels: ChatChannel[];
  channelMembers: { channel_id: string; user_id: string }[];
  members: MemberWithProfile[];
  meId: string;
  myRole: Role;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isManager = myRole !== "member";

  const canRead = (c: ChatChannel) =>
    c.kind === "all" ||
    (c.kind === "members" && myRole === "member") ||
    (c.kind === "management" && isManager) ||
    (c.kind === "custom" && channelMembers.some((m) => m.channel_id === c.id && m.user_id === meId));

  const sorted = [...channels].sort((a, b) => KIND_META[a.kind].no - KIND_META[b.kind].no);
  const [activeId, setActiveId] = useState<string | null>(sorted.find(canRead)?.id ?? null);
  const active = channels.find((c) => c.id === activeId) ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // load + realtime
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", activeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      setMessages(((data ?? []) as ChatMessage[]).reverse());
      setLoading(false);
    })();

    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeId}` },
        (payload: { new: Record<string, unknown> }) => {
          const msg = payload.new as unknown as ChatMessage;
          setMessages((ms) => (ms.some((m) => m.id === msg.id) ? ms : [...ms, msg]));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [activeId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  async function send() {
    const body = text.trim();
    if (!body || !activeId) return;
    setText("");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: activeId, sender_id: meId, body })
      .select("*")
      .single();
    if (!error && data) setMessages((ms) => (ms.some((m) => m.id === data.id) ? ms : [...ms, data as ChatMessage]));
    if (error) setText(body);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  async function deleteChannel(c: ChatChannel) {
    if (!confirm(`Xoá kênh #${c.name}?`)) return;
    await supabase.from("chat_channels").delete().eq("id", c.id);
    if (activeId === c.id) setActiveId(null);
    router.refresh();
  }

  const profileOf = (id: string) => members.find((m) => m.user_id === id)?.profile;
  const membersOf = (c: ChatChannel) => {
    if (c.kind === "all") return members;
    if (c.kind === "members") return members.filter((m) => m.role === "member");
    if (c.kind === "management") return members.filter((m) => m.role !== "member");
    return members.filter((m) => channelMembers.some((x) => x.channel_id === c.id && x.user_id === m.user_id));
  };

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* channel list */}
      <aside className="box h-fit p-2">
        {sorted.map((c) => {
          const ok = canRead(c);
          return (
            <div key={c.id} className="group flex items-center">
              <button
                disabled={!ok}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex-1 rounded px-2 py-2 text-left",
                  activeId === c.id ? "bg-ink text-white" : "hover:bg-fog",
                  !ok && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] opacity-60">Chat {KIND_META[c.kind].no}</span>
                  <span className="font-semibold">#{c.name}</span>
                  {!ok && <span>🔒</span>}
                </div>
                <p className={cn("text-[11px]", activeId === c.id ? "opacity-70" : "text-smoke")}>{KIND_META[c.kind].desc}</p>
              </button>
              {c.kind === "custom" && isManager && (
                <button className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100" onClick={() => deleteChannel(c)} title="Xoá kênh">
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {myRole !== "member" && (
          <p className="px-2 pt-2 text-[11px] text-smoke">Kênh “members” là không gian riêng của Members — Owner/Manager không đọc được.</p>
        )}
        {isManager && (
          <button className="btn btn-sm mt-3 w-full" onClick={() => setCreateOpen(true)}>
            + Kênh tuỳ chọn
          </button>
        )}
      </aside>

      {/* messages */}
      <section className="box flex h-[65vh] min-h-96 flex-col p-0!">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b-[1.5px] border-ink px-4 py-2">
              <div>
                <p className="h-hand text-xl">#{active.name}</p>
                <p className="text-xs text-smoke">
                  Chat {KIND_META[active.kind].no} · {KIND_META[active.kind].label}
                </p>
              </div>
              <div className="ml-auto flex -space-x-2">
                {membersOf(active)
                  .slice(0, 8)
                  .map((m) => (
                    <Avatar key={m.user_id} profile={m.profile} size={26} />
                  ))}
              </div>
            </header>
            <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {loading && <p className="text-sm text-smoke">Đang tải…</p>}
              {!loading && messages.length === 0 && <p className="h-hand text-xl text-smoke">Chưa ai nói gì. Phá băng đi 👋</p>}
              {messages.map((m, i) => {
                const mine = m.sender_id === meId;
                const prev = messages[i - 1];
                const grouped = prev && prev.sender_id === m.sender_id;
                return (
                  <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                    <div className="w-7 shrink-0">{!grouped && <Avatar profile={profileOf(m.sender_id)} size={28} />}</div>
                    <div className={cn("max-w-[75%]", mine && "text-right")}>
                      {!grouped && (
                        <p className="text-[11px] text-smoke">
                          <b className="text-ink">{displayName(profileOf(m.sender_id))}</b> · {formatDateTime(m.created_at)}
                        </p>
                      )}
                      <div
                        className={cn(
                          "sketch mt-0.5 inline-block px-3 py-1.5 text-left text-sm whitespace-pre-wrap break-words",
                          mine ? "bg-ink text-white" : "bg-white",
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <footer className="flex gap-2 border-t-[1.5px] border-ink p-2">
              <textarea
                className="input min-h-10 flex-1 resize-none"
                rows={1}
                placeholder={`Nhắn #${active.name}… (Enter gửi, Shift+Enter xuống dòng)`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
              />
              <button className="btn btn-primary" onClick={send}>
                Gửi
              </button>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-smoke">Chọn một kênh bạn có quyền đọc.</div>
        )}
      </section>

      <CreateChannelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        members={members}
        meId={meId}
        onCreated={(id) => {
          setActiveId(id);
          router.refresh();
        }}
      />
    </div>
  );
}

function CreateChannelModal({
  open,
  onClose,
  projectId,
  members,
  meId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: MemberWithProfile[];
  meId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return setErr("Đặt tên kênh");
    const { data, error } = await createClient().rpc("create_custom_channel", {
      p_project: projectId,
      p_name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      p_members: picked,
    });
    if (error) return setErr(error.message);
    setName("");
    setPicked([]);
    onClose();
    onCreated(data as string);
  }

  return (
    <Modal open={open} onClose={onClose} title="Kênh tuỳ chọn (Chat 3)">
      <label className="label">Tên kênh</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="team-design" autoFocus />
      <p className="label mt-3">Thành viên (bạn tự động được thêm)</p>
      <div className="flex flex-wrap gap-2">
        {members
          .filter((m) => m.user_id !== meId)
          .map((m) => {
            const on = picked.includes(m.user_id);
            return (
              <button
                key={m.user_id}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== m.user_id) : [...p, m.user_id]))}
                className={cn("chip gap-1.5 py-1", on ? "bg-ink text-white" : "bg-white")}
              >
                <Avatar profile={m.profile} size={18} />
                {displayName(m.profile)}
              </button>
            );
          })}
      </div>
      {err && <p className="mt-2 text-sm text-danger">⚠ {err}</p>}
      <div className="mt-4 flex justify-end">
        <button className="btn btn-primary" onClick={create}>
          Tạo kênh
        </button>
      </div>
    </Modal>
  );
}
