"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { MiniProfile, Post, PostReply } from "@/lib/types";
import { displayName, shortHash, timeAgo } from "@/lib/utils";

/** Trả lời kiểu imageboard: mỗi reply có No., gõ >>No để trích dẫn */
export function Replies({
  post,
  replies,
  profiles,
  meId,
}: {
  post: Post;
  replies: PostReply[];
  profiles: Record<string, MiniProfile>;
  meId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await createClient().from("post_replies").insert({ post_id: post.id, body: body.trim() });
    setBusy(false);
    if (error) return setErr(error.message);
    setBody("");
    router.refresh();
  }

  async function del(id: string) {
    await createClient().from("post_replies").delete().eq("id", id);
    router.refresh();
  }

  async function delPost() {
    if (!confirm("Xoá bài này?")) return;
    await createClient().from("posts").delete().eq("id", post.id);
    router.push("/threads");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      {post.author_id === meId && (
        <div className="flex justify-end">
          <button className="btn btn-ghost btn-sm text-danger" onClick={delPost}>
            Xoá bài
          </button>
        </div>
      )}
      <p className="h-hand text-2xl">{replies.length} trả lời</p>
      {replies.map((r) => (
        <div key={r.id} id={shortHash(r.id)} className="box ml-4 p-3 target:ring-2 target:ring-ink">
          <div className="flex items-center gap-2 text-xs text-smoke">
            <Avatar profile={profiles[r.author_id]} size={20} />
            {profiles[r.author_id] ? (
              <Link href={`/u/${profiles[r.author_id].username}`} className="font-semibold text-ink hover:underline">
                {displayName(profiles[r.author_id])}
              </Link>
            ) : (
              <span>Ẩn danh</span>
            )}
            <span>{timeAgo(r.created_at)}</span>
            <button className="font-mono hover:text-ink" onClick={() => setBody((b) => `${b}>>${shortHash(r.id)}\n`)}>
              No.{shortHash(r.id)}
            </button>
            {r.author_id === meId && (
              <button className="ml-auto hover:text-danger" onClick={() => del(r.id)}>
                xoá
              </button>
            )}
          </div>
          <p className="mt-1.5 text-sm whitespace-pre-wrap">
            {r.body.split("\n").map((line, i) =>
              /^>>[0-9a-f]{7}/.test(line) ? (
                <a key={i} href={`#${line.slice(2, 9)}`} className="block font-mono text-smoke underline">
                  {line}
                </a>
              ) : line.startsWith(">") ? (
                <span key={i} className="block text-smoke">
                  {line}
                </span>
              ) : (
                <span key={i} className="block">
                  {line}
                </span>
              ),
            )}
          </p>
        </div>
      ))}
      <div className="box p-3">
        <textarea
          className="input min-h-20"
          placeholder="Trả lời… (>>No để trích dẫn, > để greentext… mà ở đây là greytext)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          {err && <span className="text-sm text-danger">⚠ {err}</span>}
          <button className="btn btn-primary" onClick={send} disabled={busy}>
            Trả lời
          </button>
        </div>
      </div>
    </section>
  );
}
