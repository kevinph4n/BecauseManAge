import type { MarkStatus, Milestone, MilestoneMark } from "./types";

/**
 * Màu xanh lá theo phase: phase 1 nhạt nhất, mỗi lần "Mở rộng dự án" đậm hơn 1 bậc.
 * Quá 7 phase thì giữ màu đậm nhất.
 */
export const PHASE_GREENS = ["#cdeccd", "#a3d9a3", "#76c27a", "#4ea457", "#2f8a3b", "#1b6a27", "#0c4716"];

export function phaseColor(phase: number) {
  return PHASE_GREENS[Math.min(Math.max(phase, 1), PHASE_GREENS.length) - 1];
}

/** Chữ trên nền xanh: phase đậm thì chữ trắng */
export function phaseTextColor(phase: number) {
  return phase >= 4 ? "#ffffff" : "#111111";
}

export type MilestoneState = MarkStatus | "open";

/**
 * Trạng thái tổng của 1 milestone, gộp từ mark của các thành viên.
 * Luật đơn giản: có ai đánh Completed → Completed; không thì In progress; không thì Hiatus; không thì Open.
 * (Muốn đổi luật, ví dụ "cần tất cả đồng ý", chỉ cần sửa hàm này.)
 */
export function milestoneState(marks: MilestoneMark[]): MilestoneState {
  if (marks.some((m) => m.status === "completed")) return "completed";
  if (marks.some((m) => m.status === "in_progress")) return "in_progress";
  if (marks.some((m) => m.status === "hiatus")) return "hiatus";
  return "open";
}

export function groupMarks(marks: MilestoneMark[]) {
  const map = new Map<string, MilestoneMark[]>();
  for (const m of marks) {
    const arr = map.get(m.milestone_id) ?? [];
    arr.push(m);
    map.set(m.milestone_id, arr);
  }
  return map;
}

export interface PhaseSummary {
  phase: number;
  total: number;
  done: number;
  share: number; // % độ dài trên thanh tiến độ
}

export interface ProgressSummary {
  total: number;
  done: number;
  percent: number;
  phases: PhaseSummary[];
  /** milestone đã sort theo phase → position, kèm state */
  ordered: { milestone: Milestone; state: MilestoneState }[];
}

/**
 * Tiến độ = số milestone Completed / tổng milestone (làm tròn).
 * Ví dụ: 10/10 xong = 100%. Mở rộng thêm 1 mốc → 10/11 = 91%.
 */
export function computeProgress(milestones: Milestone[], marks: MilestoneMark[]): ProgressSummary {
  const byMs = groupMarks(marks);
  const ordered = [...milestones]
    .sort((a, b) => a.phase - b.phase || a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((milestone) => ({ milestone, state: milestoneState(byMs.get(milestone.id) ?? []) }));

  const total = ordered.length;
  const done = ordered.filter((o) => o.state === "completed").length;

  const phaseMap = new Map<number, PhaseSummary>();
  for (const o of ordered) {
    const p = phaseMap.get(o.milestone.phase) ?? { phase: o.milestone.phase, total: 0, done: 0, share: 0 };
    p.total += 1;
    if (o.state === "completed") p.done += 1;
    phaseMap.set(o.milestone.phase, p);
  }
  const phases = [...phaseMap.values()]
    .sort((a, b) => a.phase - b.phase)
    .map((p) => ({ ...p, share: total ? (p.total / total) * 100 : 0 }));

  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
    phases,
    ordered,
  };
}
