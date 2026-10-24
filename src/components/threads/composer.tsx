"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";
import { cn, safeUrl } from "@/lib/utils";

const KINDS: { id: Post["kind"]; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "article", label: "Article" },
  { id: "share", label: "Chia sẻ link" },
];

export function Composer() {
  const router = useRouter();
  const [kind, setKind] = useState<Post["kind"]>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function submit() {
    if (!body.trim()) return setErr("Viết gì đó đã");
    if (kind === "share" && !safeUrl(link)) return setErr("Link không hợp lệ");
    setBusy(true);
    setErr(null);
    const { error } = await createClient()
      .from("posts")
      .insert({
        kind,
        title: title.trim() || null,
        body: body.trim(),
        link_url: safeUrl(link),
        tags: tags
          .split(/[,\s]+/)
          .map((t) => t.replace(/^#/, "").trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 6),
      });
    setBusy(false);
    if (error) return setErr(error.message);
    setTitle("");
    setBody("");
    setLink("");
    setTags("");
    setExpanded(false);
    router.refresh();
  }

  return (
    <div className="box shadow-sketch p-4">
      <div className="mb-3 flex gap-1.5">
        {KINDS.map((k) => (
          <button key={k.id} className={cn("chip py-1", kind === k.id ? "bg-ink text-white" : "bg-white")} onClick={() => (setKind(k.id), setExpanded(true))}>
            {k.label}
          </button>
        ))}
      </div>
      {(expanded || kind !== "post") && (
        <input
          className="h-hand mb-2 w-full bg-transparent text-2xl outline-none"
          placeholder={kind === "article" ? "Tiêu đề bài viết" : "Tiêu đề (tuỳ)"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      )}
      <textarea
        className="input min-h-20"
        placeholder={kind === "share" ? "Vì sao link này đáng đọc?" : "Đang nghĩ gì? (bài có trả lời mới sẽ được bump lên đầu)"}
        value={body}
        onFocus={() => setExpanded(true)}
        onChange={(e) => setBody(e.target.value)}
        rows={expanded ? (kind === "article" ? 10 : 4) : 2}
      />
      {expanded && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {kind === "share" && (
            <input className="input sm:col-span-2" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
          )}
          <input className="input" placeholder="#tags, cách nhau dấu phẩy" value={tags} onChange={(e) => setTags(e.target.value)} />
          <div className="flex items-center justify-end gap-2">
            {err && <span className="text-sm text-danger">⚠ {err}</span>}
            <button className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? "Đang đăng…" : "Đăng"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
