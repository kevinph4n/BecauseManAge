-- =====================================================================
--  BecauseManAge — Supabase schema v1
--  "Because man age" → vì con người sẽ già đi, nên làm gì làm cho tử tế.
--  "Because manage"  → vì cần quản lý.
--
--  CÁCH DÙNG: Supabase Dashboard → SQL Editor → New query → dán TOÀN BỘ
--  file này → Run. Chạy 1 lần trên project mới tinh.
--  Muốn chạy lại từ đầu: chạy supabase/reset.sql trước (XÓA SẠCH DATA).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. FIELDS (ngành nghề) — bảng tra cứu, thêm bớt thoải mái
-- ---------------------------------------------------------------------
create table public.fields (
  id        text primary key,
  label     text not null,
  position  int  not null default 0
);

insert into public.fields (id, label, position) values
  ('engineering', 'Engineering',            1),
  ('technology',  'Technology / IT',        2),
  ('design',      'Design & Creative',      3),
  ('business',    'Business',               4),
  ('finance',     'Finance & Accounting',   5),
  ('marketing',   'Marketing & Sales',      6),
  ('education',   'Education',              7),
  ('science',     'Science & Research',     8),
  ('healthcare',  'Healthcare',             9),
  ('law',         'Law & Policy',          10),
  ('media',       'Arts, Media & Content', 11),
  ('hospitality', 'Hospitality & F&B',     12),
  ('public',      'Public Sector & NGO',   13),
  ('student',     'Student',               14),
  ('other',       'Other',                 99);

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  display_name   text check (char_length(display_name) <= 60),
  bio            text check (char_length(bio) <= 600),
  field_id       text references public.fields(id) on delete set null,
  avatar_url     text,
  status_emoji   text check (char_length(status_emoji) <= 8),
  status_text    text check (char_length(status_text) <= 80),
  -- Thông tin cá nhân: KHÔNG bắt buộc. Điền gì thì cái đó public.
  -- {location, pronouns, birthday, company, school, website, languages, contact}
  personal_info  jsonb not null default '{}'::jsonb,
  -- [{label, url}]
  links          jsonb not null default '[]'::jsonb,
  -- personalization: {banner: 'dots'|'grid'|'lines'|'cross'|'plain', font: 'sans'|'hand'|'mono'|'serif', invert: bool}
  theme          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------------------------------------------------------------------
-- 2. MINDMAP NOTES (Tính năng 1)
--    Lưu cả bảng dưới dạng JSON: {nodes:[...], edges:[...], viewport:{...}}
-- ---------------------------------------------------------------------
create table public.mindmaps (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title       text not null default 'Untitled' check (char_length(title) <= 120),
  data        jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. PROJECTS
-- ---------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  status       text not null default 'active' check (status in ('active','completed','archived')),
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','manager','member')),
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,                       -- null = đang tham gia
  primary key (project_id, user_id)
);

-- Labels: field (vàng, vị trí 1) · custom (xanh sky, vị trí 2) · need (trắng nền đen, vị trí 3)
create table public.project_labels (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  kind        text not null check (kind in ('field','custom','need')),
  text        text not null check (char_length(text) between 1 and 40),
  created_at  timestamptz not null default now()
);

-- Milestones. phase = 1 cho bộ mốc ban đầu, mỗi lần "Mở rộng dự án" → phase + 1
create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  phase        int  not null default 1 check (phase >= 1),
  position     int  not null default 0,
  start_date   date,
  due_date     date,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Mỗi thành viên có 1 "mark" trên mỗi milestone. Nhiều thành viên có thể mark cùng trạng thái.
