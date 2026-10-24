// Kiểu dữ liệu khớp với supabase/schema.sql
// (Sau này chuyển sang Supabase CLI có thể generate tự động: `supabase gen types typescript`)

export type Role = "owner" | "manager" | "member";
export type MarkStatus = "in_progress" | "completed" | "hiatus";
export type TaskStatus = "todo" | "in_progress" | "done" | "hiatus";
export type Priority = "low" | "moderate" | "high";
export type LabelKind = "field" | "custom" | "need";
export type ProjectStatus = "active" | "completed" | "archived";

export interface Field {
  id: string;
  label: string;
  position: number;
}

export interface PersonalInfo {
  location?: string;
  pronouns?: string;
  birthday?: string;
  company?: string;
  school?: string;
  website?: string;
  languages?: string;
  contact?: string;
}

export interface ProfileTheme {
  banner?: "dots" | "grid" | "lines" | "cross" | "plain";
  font?: "sans" | "hand" | "mono" | "serif";
  invert?: boolean;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  field_id: string | null;
  avatar_url: string | null;
  status_emoji: string | null;
  status_text: string | null;
  personal_info: PersonalInfo;
  links: { label: string; url: string }[];
  theme: ProfileTheme;
  created_at: string;
}

export type MiniProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  left_at: string | null;
}

export interface MemberWithProfile extends ProjectMember {
  profile: MiniProfile;
}

export interface ProjectLabel {
  id: string;
  project_id: string;
  kind: LabelKind;
  text: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  phase: number;
  position: number;
  start_date: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MilestoneMark {
  milestone_id: string;
  user_id: string;
  status: MarkStatus;
  marked_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  flagged: boolean;
  flag_reason: string | null;
  flagged_by: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalPriority {
  id: string;
  user_id: string;
  task_id: string | null;
  milestone_id: string | null;
  priority: Priority;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  created_by: string | null;
}

export interface ClipBlock {
  html: string;
  style: BlockStyle;
}

export interface MemberNote {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  body: string | null;
  clip: { mindmap_id: string; mindmap_title: string; blocks: ClipBlock[] } | null;
  created_at: string;
  updated_at: string;
}

export interface NoteRead {
  note_id: string;
  user_id: string;
  read_at: string;
}

export interface Commit {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: "manual" | "milestone" | "task" | "note" | "project";
  message: string;
  ref_id: string | null;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  project_id: string;
  kind: "all" | "members" | "custom" | "management";
  name: string;
  created_by: string | null;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  project_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  kind: "post" | "article" | "share";
  title: string | null;
  body: string;
  link_url: string | null;
  tags: string[];
  reply_count: number;
  bumped_at: string;
  created_at: string;
}

export interface PostReply {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

// ---------- Mindmap ----------
export type BlockFont = "sans" | "serif" | "mono" | "hand";

export interface BlockStyle {
  font: BlockFont;
  size: number; // px
  bg: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  border: "sketch" | "solid" | "dashed" | "none";
}

export interface MindNode {
  id: string;
  x: number;
  y: number;
  w: number;
  html: string;
  style: BlockStyle;
}

export interface MindEdge {
  id: string;
  from: string;
  to: string;
}

export interface MindmapData {
  nodes: MindNode[];
  edges: MindEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface Mindmap {
  id: string;
  owner_id: string;
  title: string;
  data: MindmapData;
  created_at: string;
  updated_at: string;
}
