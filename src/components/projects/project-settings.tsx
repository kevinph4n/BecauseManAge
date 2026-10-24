"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LabelChip, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { LabelKind, Project, ProjectLabel, ProjectStatus } from "@/lib/types";
import { LABEL_KINDS, NEED_PRESETS, labelOrder } from "@/lib/utils";

export function ProjectSettings({
  project,
  labels,
  fields,
  isManager,
  isOwner,
}: {
  project: Project;
  labels: ProjectLabel[];
  fields: { id: string; label: string }[];
  isManager: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [start, setStart] = useState(project.start_date ?? "");
  const [end, setEnd] = useState(project.end_date ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<LabelKind>("custom");
  const [text, setText] = useState("");
  const refresh = () => startTransition(() => router.refresh());

  if (!isManager) {
    return <p className="text-sm text-smoke">Chỉ Owner/Manager mới chỉnh được cài đặt dự án.</p>;
  }

  async function save() {
    const { error } = await createClient()
      .from("projects")
      .update({ name: name.trim(), description: description.trim() || null, start_date: start || null, end_date: end || null, status })
      .eq("id", project.id);
    setMsg(error ? `⚠ ${error.message}` : "✓ Đã lưu");
    refresh();
  }

  async function addLabel() {
    const t = text.trim();
    if (!t) return;
    const { error } = await createClient().from("project_labels").insert({ project_id: project.id, kind, text: t });
    if (error) return setMsg(`⚠ ${error.message}`);
    setText("");
    refresh();
  }

  async function removeLabel(id: string) {
    await createClient().from("project_labels").delete().eq("id", id);
    refresh();
  }

  async function destroy() {
    if (prompt(`Gõ tên dự án "${project.name}" để xác nhận xoá vĩnh viễn:`) !== project.name) return;
    const { error } = await createClient().from("projects").delete().eq("id", project.id);
    if (error) return setMsg(`⚠ ${error.message}`);
    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="box p-5">
        <SectionTitle>Thông tin dự án</SectionTitle>
        <div className="space-y-3">
          <div>
            <label className="label">Tên</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Mô tả</label>
            <textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Bắt đầu</label>
              <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label">Hạn chót</label>
              <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div>
              <label className="label">Trạng thái</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={save}>
              Lưu
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      </section>

      <section className="box p-5">
        <SectionTitle>Labels</SectionTitle>
        <p className="-mt-2 mb-3 text-xs text-smoke">
          Thứ tự cố định: <b>1 vàng</b> = ngành nghề · <b>2 xanh sky</b> = label tự gắn · <b>3 trắng nền đen</b> = nhu cầu.
        </p>
        <div className="mb-4 space-y-2">
          {LABEL_KINDS.map((k) => {
            const list = labels.filter((l) => l.kind === k.kind);
            return (
              <div key={k.kind} className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 text-xs text-smoke">
                  {labelOrder(k.kind) + 1}. {k.name}
                </span>
                {list.length === 0 && <span className="text-xs text-smoke">—</span>}
                {list.map((l) => (
                  <span key={l.id} className="inline-flex items-center">
                    <LabelChip kind={l.kind} text={l.text} />
                    <button className="ml-0.5 text-xs text-smoke hover:text-danger" onClick={() => removeLabel(l.id)} aria-label="Xoá label">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto!" value={kind} onChange={(e) => (setKind(e.target.value as LabelKind), setText(""))}>
            {LABEL_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.name}
              </option>
            ))}
          </select>
          {kind === "field" ? (
            <select className="input min-w-40 flex-1" value={text} onChange={(e) => setText(e.target.value)}>
              <option value="">— chọn ngành —</option>
              {fields.map((f) => (
                <option key={f.id} value={f.label}>
                  {f.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input min-w-40 flex-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              list={kind === "need" ? "need-presets" : undefined}
              placeholder={kind === "need" ? "Công việc, Gia đình, Chi tiêu…" : "hackathon, Q4…"}
              onKeyDown={(e) => e.key === "Enter" && addLabel()}
            />
          )}
          <datalist id="need-presets">
            {NEED_PRESETS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button className="btn" onClick={addLabel}>
            + Gắn
          </button>
        </div>
      </section>

      {isOwner && (
        <section className="box border-danger! p-5 lg:col-span-2">
          <SectionTitle>Vùng nguy hiểm</SectionTitle>
          <p className="mb-3 text-sm text-smoke">Xoá dự án sẽ xoá toàn bộ milestones, tasks, chat, notes, commits của dự án.</p>
          <button className="btn btn-danger" onClick={destroy}>
            Xoá dự án vĩnh viễn
          </button>
        </section>
      )}
    </div>
  );
}