create table public.milestone_marks (
  milestone_id  uuid not null references public.milestones(id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status        text not null check (status in ('in_progress','completed','hiatus')),
  marked_at     timestamptz not null default now(),
  primary key (milestone_id, user_id)
);

-- Tasks = việc được Owner/Manager giao
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  milestone_id  uuid references public.milestones(id) on delete set null,
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  assignee_id   uuid references public.profiles(id) on delete set null,
  assigned_by   uuid references public.profiles(id) on delete set null,
  assigned_at   timestamptz,
  status        text not null default 'todo' check (status in ('todo','in_progress','done','hiatus')),
  start_date    date,
  due_date      date,
  -- member báo "có vấn đề" → manager khác vào xem xét
  flagged       boolean not null default false,
  flag_reason   text,
  flagged_by    uuid references public.profiles(id) on delete set null,
  review_note   text,
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Priority CÁ NHÂN: mỗi người tự đặt, người khác KHÔNG thấy (RLS chặn ở DB)
create table public.personal_priorities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  task_id       uuid references public.tasks(id) on delete cascade,
  milestone_id  uuid references public.milestones(id) on delete cascade,
  priority      text not null check (priority in ('low','moderate','high')),
  updated_at    timestamptz not null default now(),
  check ((task_id is null) <> (milestone_id is null)),
  unique (user_id, task_id),
  unique (user_id, milestone_id)
);

