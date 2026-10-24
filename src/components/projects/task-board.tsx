"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { Avatar, EmptyState, RoleBadge, SectionTitle } from "@/components/ui";
import { PrioritySelect } from "./priority-select";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithProfile, Milestone, Priority, Task, TaskStatus } from "@/lib/types";
import { TASK_STATUS_LABEL, cn, displayName, formatDate, formatDateTime } from "@/lib/utils";

type Filter = "all" | "mine" | "flagged" | string; // string = user id

export function TaskBoard({
  projectId,
  tasks,
  milestones,
  members,
  meId,
  isManager,
  priorities,
}: {
  projectId: string;
  tasks: Task[];
  milestones: Milestone[];
  members: MemberWithProfile[];
  meId: string;
  isManager: boolean;
  priorities: Record<string, Priority>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [flagTask, setFlagTask] = useState<Task | null>(null);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const profileOf = (id: string | null) => members.find((m) => m.user_id === id)?.profile ?? null;
  const msTitle = (id: string | null) => milestones.find((m) => m.id === id)?.title ?? "—";
  const refresh = () => startTransition(() => router.refresh());

  const myTasks = tasks.filter((t) => t.assignee_id === meId);
  const shown = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "mine") return myTasks;
    if (filter === "flagged") return tasks.filter((t) => t.flagged);
    return tasks.filter((t) => t.assignee_id === filter);
  }, [filter, tasks, myTasks]);

  async function setStatus(t: Task, status: TaskStatus) {
    setError(null);
    const { error } = await createClient().from("tasks").update({ status }).eq("id", t.id);
    if (error) return setError(error.message);
    refresh();
  }

  async function remove(t: Task) {
    if (!confirm(`Xoá task "${t.title}"?`)) return;
    const { error } = await createClient().from("tasks").delete().eq("id", t.id);
    if (error) return setError(error.message);
    refresh();
  }

  return (
    <div className="space-y-8">
      {error && <p className="sketch bg-white px-3 py-2 text-sm text-danger">⚠ {error}</p>}

      {/* ---------- việc của tôi ---------- */}
      <section>
        <SectionTitle
          right={
            isManager && (
              <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
                + Giao việc
              </button>
            )
          }
        >
          Việc của tôi ({myTasks.filter((t) => t.status !== "done").length} đang mở)
        </SectionTitle>
        {myTasks.length === 0 ? (
          <p className="text-sm text-smoke">Chưa ai giao việc cho bạn. Thảnh thơi được lúc nào hay lúc đó ☕</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myTasks.map((t) => (
              <div key={t.id} className={cn("box p-4", t.status === "done" && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-smoke">
                      Mốc: {msTitle(t.milestone_id)} · Hạn {formatDate(t.due_date, true)} · giao bởi{" "}
                      {displayName(profileOf(t.assigned_by))}
                    </p>
                  </div>
                  <PrioritySelect target="task" id={t.id} value={priorities[t.id]} meId={meId} />
                </div>
                {t.description && <p className="mt-2 text-sm whitespace-pre-wrap text-smoke">{t.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
                    <button
                      key={s}
                      className={cn("btn btn-sm", t.status === s && "btn-primary")}
                      onClick={() => setStatus(t, s)}
                    >
                      {TASK_STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button className={cn("btn btn-sm ml-auto", t.flagged && "btn-danger")} onClick={() => setFlagTask(t)}>
                    ⚑ {t.flagged ? "Đang báo vấn đề" : "Báo vấn đề"}
                  </button>
                </div>
                {t.review_note && (
                  <p className="mt-2 border-l-2 border-ink pl-2 text-xs">
                    <b>Xem xét bởi {displayName(profileOf(t.reviewed_by))}:</b> {t.review_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- bảng phân công tổng ---------- */}
      <section>
        <SectionTitle>Bảng phân công tổng</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-smoke">
          Ai giao gì cho ai, lúc nào — để Owner, Managers và Members cùng double-check. Có tình huống khó đỡ thì Member bấm ⚑,
          Manager khác vào “Xem xét” để xử lý công minh.
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <FilterBtn on={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả ({tasks.length})
          </FilterBtn>
          <FilterBtn on={filter === "mine"} onClick={() => setFilter("mine")}>
            Của tôi
          </FilterBtn>
          <FilterBtn on={filter === "flagged"} onClick={() => setFilter("flagged")}>
            ⚑ Có vấn đề ({tasks.filter((t) => t.flagged).length})
          </FilterBtn>
          <select
            className="input w-auto! py-1! text-xs"
            value={members.some((m) => m.user_id === filter) ? filter : ""}
            onChange={(e) => setFilter(e.target.value || "all")}
          >
            <option value="">Theo thành viên…</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {displayName(m.profile)}
              </option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <EmptyState title="Không có task nào ở đây" />
        ) : (
          <div className="box thin-scroll overflow-x-auto p-0!">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b-[1.5px] border-ink bg-fog text-left">
                  <Th>Task</Th>
                  <Th>Mốc</Th>
                  <Th>Người nhận</Th>
                  <Th>Giao bởi</Th>
                  <Th>Lúc giao</Th>
                  <Th>Hạn</Th>
                  <Th>Trạng thái</Th>
                  <Th>Vấn đề / Xem xét</Th>
                  <Th>Priority (🔒 riêng bạn)</Th>
                  {isManager && <Th> </Th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id} className={cn("border-b border-line align-top", t.flagged && "bg-[#fff6f5]")}>
                    <Td>
                      <span className="font-semibold">{t.title}</span>
                    </Td>
                    <Td className="text-smoke">{msTitle(t.milestone_id)}</Td>
                    <Td>
                      <Person p={profileOf(t.assignee_id)} />
                    </Td>
                    <Td>
                      <Person p={profileOf(t.assigned_by)} />
                    </Td>
                    <Td className="text-xs text-smoke">{t.assigned_at ? formatDateTime(t.assigned_at) : "—"}</Td>
                    <Td className="text-xs">{formatDate(t.due_date, true)}</Td>
                    <Td>
                      <span className={cn("chip", t.status === "done" ? "bg-ink text-white" : "bg-white")}>
                        {TASK_STATUS_LABEL[t.status]}
                      </span>
                    </Td>
                    <Td className="max-w-56 text-xs">
                      {t.flagged && (
                        <p className="text-danger">
                          ⚑ {displayName(profileOf(t.flagged_by))}: {t.flag_reason || "(không ghi lý do)"}
                        </p>
                      )}
                      {t.review_note && (
                        <p className="mt-1">
                          <b>{displayName(profileOf(t.reviewed_by))}</b>: {t.review_note}
                        </p>
                      )}
                      {!t.flagged && !t.review_note && <span className="text-smoke">—</span>}
                    </Td>
                    <Td>
                      <PrioritySelect target="task" id={t.id} value={priorities[t.id]} meId={meId} />
                    </Td>
                    {isManager && (
                      <Td>
                        <div className="flex gap-1">
                          <button className="btn btn-sm" onClick={() => setReviewTask(t)}>
                            Xem xét
                          </button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => remove(t)}>
                            ✕
                          </button>
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- tổng hợp theo thành viên ---------- */}
      <section>
        <SectionTitle>Tổng hợp theo thành viên</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const mine = tasks.filter((t) => t.assignee_id === m.user_id);
            const count = (s: TaskStatus) => mine.filter((t) => t.status === s).length;
            return (
              <button
                key={m.user_id}
                onClick={() => setFilter(m.user_id)}
                className={cn("box flex items-center gap-3 p-3 text-left", filter === m.user_id && "shadow-sketch")}
              >
                <Avatar profile={m.profile} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{displayName(m.profile)}</span>
                    <RoleBadge role={m.role} />
                  </div>
                  <p className="text-xs text-smoke">
                    {mine.length} task · {count("todo")} todo · {count("in_progress")} đang làm · {count("done")} xong
                    {mine.some((t) => t.flagged) ? ` · ⚑ ${mine.filter((t) => t.flagged).length}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <AssignModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={projectId}
        milestones={milestones}
        members={members}
        onDone={refresh}
      />
      <FlagModal task={flagTask} onClose={() => setFlagTask(null)} onDone={refresh} />
      <ReviewModal task={reviewTask} members={members} onClose={() => setReviewTask(null)} onDone={refresh} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}
function FilterBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={cn("btn btn-sm", on && "btn-primary")} onClick={onClick}>
      {children}
    </button>
  );
}
function Person({ p }: { p: MemberWithProfile["profile"] | null }) {
  if (!p) return <span className="text-smoke">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Avatar profile={p} size={20} />
      {displayName(p)}
    </span>
  );
}

// ---------------------------------------------------------------------

function AssignModal({
  open,
  onClose,
  projectId,
  milestones,
  members,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  milestones: Milestone[];
  members: MemberWithProfile[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return setErr("Nhập tên task");
    setBusy(true);
    setErr(null);
    const targets = assignees.length ? assignees : [null];
    const { error } = await createClient()
      .from("tasks")
      .insert(
        targets.map((a) => ({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          milestone_id: milestoneId || null,
          assignee_id: a,
          start_date: start || null,
          due_date: due || null,
        })),
      );
    setBusy(false);
    if (error) return setErr(error.message);
    setTitle("");
    setDescription("");
    setAssignees([]);
    onClose();
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Giao việc" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Việc cần làm *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Mô tả</label>
          <textarea className="input min-h-16" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Thuộc milestone</label>
          <select className="input" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">— không —</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                P{m.phase} · {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Bắt đầu</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">Hạn</label>
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Giao cho (chọn nhiều → mỗi người 1 task)</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = assignees.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== m.user_id) : [...a, m.user_id]))}
                  className={cn("chip gap-1.5 py-1", on ? "bg-ink text-white" : "bg-white")}
                >
                  <Avatar profile={m.profile} size={18} />
                  {displayName(m.profile)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-danger">⚠ {err}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Đang giao…" : "Giao việc →"}
        </button>
      </div>
    </Modal>
  );
}

function FlagModal({ task, onClose, onDone }: { task: Task | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(flagged: boolean) {
    if (!task) return;
    const { error } = await createClient()
      .from("tasks")
      .update({ flagged, flag_reason: flagged ? reason.trim() || null : task.flag_reason })
      .eq("id", task.id);
    if (error) return setErr(error.message);
    setReason("");
    onClose();
    onDone();
  }

  return (
    <Modal open={!!task} onClose={onClose} title="Báo vấn đề với task">
      <p className="mb-2 text-sm text-smoke">
        Owner & các Manager sẽ nhận thông báo để xem xét lại phân công một cách công minh.
      </p>
      <textarea
        className="input min-h-24"
        placeholder="vd: Task này trùng với việc Manager A giao hôm qua / quá tải / thiếu thông tin…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {err && <p className="mt-2 text-sm text-danger">⚠ {err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        {task?.flagged && (
          <button className="btn btn-ghost" onClick={() => submit(false)}>
            Gỡ cờ
          </button>
        )}
        <button className="btn btn-primary" onClick={() => submit(true)}>
          ⚑ Gửi
        </button>
      </div>
    </Modal>
  );
}

function ReviewModal({
  task,
  members,
  onClose,
  onDone,
}: {
  task: Task | null;
  members: MemberWithProfile[];
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Modal open={!!task} onClose={onClose} title="Xem xét phân công">
      {task && <ReviewForm key={task.id} task={task} members={members} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function ReviewForm({
  task,
  members,
  onClose,
  onDone,
}: {
  task: Task;
  members: MemberWithProfile[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState(task.review_note ?? "");
  const [assignee, setAssignee] = useState(task.assignee_id ?? "");
  const [resolve, setResolve] = useState(task.flagged);
  const [due, setDue] = useState(task.due_date ?? "");
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const { error } = await createClient()
      .from("tasks")
      .update({
        review_note: note.trim() || null,
        assignee_id: assignee || null,
        due_date: due || null,
        ...(resolve ? { flagged: false } : {}),
      })
      .eq("id", task.id);
    if (error) return setErr(error.message);
    onClose();
    onDone();
  }

  return (
    <div className="space-y-3">
      <p className="font-semibold">{task.title}</p>
      {task.flagged && (
        <p className="sketch bg-white px-3 py-2 text-sm text-danger">⚑ {task.flag_reason || "Member báo có vấn đề"}</p>
      )}
      <div>
        <label className="label">Giao lại cho</label>
        <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">— chưa giao —</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {displayName(m.profile)} ({m.role})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Hạn</label>
        <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <div>
        <label className="label">Ghi chú xem xét (mọi người đều thấy)</label>
        <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {task.flagged && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-ink" checked={resolve} onChange={(e) => setResolve(e.target.checked)} />
          Đánh dấu đã giải quyết (gỡ cờ)
        </label>
      )}
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
