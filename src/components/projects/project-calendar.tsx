"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { phaseColor } from "@/lib/progress";
import { createClient } from "@/lib/supabase/client";
import type { MemberWithProfile, Milestone, Project, ProjectEvent, Task } from "@/lib/types";
import {
  WEEKDAYS_VI,
  addDays,
  cn,
  displayName,
  parseDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
} from "@/lib/utils";

type Item = {
  key: string;
  kind: "milestone" | "task" | "event" | "project";
  title: string;
  time?: string;
  color?: string;
  done?: boolean;
  event?: ProjectEvent;
  who?: string;
};

type ViewMode = "month" | "week" | "day";

export function ProjectCalendar({
  projectId,
  project,
  milestones,
  tasks,
  events,
  members,
  meId,
  isManager,
}: {
  projectId: string;
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  events: ProjectEvent[];
  members: MemberWithProfile[];
  meId: string;
  isManager: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [addOpen, setAddOpen] = useState<string | null>(null); // date iso
  const [openEvent, setOpenEvent] = useState<ProjectEvent | null>(null);
  const today = toISODate(new Date());

  // gom item theo ngày
  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    const push = (iso: string, it: Item) => map.set(iso, [...(map.get(iso) ?? []), it]);
    milestones.forEach((m) => {
      if (m.due_date)
        push(m.due_date, { key: `m${m.id}`, kind: "milestone", title: m.title, color: phaseColor(m.phase) });
    });
    tasks.forEach((t) => {
      if (t.due_date)
        push(t.due_date, {
          key: `t${t.id}`,
          kind: "task",
          title: t.title,
          done: t.status === "done",
          who: displayName(members.find((m) => m.user_id === t.assignee_id)?.profile),
        });
    });
    events.forEach((e) => {
      const s = startOfDay(new Date(e.starts_at));
      const end = e.ends_at ? startOfDay(new Date(e.ends_at)) : s;
      const time = e.all_day ? undefined : new Date(e.starts_at).toTimeString().slice(0, 5);
      for (let d = s, n = 0; d <= end && n < 62; d = addDays(d, 1), n++) {
        push(toISODate(d), { key: `e${e.id}${n}`, kind: "event", title: e.title, time, event: e });
      }
    });
    if (project.end_date) push(project.end_date, { key: "pend", kind: "project", title: "Hạn chót dự án" });
    return map;
  }, [milestones, tasks, events, members, project.end_date]);

  function move(dir: -1 | 1) {
    setCursor((c) => {
      if (mode === "month") return new Date(c.getFullYear(), c.getMonth() + dir, 1);
      if (mode === "week") return addDays(c, 7 * dir);
      return addDays(c, dir);
    });
  }

  const title =
    mode === "month"
      ? `Tháng ${cursor.getMonth() + 1}/${cursor.getFullYear()}`
      : mode === "week"
        ? `Tuần ${fmt(startOfWeek(cursor))} – ${fmt(addDays(startOfWeek(cursor), 6))}`
        : `${WEEKDAYS_VI[(cursor.getDay() + 6) % 7]}, ${fmt(cursor)}/${cursor.getFullYear()}`;

  async function deleteEvent(e: ProjectEvent) {
    if (!confirm(`Xoá sự kiện "${e.title}"?`)) return;
    await createClient().from("project_events").delete().eq("id", e.id);
    setOpenEvent(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" onClick={() => move(-1)}>
          ←
        </button>
        <button className="btn btn-sm" onClick={() => setCursor(startOfDay(new Date()))}>
          Hôm nay
        </button>
        <button className="btn btn-sm" onClick={() => move(1)}>
          →
        </button>
        <h2 className="h-hand ml-2 text-2xl">{title}</h2>
        <div className="ml-auto flex gap-1">
          {(["day", "week", "month"] as ViewMode[]).map((m) => (
            <button key={m} className={cn("btn btn-sm", mode === m && "btn-primary")} onClick={() => setMode(m)}>
              {m === "day" ? "Ngày" : m === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}
          <button className="btn btn-primary btn-sm ml-2" onClick={() => setAddOpen(toISODate(cursor))}>
            + Sự kiện
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-smoke">
        <span>◆ hạn milestone</span>
        <span>■ hạn task</span>
        <span>● sự kiện</span>
        <span>⚑ hạn dự án</span>
      </div>

      {mode === "month" && (
        <MonthGrid cursor={cursor} today={today} byDay={byDay} onDay={(iso) => (setCursor(parseDate(iso)), setMode("day"))} onEvent={setOpenEvent} />
      )}
      {mode === "week" && (
        <div className="grid gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)).map((d, i) => {
            const iso = toISODate(d);
            return (
              <div key={iso} className={cn("box min-h-48 p-2", iso === today && "shadow-sketch")}>
                <button className="mb-2 flex w-full items-baseline justify-between" onClick={() => (setCursor(d), setMode("day"))}>
                  <span className="h-hand text-lg">{WEEKDAYS_VI[i]}</span>
                  <span className="text-xs text-smoke">{fmt(d)}</span>
                </button>
                <ItemList items={byDay.get(iso) ?? []} onEvent={setOpenEvent} />
              </div>
            );
          })}
        </div>
      )}
      {mode === "day" && (
        <div className="box min-h-64 p-4">
          <ItemList items={byDay.get(toISODate(cursor)) ?? []} onEvent={setOpenEvent} large />
          {!(byDay.get(toISODate(cursor)) ?? []).length && <p className="text-sm text-smoke">Ngày này trống trơn. Nghỉ ngơi đi 🌿</p>}
        </div>
      )}

      <AddEventModal
        dateIso={addOpen}
        onClose={() => setAddOpen(null)}
        projectId={projectId}
        onDone={() => startTransition(() => router.refresh())}
      />
      <Modal open={!!openEvent} onClose={() => setOpenEvent(null)} title={openEvent?.title ?? ""}>
        {openEvent && (
          <div className="space-y-2 text-sm">
            <p>
              {new Date(openEvent.starts_at).toLocaleString("vi-VN")}
              {openEvent.ends_at ? ` → ${new Date(openEvent.ends_at).toLocaleString("vi-VN")}` : ""}
            </p>
            {openEvent.description && <p className="whitespace-pre-wrap text-smoke">{openEvent.description}</p>}
            <p className="text-xs text-smoke">
              Tạo bởi {displayName(members.find((m) => m.user_id === openEvent.created_by)?.profile)}
            </p>
            {(openEvent.created_by === meId || isManager) && (
              <div className="flex justify-end">
                <button className="btn btn-sm btn-danger" onClick={() => deleteEvent(openEvent)}>
                  Xoá sự kiện
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function fmt(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function MonthGrid({
  cursor,
  today,
  byDay,
  onDay,
  onEvent,
}: {
  cursor: Date;
  today: string;
  byDay: Map<string, Item[]>;
  onDay: (iso: string) => void;
  onEvent: (e: ProjectEvent) => void;
}) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div className="box overflow-hidden p-0!">
      <div className="grid grid-cols-7 border-b-[1.5px] border-ink bg-fog">
        {WEEKDAYS_VI.map((w) => (
          <div key={w} className="h-hand py-1 text-center text-lg">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const items = byDay.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={cn(
                "min-h-24 border-line p-1 text-xs",
                i % 7 !== 6 && "border-r",
                i < 35 && "border-b",
                !inMonth && "bg-fog/50 text-smoke",
              )}
            >
              <button
                onClick={() => onDay(iso)}
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  iso === today ? "bg-ink font-bold text-white" : "hover:bg-fog",
                )}
              >
                {d.getDate()}
              </button>
              <ItemList items={items.slice(0, 3)} onEvent={onEvent} />
              {items.length > 3 && (
                <button className="text-[11px] text-smoke underline" onClick={() => onDay(iso)}>
                  +{items.length - 3} nữa
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemList({ items, onEvent, large }: { items: Item[]; onEvent: (e: ProjectEvent) => void; large?: boolean }) {
  return (
    <ul className={cn("space-y-1", large && "space-y-2")}>
      {items.map((it) => (
        <li key={it.key}>
          <button
            onClick={() => it.event && onEvent(it.event)}
            className={cn(
              "flex w-full items-center gap-1 truncate rounded px-1 text-left",
              large ? "py-1.5 text-sm" : "text-[11px]",
              it.kind === "event" && "bg-ink text-white",
              it.kind === "milestone" && "border border-ink",
              it.kind === "project" && "border border-dashed border-ink font-bold",
              it.done && "line-through opacity-60",
            )}
            style={it.kind === "milestone" ? { background: it.color } : undefined}
            title={it.title}
          >
            <span>{it.kind === "milestone" ? "◆" : it.kind === "task" ? "■" : it.kind === "event" ? "●" : "⚑"}</span>
            {it.time && <span className="font-mono">{it.time}</span>}
            <span className="truncate">{it.title}</span>
            {large && it.who && <span className="ml-auto text-xs text-smoke">→ {it.who}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddEventModal({
  dateIso,
  onClose,
  projectId,
  onDone,
}: {
  dateIso: string | null;
  onClose: () => void;
  projectId: string;
  onDone: () => void;
}) {
  return (
    <Modal open={!!dateIso} onClose={onClose} title="Sự kiện mới">
      {dateIso && <AddEventForm key={dateIso} dateIso={dateIso} projectId={projectId} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function AddEventForm({
  dateIso,
  projectId,
  onClose,
  onDone,
}: {
  dateIso: string;
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dateIso);
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return setErr("Nhập tên sự kiện");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const startsAt = new Date(`${date}T${time || "00:00"}:00`);
    const endsAt = endDate ? new Date(`${endDate}T23:59:00`) : null;
    const { error } = await supabase.from("project_events").insert({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      all_day: !time,
      created_by: user?.id,
    });
    if (error) return setErr(error.message);
    onClose();
    onDone();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Tên sự kiện</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Họp tuần, demo, deadline nộp bài…" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Ngày</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Giờ (tuỳ)</label>
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Mô tả</label>
        <textarea className="input min-h-16" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {err && <p className="text-sm text-danger">⚠ {err}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-primary" onClick={submit}>
          Thêm
        </button>
      </div>
    </div>
  );
}