create table public.project_events (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default true,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Note của từng thành viên để lại cho người sau. clip = khối trích xuất từ mindmap (snapshot)
create table public.member_notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  body        text,
  clip        jsonb,   -- {mindmap_id, mindmap_title, blocks:[{html, style}]}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.note_reads (
  note_id  uuid not null references public.member_notes(id) on delete cascade,
  user_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- "Commit" — nhật ký đóng góp kiểu git. Tự sinh khi mark milestone / đổi status task / viết note, hoặc tự commit tay.
create table public.commits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  kind        text not null default 'manual' check (kind in ('manual','milestone','task','note','project')),
  message     text not null check (char_length(message) between 1 and 300),
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

-- Chat 4 tầng: all (toàn dự án) · members (chỉ Members) · custom (tuỳ chọn) · management (Owner + Managers)
create table public.chat_channels (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  kind        text not null check (kind in ('all','members','custom','management')),
  name        text not null check (char_length(name) between 1 and 60),
  created_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.chat_channel_members (
  channel_id  uuid not null references public.chat_channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  primary key (channel_id, user_id)
);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.chat_channels(id) on delete cascade,
  sender_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  project_id  uuid references public.projects(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. THREADS (bài viết kiểu forum/facebook)
-- ---------------------------------------------------------------------
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind        text not null default 'post' check (kind in ('post','article','share')),
  title       text check (char_length(title) <= 200),
  body        text not null check (char_length(body) between 1 and 20000),
  link_url    text,
  tags        text[] not null default '{}',
  reply_count int not null default 0,
  bumped_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.post_replies (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now()
);

-- Pin dự án nổi bật lên profile
create table public.profile_pins (
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  position    int not null default 0,
  primary key (user_id, project_id)
);

-- Indexes
create index on public.project_members (user_id);
create index on public.milestones (project_id, phase, position);
create index on public.tasks (project_id);
create index on public.tasks (assignee_id);
create index on public.project_events (project_id, starts_at);
create index on public.member_notes (project_id, created_at desc);
create index on public.commits (user_id, created_at);
create index on public.commits (project_id, created_at desc);
create index on public.chat_messages (channel_id, created_at);
create index on public.notifications (user_id, created_at desc);
create index on public.posts (bumped_at desc);
create index on public.posts (author_id);
create index on public.post_replies (post_id, created_at);
create index on public.mindmaps (owner_id, updated_at desc);

-- =====================================================================
-- 5. HELPER FUNCTIONS (security definer → tránh đệ quy RLS)
-- =====================================================================
create or replace function public.project_role(p_project uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.project_members
  where project_id = p_project and user_id = auth.uid() and left_at is null
$$;

create or replace function public.is_project_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid() and left_at is null
  )
$$;

create or replace function public.is_project_manager(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid() and left_at is null
      and role in ('owner','manager')
  )
$$;

create or replace function public.was_ever_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid()
  )
$$;

create or replace function public.milestone_project(p_milestone uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select project_id from public.milestones where id = p_milestone
$$;

create or replace function public.task_project(p_task uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select project_id from public.tasks where id = p_task
$$;

create or replace function public.note_project(p_note uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select project_id from public.member_notes where id = p_note
$$;

create or replace function public.can_access_channel(p_channel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case c.kind
      when 'all'        then public.is_project_member(c.project_id)
      when 'members'    then public.project_role(c.project_id) = 'member'
      when 'management' then public.project_role(c.project_id) in ('owner','manager')
      when 'custom'     then public.is_project_member(c.project_id) and exists (
                               select 1 from public.chat_channel_members m
                               where m.channel_id = c.id and m.user_id = auth.uid())
      else false end
    from public.chat_channels c where c.id = p_channel
  ), false)
$$;

-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================================
alter table public.fields               enable row level security;
alter table public.profiles             enable row level security;
alter table public.follows              enable row level security;
alter table public.mindmaps             enable row level security;
alter table public.projects             enable row level security;
alter table public.project_members      enable row level security;
alter table public.project_labels       enable row level security;
alter table public.milestones           enable row level security;
alter table public.milestone_marks      enable row level security;
alter table public.tasks                enable row level security;
alter table public.personal_priorities  enable row level security;
alter table public.project_events       enable row level security;
alter table public.member_notes         enable row level security;
alter table public.note_reads           enable row level security;
alter table public.commits              enable row level security;
alter table public.chat_channels        enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.notifications        enable row level security;
alter table public.posts                enable row level security;
alter table public.post_replies         enable row level security;
alter table public.profile_pins         enable row level security;

-- fields: ai cũng đọc được
create policy "fields read" on public.fields for select using (true);

-- profiles: user đã đăng nhập đọc được hết, tự sửa của mình
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- follows
create policy "follows read"   on public.follows for select to authenticated using (true);
create policy "follows insert" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follows delete" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- mindmaps: chỉ chủ
create policy "mindmaps all" on public.mindmaps for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- projects
create policy "projects read" on public.projects for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_project_member(id));
create policy "projects insert" on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "projects update" on public.projects for update to authenticated
  using (public.is_project_manager(id)) with check (public.is_project_manager(id));
create policy "projects delete" on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- project_members
create policy "members read" on public.project_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_project_member(project_id));
create policy "members insert" on public.project_members for insert to authenticated
  with check (public.is_project_manager(project_id) and role <> 'owner');
create policy "members update" on public.project_members for update to authenticated
  using (public.is_project_manager(project_id) or user_id = (select auth.uid()))
  with check (public.is_project_manager(project_id) or user_id = (select auth.uid()));
create policy "members delete" on public.project_members for delete to authenticated
  using (public.is_project_manager(project_id) and role <> 'owner');

-- labels
create policy "labels read"  on public.project_labels for select to authenticated using (public.is_project_member(project_id));
create policy "labels write" on public.project_labels for all to authenticated
  using (public.is_project_manager(project_id)) with check (public.is_project_manager(project_id));

-- milestones
create policy "milestones read"  on public.milestones for select to authenticated using (public.is_project_member(project_id));
create policy "milestones write" on public.milestones for all to authenticated
  using (public.is_project_manager(project_id)) with check (public.is_project_manager(project_id));

-- milestone marks: ai trong dự án cũng xem, mỗi người tự mark của mình
create policy "marks read" on public.milestone_marks for select to authenticated
  using (public.is_project_member(public.milestone_project(milestone_id)));
create policy "marks insert" on public.milestone_marks for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_project_member(public.milestone_project(milestone_id)));
create policy "marks update" on public.milestone_marks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "marks delete" on public.milestone_marks for delete to authenticated
  using (user_id = (select auth.uid()));

-- tasks
create policy "tasks read"   on public.tasks for select to authenticated using (public.is_project_member(project_id));
create policy "tasks insert" on public.tasks for insert to authenticated with check (public.is_project_manager(project_id));
create policy "tasks update" on public.tasks for update to authenticated
  using (public.is_project_manager(project_id) or assignee_id = (select auth.uid()))
  with check (public.is_project_member(project_id));
create policy "tasks delete" on public.tasks for delete to authenticated using (public.is_project_manager(project_id));

-- personal priorities: CHỈ CHÍNH MÌNH
create policy "priorities own" on public.personal_priorities for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- events
create policy "events read"   on public.project_events for select to authenticated using (public.is_project_member(project_id));
create policy "events insert" on public.project_events for insert to authenticated
  with check (public.is_project_member(project_id) and created_by = (select auth.uid()));
create policy "events modify" on public.project_events for update to authenticated
  using (created_by = (select auth.uid()) or public.is_project_manager(project_id));
create policy "events delete" on public.project_events for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_project_manager(project_id));

-- member notes
create policy "notes read"   on public.member_notes for select to authenticated using (public.is_project_member(project_id));
create policy "notes insert" on public.member_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_project_member(project_id));
create policy "notes update" on public.member_notes for update to authenticated using (author_id = (select auth.uid()));
create policy "notes delete" on public.member_notes for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_project_manager(project_id));

