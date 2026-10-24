-- ⚠️  RESET: XOÁ SẠCH toàn bộ bảng/hàm/trigger của BecauseManAge (KHÔNG xoá auth.users).
-- Dùng khi muốn chạy lại schema.sql từ đầu trong lúc dev. Đừng chạy trên production.

drop trigger if exists on_auth_user_created on auth.users;

do $$ begin
  begin alter publication supabase_realtime drop table public.chat_messages; exception when others then null; end;
  begin alter publication supabase_realtime drop table public.notifications; exception when others then null; end;
end $$;

drop table if exists
  public.profile_pins, public.post_replies, public.posts, public.notifications,
  public.chat_messages, public.chat_channel_members, public.chat_channels,
  public.commits, public.note_reads, public.member_notes, public.project_events,
  public.personal_priorities, public.tasks, public.milestone_marks, public.milestones,
  public.project_labels, public.project_members, public.projects, public.mindmaps,
  public.follows, public.profiles, public.fields
cascade;

drop function if exists
  public.handle_new_user(), public.touch_updated_at(), public.handle_new_project(),
  public.guard_member_role(), public.notify_membership(), public.prepare_task(),
  public.after_task_change(), public.after_mark_change(), public.after_note_insert(),
  public.bump_post(), public.project_role(uuid), public.is_project_member(uuid),
  public.is_project_manager(uuid), public.was_ever_member(uuid), public.milestone_project(uuid),
  public.task_project(uuid), public.note_project(uuid), public.can_access_channel(uuid),
  public.create_custom_channel(uuid, text, uuid[]), public.profile_stats(uuid),
  public.commit_calendar(uuid), public.pinned_projects(uuid)
cascade;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars insert own"  on storage.objects;
drop policy if exists "avatars update own"  on storage.objects;
drop policy if exists "avatars delete own"  on storage.objects;

-- Nếu đã có user đăng ký trước đó, sau khi chạy lại schema.sql hãy chạy đoạn này
-- để tạo lại profile cho họ:
--
-- insert into public.profiles (id, username)
-- select id, left(regexp_replace(lower(split_part(email,'@',1)),'[^a-z0-9_]','','g'),20) || '_' || substr(md5(random()::text),1,5)
-- from auth.users on conflict do nothing;
