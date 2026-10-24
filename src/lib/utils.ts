import type { LabelKind, MarkStatus, MiniProfile, Priority, Role, TaskStatus } from "./types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function displayName(p?: Pick<MiniProfile, "username" | "display_name"> | null) {
  if (!p) return "Ai đó";
  return p.display_name?.trim() || p.username;
}

export function shortHash(id: string) {
  return id.replace(/-/g, "").slice(0, 7);
}

// ---------------- Dates (tự viết cho gọn, khỏi cài thêm thư viện) ----------------

/** "2026-10-24" → Date (giờ địa phương, 00:00) */
export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Date → "2026-10-24" theo giờ địa phương */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Tuần bắt đầu từ Thứ 2 */
export function startOfWeek(d: Date) {
  const r = startOfDay(d);
  const dow = (r.getDay() + 6) % 7; // 0 = Mon
  return addDays(r, -dow);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sameDay(a: Date, b: Date) {
  return toISODate(a) === toISODate(b);
}

export const WEEKDAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function formatDate(s: string | null | undefined, withYear = false) {
  if (!s) return "—";
  const d = s.length <= 10 ? parseDate(s) : new Date(s);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear ? `${dd}/${mm}/${d.getFullYear()}` : `${dd}/${mm}`;
}

export function formatDateTime(s: string) {
  const d = new Date(s);
  return `${formatDate(s, true)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function timeAgo(s: string) {
  const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}

// ---------------- Labels / enums ----------------

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  member: "Member",
};

export const MARK_LABEL: Record<MarkStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  hiatus: "Hiatus",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  hiatus: "Hiatus",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

/** Thứ tự & màu label theo yêu cầu: 1 vàng (ngành) · 2 sky (tự gắn) · 3 trắng nền đen (nhu cầu) */
export const LABEL_KINDS: { kind: LabelKind; name: string; className: string }[] = [
  { kind: "field", name: "Ngành nghề", className: "bg-label-field text-ink border-ink" },
  { kind: "custom", name: "Label tự gắn", className: "bg-label-sky text-ink border-ink" },
  { kind: "need", name: "Nhu cầu", className: "bg-ink text-white border-ink" },
];

export const NEED_PRESETS = [
  "Công việc",
  "Gia đình",
  "Chi tiêu",
  "Học tập",
  "Sức khỏe",
  "Cá nhân",
  "Cộng đồng",
  "Du lịch",
];

export function labelOrder(kind: LabelKind) {
  return kind === "field" ? 0 : kind === "custom" ? 1 : 2;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Chỉ cho phép link http(s) — chặn javascript: & co. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+/.test(u)) return `https://${u}`;
  return null;
}