create policy "note reads read" on public.note_reads for select to authenticated
  using (public.is_project_member(public.note_project(note_id)));
create policy "note reads insert" on public.note_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_project_member(public.note_project(note_id)));
create policy "note reads update" on public.note_reads for update to authenticated
  using (user_id = (select auth.uid()));

-- commits
create policy "commits read" on public.commits for select to authenticated
  using ((project_id is null and user_id = (select auth.uid())) or public.is_project_member(project_id));
create policy "commits insert" on public.commits for insert to authenticated
  with check (user_id = (select auth.uid()) and (project_id is null or public.is_project_member(project_id)));
create policy "commits delete" on public.commits for delete to authenticated
  using (user_id = (select auth.uid()) and kind = 'manual');

-- chat
create policy "channels read" on public.chat_channels for select to authenticated
  using (public.can_access_channel(id) or (kind = 'custom' and public.is_project_manager(project_id)));
create policy "channels delete" on public.chat_channels for delete to authenticated
  using (kind = 'custom' and public.is_project_manager(project_id));
create policy "channel members read" on public.chat_channel_members for select to authenticated
  using (public.can_access_channel(channel_id)
         or public.is_project_manager((select c.project_id from public.chat_channels c where c.id = channel_id)));
create policy "messages read" on public.chat_messages for select to authenticated
  using (public.can_access_channel(channel_id));
create policy "messages insert" on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_access_channel(channel_id));
create policy "messages delete" on public.chat_messages for delete to authenticated
  using (sender_id = (select auth.uid()));

-- notifications: chỉ của mình (insert do trigger làm)
create policy "notif read"   on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notif update" on public.notifications for update to authenticated using (user_id = (select auth.uid()));
create policy "notif delete" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- posts
create policy "posts read"   on public.posts for select to authenticated using (true);
create policy "posts insert" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy "posts update" on public.posts for update to authenticated using (author_id = (select auth.uid()));
create policy "posts delete" on public.posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "replies read"   on public.post_replies for select to authenticated using (true);
create policy "replies insert" on public.post_replies for insert to authenticated with check (author_id = (select auth.uid()));
create policy "replies delete" on public.post_replies for delete to authenticated using (author_id = (select auth.uid()));

-- pins
create policy "pins read"   on public.profile_pins for select to authenticated using (true);
create policy "pins insert" on public.profile_pins for insert to authenticated
  with check (user_id = (select auth.uid()) and public.was_ever_member(project_id));
