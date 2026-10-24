"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { createClient } from "@/lib/supabase/client";
import { NEED_PRESETS } from "@/lib/utils";

export function CreateProjectButton({ fields }: { fields: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [field, setField] = useState("");
  const [need, setNeed] = useState("Công việc");
  const [custom, setCustom] = useState("");
  const [milestoneText, setMilestoneText] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return setErr("Đặt tên cho dự án đã");
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        end_date: endDate || null,
        start_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error || !project) {
      setBusy(false);
      return setErr(error?.message ?? "Không tạo được dự án");
    }

    const labels: { project_id: string; kind: string; text: string }[] = [];
    const fieldLabel = fields.find((f) => f.id === field)?.label;
    if (fieldLabel) labels.push({ project_id: project.id, kind: "field", text: fieldLabel });
    custom
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((t) => labels.push({ project_id: project.id, kind: "custom", text: t }));
    if (need) labels.push({ project_id: project.id, kind: "need", text: need });
    if (labels.length) await supabase.from("project_labels").insert(labels);

    const titles = milestoneText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (titles.length) {
      await supabase
        .from("milestones")
        .insert(titles.map((title, i) => ({ project_id: project.id, title, phase: 1, position: i })));
    }

    setBusy(false);
    setOpen(false);
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Dự án mới
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Dự án mới" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Tên dự án *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Mô tả</label>
            <textarea className="input min-h-16" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">
              <span className="chip bg-label-field">1</span> Ngành nghề
            </label>
            <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
              <option value="">— không chọn —</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              <span className="chip bg-ink text-white">3</span> Nhu cầu
            </label>
            <select className="input" value={need} onChange={(e) => setNeed(e.target.value)}>
              <option value="">— không chọn —</option>
              {NEED_PRESETS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              <span className="chip bg-label-sky">2</span> Label tự gắn (phẩy để tách)
            </label>
            <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="hackathon, side-project" />
          </div>
          <div>
            <label className="label">Hạn chót (tuỳ)</label>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Milestones phase 1 — mỗi dòng 1 mốc (tuỳ, thêm sau cũng được)</label>
            <textarea
              className="input min-h-28 font-mono text-xs"
              value={milestoneText}
              onChange={(e) => setMilestoneText(e.target.value)}
              placeholder={"Chốt ý tưởng\nThiết kế UI\nDựng database\nLàm tính năng chính\nDemo"}
            />
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-danger">⚠ {err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={create} disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo dự án →"}
          </button>
        </div>
      </Modal>
    </>
  );
}
