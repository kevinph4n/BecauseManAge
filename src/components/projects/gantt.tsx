"use client";

import { useMemo, useState } from "react";
import { Avatar, EmptyState } from "@/components/ui";
import { groupMarks, milestoneState, phaseColor } from "@/lib/progress";
import type { MemberWithProfile, Milestone, MilestoneMark, Project, Task } from "@/lib/types";
import { TASK_STATUS_LABEL, addDays, cn, diffDays, displayName, formatDate, parseDate, startOfDay, toISODate } from "@/lib/utils";

type Row =
  | { type: "phase"; phase: number }
  | { type: "milestone"; m: Milestone; state: ReturnType<typeof milestoneState> }
  | { type: "task"; t: Task }
  | { type: "group"; label: string };

const LEFT = 260;

function span(start: string | null, end: string | null) {
  const s = start ?? end;
  const e = end ?? start;
  if (!s || !e) return null;
  const a = parseDate(s);
  const b = parseDate(e);
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function Gantt({
  project,
  milestones,
  marks,
  tasks,
  members,
}: {
  project: Project;
  milestones: Milestone[];
  marks: MilestoneMark[];
  tasks: Task[];
  members: MemberWithProfile[];
}) {
  const [scale, setScale] = useState<"day" | "week">("day");
  const px = scale === "day" ? 34 : 12;
  const byMs = useMemo(() => groupMarks(marks), [marks]);
  const today = startOfDay(new Date());

  const { rows, rangeStart, days, unscheduled } = useMemo(() => {
    const rows: Row[] = [];
    const sorted = [...milestones].sort(
      (a, b) => a.phase - b.phase || a.position - b.position || a.created_at.localeCompare(b.created_at),
    );
    let lastPhase = 0;
    for (const m of sorted) {
      if (m.phase !== lastPhase) {
        rows.push({ type: "phase", phase: m.phase });
        lastPhase = m.phase;
      }
      rows.push({ type: "milestone", m, state: milestoneState(byMs.get(m.id) ?? []) });
      tasks.filter((t) => t.milestone_id === m.id).forEach((t) => rows.push({ type: "task", t }));
    }
    const loose = tasks.filter((t) => !t.milestone_id || !milestones.some((m) => m.id === t.milestone_id));
    if (loose.length) {
      rows.push({ type: "group", label: "Task không thuộc milestone" });
      loose.forEach((t) => rows.push({ type: "task", t }));
    }

    const dates: Date[] = [today];
    const add = (s: string | null) => s && dates.push(parseDate(s));
    milestones.forEach((m) => (add(m.start_date), add(m.due_date)));
    tasks.forEach((t) => (add(t.start_date), add(t.due_date)));
    add(project.start_date);
    add(project.end_date);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const rangeStart = addDays(min, -3);
    const days = Math.max(diffDays(max, rangeStart) + 10, 30);

    const unscheduled = [
      ...milestones.filter((m) => !m.start_date && !m.due_date).map((m) => `◆ ${m.title}`),
      ...tasks.filter((t) => !t.start_date && !t.due_date).map((t) => `■ ${t.title}`),
    ];
    return { rows, rangeStart, days, unscheduled };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, tasks, byMs, project.start_date, project.end_date]);

  if (!milestones.length && !tasks.length) {
    return <EmptyState title="Chưa có gì để vẽ Gantt">Thêm milestones / tasks có ngày bắt đầu & hạn nhé.</EmptyState>;
  }

  const width = days * px;
  const dayList = Array.from({ length: days }, (_, i) => addDays(rangeStart, i));
  const todayX = diffDays(today, rangeStart) * px;
  const projectEndX = project.end_date ? (diffDays(parseDate(project.end_date), rangeStart) + 1) * px : null;
  const profileOf = (id: string | null) => members.find((m) => m.user_id === id)?.profile;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-smoke">Thang:</span>
        <button className={cn("btn btn-sm", scale === "day" && "btn-primary")} onClick={() => setScale("day")}>
          Ngày
        </button>
        <button className={cn("btn btn-sm", scale === "week" && "btn-primary")} onClick={() => setScale("week")}>
          Tuần
        </button>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-smoke">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-6 border border-ink bg-ms-2" /> mốc xong
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="hatch inline-block h-3 w-6 border border-ink bg-ms-2 opacity-50" /> mốc chưa xong
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-6 border border-ink bg-white" /> task
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-[2px] bg-danger" /> hôm nay
          </span>
        </span>
      </div>

      <div className="box thin-scroll overflow-x-auto p-0!">
        <div style={{ width: LEFT + width }} className="relative">
          {/* header */}
          <div className="sticky top-0 z-10 flex border-b-[1.5px] border-ink bg-fog">
            <div className="sticky left-0 z-20 shrink-0 border-r-[1.5px] border-ink bg-fog px-3 py-2 text-sm font-semibold" style={{ width: LEFT }}>
              Milestone / Task
            </div>
            <div className="relative" style={{ width, height: 44 }}>
              {dayList.map((d, i) => {
                const first = d.getDate() === 1 || i === 0;
                const showDay = scale === "day" || d.getDay() === 1;
                return (
                  <div key={i} className="absolute top-0 h-full" style={{ left: i * px, width: px }}>
                    {first && (
                      <span className="absolute top-0.5 left-1 text-[11px] font-semibold whitespace-nowrap">
                        Th{d.getMonth() + 1}/{d.getFullYear()}
                      </span>
                    )}
                    {showDay && (
                      <span
                        className={cn(
                          "absolute bottom-1 left-0 w-full text-center text-[10px]",
                          sameDayIso(d, today) ? "font-bold" : "text-smoke",
                          scale === "week" && "w-auto pl-0.5 text-left",
                        )}
                      >
                        {d.getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* body */}
          <div className="relative">
            {/* grid weekends */}
            <div className="pointer-events-none absolute inset-y-0" style={{ left: LEFT, width }}>
              {dayList.map((d, i) =>
                d.getDay() === 0 || d.getDay() === 6 ? (
                  <div key={i} className="absolute inset-y-0 bg-fog/70" style={{ left: i * px, width: px }} />
                ) : d.getDay() === 1 ? (
                  <div key={i} className="absolute inset-y-0 border-l border-line" style={{ left: i * px }} />
                ) : null,
              )}
              <div className="absolute inset-y-0 w-[2px] bg-danger" style={{ left: todayX + px / 2 }} />
              {projectEndX !== null && (
                <div className="absolute inset-y-0 border-l-2 border-dashed border-ink" style={{ left: projectEndX }} title="Hạn dự án" />
              )}
            </div>

            {rows.map((r, i) => {
              if (r.type === "phase" || r.type === "group") {
                return (
                  <div key={i} className="relative flex border-b border-line bg-paper">
                    <div className="sticky left-0 z-[5] shrink-0 bg-paper px-3 py-1.5" style={{ width: LEFT }}>
                      {r.type === "phase" ? (
                        <span className="chip" style={{ background: phaseColor(r.phase) }}>
                          Phase {r.phase}
                        </span>
                      ) : (
                        <span className="h-hand text-lg">{r.label}</span>
                      )}
                    </div>
                  </div>
                );
              }
              const isMs = r.type === "milestone";
              const sp = isMs ? span(r.m.start_date, r.m.due_date) : span(r.t.start_date, r.t.due_date);
              const left = sp ? diffDays(sp.start, rangeStart) * px : 0;
              const w = sp ? (diffDays(sp.end, sp.start) + 1) * px : 0;
              return (
                <div key={i} className="relative flex border-b border-line hover:bg-fog/40">
                  <div
                    className="sticky left-0 z-[5] flex shrink-0 items-center gap-2 border-r-[1.5px] border-ink bg-white px-3 py-1.5 text-sm"
                    style={{ width: LEFT }}
                  >
                    {isMs ? (
                      <>
                        <span style={{ color: phaseColor(r.m.phase) }} className="text-lg leading-none drop-shadow-[0_0_0.5px_#111]">
                          ◆
                        </span>
                        <span className={cn("truncate font-semibold", r.state === "completed" && "line-through")}>{r.m.title}</span>
                      </>
                    ) : (
                      <>
                        <span className="pl-5 text-smoke">└</span>
                        <Avatar profile={profileOf(r.t.assignee_id)} size={18} />
                        <span className={cn("truncate", r.t.status === "done" && "line-through text-smoke")}>{r.t.title}</span>
                      </>
                    )}
                  </div>
                  <div className="relative h-9" style={{ width }}>
                    {sp && isMs && (
                      <div
                        className={cn(
                          "absolute top-1.5 flex h-6 items-center overflow-hidden border-[1.5px] border-ink px-1.5 text-[11px] font-semibold whitespace-nowrap",
                          r.state !== "completed" && "hatch",
                        )}
                        style={{
                          left,
                          width: Math.max(w, px),
                          background: phaseColor(r.m.phase),
                          opacity: r.state === "completed" ? 1 : 0.75,
                          borderRadius: 4,
                        }}
                        title={`${r.m.title}: ${formatDate(r.m.start_date)} → ${formatDate(r.m.due_date)}`}
                      >
                        {w > 80 && r.m.title}
                      </div>
                    )}
                    {sp && !isMs && (
                      <div
                        className={cn(
                          "absolute top-3 h-3 border-[1.5px] border-ink",
                          r.t.status === "done" ? "bg-ink" : r.t.status === "in_progress" ? "bg-smoke/40" : "bg-white",
                        )}
                        style={{ left, width: Math.max(w, px / 2), borderRadius: 3 }}
                        title={`${r.t.title} — ${displayName(profileOf(r.t.assignee_id))} — ${TASK_STATUS_LABEL[r.t.status]}`}
                      />
                    )}
                    {!sp && <span className="absolute top-2 left-2 text-[11px] text-smoke">chưa có ngày</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <p className="text-xs text-smoke">
          Chưa xếp lịch ({unscheduled.length}): {unscheduled.slice(0, 12).join(" · ")}
          {unscheduled.length > 12 ? " …" : ""} — thêm ngày ở tab Milestones / Phân công.
        </p>
      )}
    </div>
  );
}

function sameDayIso(a: Date, b: Date) {
  return toISODate(a) === toISODate(b);
}
