"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { SafeHtml } from "@/components/safe-html";
import { Avatar, EmptyState } from "@/components/ui";
import { FONT_FAMILY } from "@/lib/mindmap";
import { createClient } from "@/lib/supabase/client";
import type { ClipBlock, MemberNote, MiniProfile, NoteRead } from "@/lib/types";
import { cn, displayName, formatDateTime, timeAgo } from "@/lib/utils";

export function ProjectNotes({
  projectId,
  notes,
  reads,
  profiles,
  meId,
  isManager,
}: {
  projectId: string;
  notes: MemberNote[];
  reads: NoteRead[];
  profiles: Record<string, MiniProfile>;
  meId: string;
  isManager: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [author, setAuthor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(notes[0]?.id ?? null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [localReads, setLocalReads] = useState(reads);

  const authors = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((n) => map.set(n.author_id, (map.get(n.author_id) ?? 0) + 1));
    return [...map.entries()];
  }, [notes]);

  const shown = author ? notes.filter((n) => n.author_id === author) : notes;
  const open = notes.find((n) => n.id === openId) ?? null;

  // đánh dấu đã xem
  useEffect(() => {
    if (!open) return;
    if (localReads.some((r) => r.note_id === open.id && r.user_id === meId)) return;
    const row = { note_id: open.id, user_id: meId, read_at: new Date().toISOString() };
    setLocalReads((r) => [...r, row]);
    createClient().from("note_reads").upsert(row, { onConflict: "note_id,user_id" }).then(() => {});
  }, [open, meId, localReads]);

  async function remove(n: MemberNote) {
    if (!confirm(`Xoá note "${n.title}"?`)) return;
    await createClient().from("member_notes").delete().eq("id", n.id);
    setOpenId(null);
    startTransition(() => router.refresh());
  }

  const unread = (n: MemberNote) => n.author_id !== meId && !localReads.some((r) => r.note_id === n.id && r.user_id === meId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-smoke">
          Note của từng thành viên để lại cho người sau. Bấm vào note của ai là xem được, kèm danh sách “đã xem”.
        </p>
        <div className="ml-auto flex gap-2">
          <Link href="/notes" className="btn btn-sm">
            ↗ Trích từ mindmap
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setWriteOpen(true)}>
            + Viết note
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button className={cn("chip py-1", !author ? "bg-ink text-white" : "bg-white")} onClick={() => setAuthor(null)}>
          Tất cả ({notes.length})
        </button>
        {authors.map(([id, count]) => (
          <button
            key={id}
            className={cn("chip gap-1.5 py-1", author === id ? "bg-ink text-white" : "bg-white")}
            onClick={() => setAuthor(id)}
          >
            <Avatar profile={profiles[id]} size={18} />
            {displayName(profiles[id])} ({count})
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <EmptyState title="Chưa có note nào">Viết note bàn giao, hoặc trích xuất khối thông tin từ mindmap của bạn.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <ul className="space-y-2">
            {shown.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setOpenId(n.id)}
                  className={cn("box w-full p-3 text-left transition", openId === n.id && "shadow-sketch bg-fog!")}
                >
                  <div className="flex items-center gap-2">
                    <Avatar profile={profiles[n.author_id]} size={22} />
                    <span className="text-xs text-smoke">
                      {displayName(profiles[n.author_id])} · {timeAgo(n.created_at)}
                    </span>
                    {unread(n) && <span className="ml-auto h-2 w-2 rounded-full bg-ink" title="Chưa xem" />}
                  </div>
                  <p className="mt-1 font-semibold">
                    {n.clip && <span className="chip mr-1 bg-white">mindmap</span>}
                    {n.title}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <article className="box min-h-64 p-5">
            {open ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="h-hand text-3xl">{open.title}</h3>
                    <p className="text-xs text-smoke">
                      {displayName(profiles[open.author_id])} · {formatDateTime(open.created_at)}
                      {open.clip && <> · trích từ mindmap “{open.clip.mindmap_title}”</>}
                    </p>
                  </div>
                  {(open.author_id === meId || isManager) && (
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => remove(open)}>
                      Xoá
                    </button>
                  )}
                </div>
                {open.body && <p className="mt-4 whitespace-pre-wrap">{open.body}</p>}
                {open.clip && (
                  <div className="paper-dots mt-4 flex flex-wrap gap-3 border border-dashed border-ink p-4">
                    {open.clip.blocks.map((b, i) => (
                      <ClipView key={i} block={b} />
                    ))}
                  </div>
                )}
                <div className="mt-6 border-t border-line pt-3">
                  <p className="text-xs text-smoke">Đã xem bởi:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {localReads
                      .filter((r) => r.note_id === open.id)
                      .map((r) => (
                        <span key={r.user_id} className="chip gap-1 bg-white" title={formatDateTime(r.read_at)}>
                          <Avatar profile={profiles[r.user_id]} size={16} />
                          {r.user_id === meId ? "Bạn" : displayName(profiles[r.user_id])}
                        </span>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-smoke">Chọn một note để đọc.</p>
            )}
          </article>
        </div>
      )}

      <WriteNoteModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        projectId={projectId}
        onDone={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}

function ClipView({ block }: { block: ClipBlock }) {
  const s = block.style;
  return (
    <SafeHtml
      html={block.html}
      className={cn("max-w-xs px-3 py-2", s.border === "sketch" && "sketch")}
      style={{
        background: s.bg,
        color: s.color,
        fontFamily: FONT_FAMILY[s.font] ?? undefined,
        fontSize: s.size,
        fontWeight: s.bold ? 700 : 400,
        fontStyle: s.italic ? "italic" : "normal",
        textDecoration: s.underline ? "underline" : "none",
        textAlign: s.align,
        border: s.border === "solid" ? "1.5px solid #111" : s.border === "dashed" ? "1.5px dashed #111" : undefined,
      }}
    />
  );
}

function WriteNoteModal({
  open,
  onClose,
  projectId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return setErr("Nhập tiêu đề");
    const { error } = await createClient()
      .from("member_notes")
      .insert({ project_id: projectId, title: title.trim(), body: body.trim() || null });
    if (error) return setErr(error.message);
    setTitle("");
    setBody("");
    onClose();
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Note cho người sau" wide>
      <div className="space-y-3">
        <div>
          <label className="label">Tiêu đề</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bàn giao phần backend" autoFocus />
        </div>
        <div>
          <label className="label">Nội dung</label>
          <textarea
            className="input min-h-48"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"- Đã làm gì\n- Còn dang dở gì\n- Lưu ý gì cho người tiếp theo"}
          />
        </div>
        {err && <p className="text-sm text-danger">⚠ {err}</p>}
        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={submit}>
            Đăng note
          </button>
        </div>
      </div>
    </Modal>
  );
}
