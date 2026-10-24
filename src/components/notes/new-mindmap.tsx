"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { TEMPLATES } from "@/lib/mindmap";
import { createClient } from "@/lib/supabase/client";

export function NewMindmapButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tpl, setTpl] = useState("blank");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setErr(null);
    const t = TEMPLATES.find((x) => x.id === tpl) ?? TEMPLATES[0];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("mindmaps")
      .insert({ title: title.trim() || t.name, data: t.build() })
      .select("id")
      .single();
    setBusy(false);
    if (error) return setErr(error.message);
    router.push(`/notes/${data.id}`);
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Bảng mới
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bảng note mới" wide>
        <label className="label">Tên bảng</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="vd: Quán ăn Sài Gòn" autoFocus />
        <p className="label mt-4">Template</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTpl(t.id)}
              className={`box p-3 text-left transition ${tpl === t.id ? "shadow-sketch bg-fog!" : ""}`}
            >
              <p className="h-hand text-xl">{t.name}</p>
              <p className="text-xs text-smoke">{t.desc}</p>
            </button>
          ))}
        </div>
        {err && <p className="mt-3 text-sm text-danger">⚠ {err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={create} disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo bảng →"}
          </button>
        </div>
      </Modal>
    </>
  );
}
