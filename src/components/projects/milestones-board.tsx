"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { Avatar, EmptyState } from "@/components/ui";
import { PrioritySelect } from "./priority-select";
import { groupMarks, milestoneState, phaseColor, phaseTextColor, type MilestoneState } from "@/lib/progress";
import { createClient } from "@/lib/supabase/client";
import type { MarkStatus, MemberWithProfile, Milestone, MilestoneMark, Priority } from "@/lib/types";
import { MARK_LABEL, cn, displayName, formatDate } from "@/lib/utils";

const STATE_STYLE: Record<MilestoneState, string> = {
  completed: "bg-ink text-white",
  in_progress: "bg-white",
  hiatus: "bg-fog border-dashed",
  open: "bg-transparent border-dashed text-smoke",
};
const STATE_TEXT: Record<MilestoneState, string> = {
  completed: "✓ Completed",
  in_progress: "◐ In progress",
  hiatus: "⏸ Hiatus",
  open: "○ Chưa bắt đầu",
};

export function MilestonesBoard({
  projectId,
  milestones,
  marks,
  members,
  meId,
  isManager,
  priorities,
}: {
  projectId: string;
  milestones: Milestone[];
  marks: MilestoneMark[];
  members: MemberWithProfile[];
  meId: string;
  isManager: boolean;
  priorities: Record<string, Priority>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandOpen, setExpandOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [addPhase, setAddPhase] = useState<number | null>(null);

  const byMs = useMemo(() => groupMarks(marks), [marks]);
  const nameOf = (uid: string) => displayName(members.find((m) => m.user_id === uid)?.profile);

  const phases = useMemo(() => {
    const map = new Map<number, Milestone[]>();
    [...milestones]
      .sort((a, b) => a.phase - b.phase || a.position - b.position || a.created_at.localeCompare(b.created_at))
      .forEach((m) => map.set(m.phase, [...(map.get(m.phase) ?? []), m]));
    return [...map.entries()];
  }, [milestones]);
  const maxPhase = phases.length ? phases[phases.length - 1][0] : 0;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function mark(status: MarkStatus | null) {
    if (!selected.length) return;
    setError(null);
    const supabase = createClient();
    const { error } = status
      ? await supabase.from("milestone_marks").upsert(
          selected.map((milestone_id) => ({
            milestone_id,
            user_id: meId,
            status,
            marked_at: new Date().toISOString(),
          })),
          { onConflict: "milestone_id,user_id" },
        )
      : await supabase.from("milestone_marks").delete().eq("user_id", meId).in("milestone_id", selected);
    if (error) return setError(error.message);
    setSelected([]);
    refresh();
  }

  async function remove(m: Milestone) {
    if (!confirm(`Xoá milestone "${m.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("milestones").delete().eq("id", m.id);
    if (error) return setError(error.message);
    refresh();
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="space-y-6">
      {/* actions */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-smoke">
          Tick chọn 1 hoặc nhiều mốc rồi đánh dấu trạng thái. Nhiều người có thể cùng mark một mốc.
        </p>
        {isManager && (
          <div className="ml-auto flex gap-2">
            {maxPhase > 0 && (
              <button className="btn btn-sm" onClick={() => setAddPhase(maxPhase)}>
                + Mốc vào Phase {maxPhase}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setExpandOpen(true)}>
              {maxPhase === 0 ? "+ Tạo Phase 1" : `⤴ Mở rộng dự án (Phase ${maxPhase + 1})`}
            </button>
          </div>
        )}
      </div>

      {error && <p className="sketch bg-white px-3 py-2 text-sm text-danger">⚠ {error}</p>}

      {phases.length === 0 && (
        <EmptyState title="Chưa có milestone nào">
          {isManager ? "Bấm “+ Tạo Phase 1” để đặt các mốc đầu tiên." : "Đợi Owner/Manager đặt milestones nhé."}
        </EmptyState>
      )}

      {phases.map(([phase, list]) => {
        const done = list.filter((m) => milestoneState(byMs.get(m.id) ?? []) === "completed").length;
        return (
          <section key={phase}>
            <div className="mb-2 flex items-center gap-3">
              <span
                className="sketch h-hand px-3 py-0.5 text-lg"
                style={{ background: phaseColor(phase), color: phaseTextColor(phase) }}
              >
                Phase {phase}
              </span>
              <span className="text-sm text-smoke">
                {done}/{list.length} completed
              </span>
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-smoke">
                <input
                  type="checkbox"
                  className="accent-ink"
                  checked={list.every((m) => selected.includes(m.id))}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...new Set([...s, ...list.map((m) => m.id)])]
                        : s.filter((x) => !list.some((m) => m.id === x)),
                    )
                  }
                />
                chọn cả phase
              </label>
            </div>
            <ul className="space-y-2">
              {list.map((m, i) => {
                const ms = byMs.get(m.id) ?? [];
                const state = milestoneState(ms);
                const mine = ms.find((x) => x.user_id === meId);
                const isSel = selected.includes(m.id);
                return (
                  <li
                    key={m.id}
                    className={cn("box flex flex-wrap items-start gap-3 p-3 transition", isSel && "shadow-sketch bg-fog!")}
                    style={{ borderLeft: `8px solid ${phaseColor(phase)}` }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1.5 h-4 w-4 accent-ink"
                      checked={isSel}
                      onChange={() => toggle(m.id)}
                      aria-label={`Chọn ${m.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-smoke">#{i + 1}</span>
                        <span className={cn("font-semibold", state === "completed" && "line-through decoration-2")}>
                          {m.title}
                        </span>
                        <span className={cn("chip", STATE_STYLE[state])}>{STATE_TEXT[state]}</span>
                      </div>
                      {m.description && <p className="mt-0.5 text-sm text-smoke">{m.description}</p>}
                      <div className="mt-1 text-xs text-smoke">
                        {m.start_date || m.due_date ? `${formatDate(m.start_date)} → ${formatDate(m.due_date, true)}` : "Chưa có ngày"}
                      </div>
                      {/* marks: "In progress - Marked by A; B" */}
                      {ms.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(["completed", "in_progress", "hiatus"] as MarkStatus[]).map((s) => {
                            const who = ms.filter((x) => x.status === s);
                            if (!who.length) return null;
                            return (
                              <div key={s} className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold">{MARK_LABEL[s]}</span>
                                <span className="text-smoke">— Marked by</span>
                                {who.map((w, idx) => (
                                  <span key={w.user_id} className="inline-flex items-center gap-1">
                                    <Avatar profile={members.find((x) => x.user_id === w.user_id)?.profile} size={16} />
                                    <span className={cn(w.user_id === meId && "font-bold underline")}>{nameOf(w.user_id)}</span>
                                    {idx < who.length - 1 && <span className="text-smoke">;</span>}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {mine && <span className="text-xs text-smoke">bạn: {MARK_LABEL[mine.status]}</span>}
                      <PrioritySelect target="milestone" id={m.id} value={priorities[m.id]} meId={meId} />
                      {isManager && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(m)}>
                            Sửa
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => remove(m)}>
                            Xoá
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* bulk mark bar */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="box shadow-sketch flex flex-wrap items-center gap-2 bg-white px-4 py-2">
            <span className="h-hand text-lg">Đã chọn {selected.length} mốc →</span>
            <button className="btn btn-sm" disabled={pending} onClick={() => mark("in_progress")}>
              ◐ In progress
            </button>
            <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => mark("completed")}>
              ✓ Completed
            </button>
            <button className="btn btn-sm" disabled={pending} onClick={() => mark("hiatus")}>
              ⏸ Hiatus
            </button>
            <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => mark(null)}>
              Bỏ mark của tôi
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>
              ✕
            </button>
          </div>
        </div>
      )}

      <ExpandModal
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        projectId={projectId}
        phase={maxPhase + 1}
        startPosition={0}
        title={maxPhase === 0 ? "Tạo Phase 1" : `Mở rộng dự án → Phase ${maxPhase + 1}`}
        hint={
          maxPhase === 0
            ? "Mỗi dòng là 1 milestone. Ví dụ 10 mốc → mỗi mốc xong = 10%."
            : `Thêm mốc mới sẽ tự co % lại trên thang 100. Phase ${maxPhase + 1} có màu xanh đậm hơn.`
        }
        onDone={refresh}
      />
      <ExpandModal
        open={addPhase !== null}
        onClose={() => setAddPhase(null)}
        projectId={projectId}
        phase={addPhase ?? 1}
        startPosition={phases.find(([p]) => p === addPhase)?.[1].length ?? 0}
        title={`Thêm mốc vào Phase ${addPhase ?? ""}`}
        hint="Mỗi dòng là 1 milestone."
        onDone={refresh}
      />
      <EditMilestoneModal milestone={editing} onClose={() => setEditing(null)} onDone={refresh} />
    </div>
  );
}

function ExpandModal({
  open,
  onClose,
  projectId,
  phase,
  startPosition,
  title,
  hint,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  phase: number;
  startPosition: number;
  title: string;
  hint: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  async function submit() {
    if (!lines.length) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("milestones").insert(
      lines.map((t, i) => ({
        project_id: projectId,
        title: t,
        phase,
        position: startPosition + i,
        start_date: start || null,
        due_date: due || null,
      })),
    );
    setBusy(false);
    if (error) return setErr(error.message);
    setText("");
    onClose();
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-3 text-sm text-smoke">{hint}</p>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-4 w-10 border border-ink" style={{ background: phaseColor(phase) }} />
        <span className="text-xs text-smoke">màu của Phase {phase}</span>
      </div>
      <textarea
        className="input min-h-40 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Mốc 1\nMốc 2\nMốc 3"}
        autoFocus
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="label">Bắt đầu (áp cho tất cả, tuỳ)</label>
          <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Hạn (tuỳ)</label>
          <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-danger">⚠ {err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !lines.length}>
          {busy ? "Đang thêm…" : `Thêm ${lines.length} mốc`}
        </button>
      </div>
    </Modal>
  );
}

function EditMilestoneModal({
  milestone,
  onClose,
  onDone,
}: {
  milestone: Milestone | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Modal open={!!milestone} onClose={onClose} title="Sửa milestone">
      {milestone && <EditMilestoneForm key={milestone.id} milestone={milestone} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function EditMilestoneForm({ milestone, onClose, onDone }: { milestone: Milestone; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description ?? "");
  const [start, setStart] = useState(milestone.start_date ?? "");
  const [due, setDue] = useState(milestone.due_date ?? "");
  const [phase, setPhase] = useState(milestone.phase);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const supabase = createClient();
    const { error } = await supabase
      .from("milestones")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        start_date: start || null,
        due_date: due || null,
        phase,
      })
      .eq("id", milestone.id);
    if (error) return setErr(error.message);
    onClose();
    onDone();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Tên</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Mô tả</label>
        <textarea className="input min-h-16" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Bắt đầu</label>
          <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Hạn</label>
          <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div>
          <label className="label">Phase</label>
          <input type="number" min={1} className="input" value={phase} onChange={(e) => setPhase(Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>
      {err && <p className="text-sm text-danger">⚠ {err}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-primary" onClick={save}>
          Lưu
        </button>
      </div>
    </div>
  );
}