create policy "pins update" on public.profile_pins for update to authenticated using (user_id = (select auth.uid()));
create policy "pins delete" on public.profile_pins for delete to authenticated using (user_id = (select auth.uid()));

-- =====================================================================
-- 7. TRIGGERS
-- =====================================================================

-- 7.1 Tạo profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_base text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if v_username !~ '^[a-z0-9_.]{3,30}$'
     or exists (select 1 from public.profiles where username = v_username) then
    v_base := left(regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
    if v_base = '' then v_base := 'user'; end if;
    v_username := v_base || '_' || substr(md5(random()::text), 1, 5);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, nullif(new.raw_user_meta_data->>'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7.2 updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger t_profiles_touch  before update on public.profiles     for each row execute function public.touch_updated_at();
create trigger t_projects_touch  before update on public.projects     for each row execute function public.touch_updated_at();
create trigger t_tasks_touch     before update on public.tasks        for each row execute function public.touch_updated_at();
create trigger t_mindmaps_touch  before update on public.mindmaps     for each row execute function public.touch_updated_at();
create trigger t_notes_touch     before update on public.member_notes for each row execute function public.touch_updated_at();
create trigger t_posts_touch     before update on public.posts        for each row execute function public.touch_updated_at();

-- 7.3 Tạo project → owner vào members + 3 kênh chat mặc định + commit
create or replace function public.handle_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role) values (new.id, new.owner_id, 'owner');
  insert into public.chat_channels (project_id, kind, name, created_by) values
    (new.id, 'all',        'toàn-dự-án', new.owner_id),
    (new.id, 'members',    'members',    new.owner_id),
    (new.id, 'management', 'quản-lý',    new.owner_id);
  insert into public.commits (user_id, project_id, kind, message, ref_id)
    values (new.owner_id, new.id, 'project', 'init: tạo dự án "' || new.name || '"', new.id);
  return new;
end $$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- 7.4 Bảo vệ role: chỉ Owner bổ nhiệm/bãi nhiệm Manager; không ai đổi được role owner
create or replace function public.guard_member_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and new.role <> 'owner' then
    raise exception 'Không thể đổi role của Owner';
  end if;
  if new.role = 'owner' and old.role <> 'owner' then
    raise exception 'Không thể gán role Owner';
  end if;
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(public.project_role(new.project_id), '') <> 'owner' then
    raise exception 'Chỉ Owner mới được bổ nhiệm / bãi nhiệm Manager';
  end if;
  -- Member thường chỉ được tự rời dự án (set left_at), không sửa người khác
  if auth.uid() is not null
     and not public.is_project_manager(new.project_id)
     and new.user_id <> auth.uid() then
    raise exception 'Không có quyền';
  end if;
  if old.role = 'owner' and new.left_at is not null then
    raise exception 'Owner không thể rời dự án (hãy xoá dự án hoặc chuyển giao)';
  end if;
  return new;
end $$;

create trigger t_guard_member_role
  before update on public.project_members
  for each row execute function public.guard_member_role();

-- 7.5 Notify khi được thêm vào dự án / đổi role
create or replace function public.notify_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.projects where id = new.project_id;
  if tg_op = 'INSERT' and new.role <> 'owner' then
    insert into public.notifications (user_id, actor_id, project_id, type, title, link)
    values (new.user_id, auth.uid(), new.project_id, 'member_added',
            'Bạn được thêm vào dự án "' || v_name || '"', '/projects/' || new.project_id);
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    insert into public.notifications (user_id, actor_id, project_id, type, title, link)
    values (new.user_id, auth.uid(), new.project_id, 'role_changed',
            'Role của bạn trong "' || v_name || '" giờ là ' || upper(new.role), '/projects/' || new.project_id || '/members');
  elsif tg_op = 'UPDATE' and old.left_at is not null and new.left_at is null then
    insert into public.notifications (user_id, actor_id, project_id, type, title, link)
    values (new.user_id, auth.uid(), new.project_id, 'member_added',
            'Bạn được thêm lại vào dự án "' || v_name || '"', '/projects/' || new.project_id);
  end if;
  return new;
end $$;

create trigger t_notify_membership
  after insert or update on public.project_members
  for each row execute function public.notify_membership();

-- 7.6 Tasks: tự ghi người giao, chặn member sửa linh tinh, thông báo người nhận việc
create or replace function public.prepare_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_is_manager boolean;
begin
  v_is_manager := auth.uid() is null or public.is_project_manager(new.project_id);

  if tg_op = 'UPDATE' and not v_is_manager then
    -- assignee chỉ được đổi: status, flagged, flag_reason
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.assignee_id is distinct from old.assignee_id
       or new.milestone_id is distinct from old.milestone_id
       or new.start_date is distinct from old.start_date
       or new.due_date is distinct from old.due_date
       or new.review_note is distinct from old.review_note
       or new.project_id is distinct from old.project_id then
      raise exception 'Member chỉ được cập nhật trạng thái hoặc báo vấn đề cho task của mình';
    end if;
  end if;

  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    new.assigned_by := auth.uid();
    new.assigned_at := now();
  end if;

  if new.flagged and (tg_op = 'INSERT' or not old.flagged) then
    new.flagged_by := auth.uid();
  end if;
  if not new.flagged then
    new.flagged_by := null;
  end if;

  if tg_op = 'UPDATE' and new.review_note is distinct from old.review_note then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;

create trigger t_prepare_task
  before insert or update on public.tasks
  for each row execute function public.prepare_task();

create or replace function public.after_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.projects where id = new.project_id;

  -- giao việc → thông báo người nhận
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and new.assignee_id is distinct from auth.uid() then
    insert into public.notifications (user_id, actor_id, project_id, type, title, body, link)
    values (new.assignee_id, auth.uid(), new.project_id, 'task_assigned',
            'Việc mới: ' || new.title,
            'Dự án "' || v_name || '" — vào đánh dấu tiến độ nhé.',
            '/projects/' || new.project_id || '/tasks');
  end if;

  -- member báo vấn đề → thông báo Owner + Managers
  if tg_op = 'UPDATE' and new.flagged and not old.flagged then
    insert into public.notifications (user_id, actor_id, project_id, type, title, body, link)
    select pm.user_id, auth.uid(), new.project_id, 'task_flagged',
           'Task bị báo vấn đề: ' || new.title, new.flag_reason,
           '/projects/' || new.project_id || '/tasks'
    from public.project_members pm
    where pm.project_id = new.project_id and pm.left_at is null
      and pm.role in ('owner','manager') and pm.user_id is distinct from auth.uid();
  end if;

  -- đổi status → commit
  if tg_op = 'UPDATE' and new.status is distinct from old.status and auth.uid() is not null then
    insert into public.commits (user_id, project_id, kind, message, ref_id)
    values (auth.uid(), new.project_id, 'task',
            'task(' || new.status || '): ' || new.title, new.id);
  end if;
  return new;
end $$;

create trigger t_after_task_change
  after insert or update on public.tasks
  for each row execute function public.after_task_change();

-- 7.7 Mark milestone → commit
create or replace function public.after_mark_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text; v_project uuid;
begin
  select title, project_id into v_title, v_project from public.milestones where id = new.milestone_id;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.commits (user_id, project_id, kind, message, ref_id)
    values (new.user_id, v_project, 'milestone',
            'milestone(' || replace(new.status, '_', '-') || '): ' || v_title, new.milestone_id);
  end if;
  return new;
end $$;

create trigger t_after_mark_change
  after insert or update on public.milestone_marks
  for each row execute function public.after_mark_change();

-- 7.8 Note mới → commit
create or replace function public.after_note_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.commits (user_id, project_id, kind, message, ref_id)
  values (new.author_id, new.project_id, 'note',
          case when new.clip is not null then 'clip: ' else 'note: ' end || new.title, new.id);
  return new;
end $$;

create trigger t_after_note_insert
  after insert on public.member_notes
  for each row execute function public.after_note_insert();

-- 7.9 Reply → bump thread
create or replace function public.bump_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set reply_count = reply_count + 1, bumped_at = now() where id = new.post_id;
    return new;
  else
    update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end $$;

create trigger t_bump_post
  after insert or delete on public.post_replies
  for each row execute function public.bump_post();

-- =====================================================================
-- 8. RPC FUNCTIONS
-- =====================================================================

-- Tạo kênh chat tuỳ chọn (Chat 3) — chỉ Owner/Manager
create or replace function public.create_custom_channel(p_project uuid, p_name text, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_project_manager(p_project) then
    raise exception 'Chỉ Owner/Manager được tạo kênh';
  end if;
  insert into public.chat_channels (project_id, kind, name, created_by)
  values (p_project, 'custom', p_name, auth.uid()) returning id into v_id;

  insert into public.chat_channel_members (channel_id, user_id)
  select v_id, pm.user_id from public.project_members pm
  where pm.project_id = p_project and pm.left_at is null
    and (pm.user_id = any(p_members) or pm.user_id = auth.uid())
  on conflict do nothing;
  return v_id;
end $$;

-- Thống kê profile
create or replace function public.profile_stats(p_user uuid)
returns table (active_projects int, past_projects int, total_projects int,
               followers int, following int, total_commits int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.project_members pm join public.projects p on p.id = pm.project_id
       where pm.user_id = p_user and pm.left_at is null and p.status = 'active'),
    (select count(*)::int from public.project_members pm join public.projects p on p.id = pm.project_id
       where pm.user_id = p_user and (pm.left_at is not null or p.status <> 'active')),
    (select count(*)::int from public.project_members where user_id = p_user),
    (select count(*)::int from public.follows where following_id = p_user),
    (select count(*)::int from public.follows where follower_id = p_user),
    (select count(*)::int from public.commits where user_id = p_user)
$$;

-- Lịch commit 1 năm (chỉ trả về ngày + số lượng, không lộ nội dung)
create or replace function public.commit_calendar(p_user uuid)
returns table (day date, count int)
language sql stable security definer set search_path = public as $$
  select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*)::int
  from public.commits
  where user_id = p_user and created_at > now() - interval '371 days'
  group by 1 order by 1
$$;

-- Dự án được pin (public trên profile vì user tự chọn pin)
create or replace function public.pinned_projects(p_user uuid)
returns table (id uuid, name text, description text, status text, role text,
               total int, done int, labels jsonb, pos int)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.description, p.status, pm.role,
    (select count(*)::int from public.milestones m where m.project_id = p.id),
    (select count(*)::int from public.milestones m where m.project_id = p.id
       and exists (select 1 from public.milestone_marks mk where mk.milestone_id = m.id and mk.status = 'completed')),
    coalesce((select jsonb_agg(jsonb_build_object('kind', l.kind, 'text', l.text))
              from public.project_labels l where l.project_id = p.id), '[]'::jsonb),
    pin.position
  from public.profile_pins pin
  join public.projects p on p.id = pin.project_id
  join public.project_members pm on pm.project_id = p.id and pm.user_id = pin.user_id
  where pin.user_id = p_user
  order by pin.position
$$;

grant execute on function public.create_custom_channel(uuid, text, uuid[]) to authenticated;
grant execute on function public.profile_stats(uuid)    to authenticated;
grant execute on function public.commit_calendar(uuid)  to authenticated;
grant execute on function public.pinned_projects(uuid)  to authenticated;

-- =====================================================================
-- 9. STORAGE — avatars (≤ 2MB, png/jpeg/webp/gif)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- 10. REALTIME (chat + thông báo)
-- =====================================================================
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;

-- Xong! 🎉
