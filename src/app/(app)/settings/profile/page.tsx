import { requireUser } from "@/lib/data";
import type { Field, Project, ProjectMember } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = { title: "Chỉnh sửa profile" };

export default async function ProfileSettingsPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: fields }, { data: mems }, { data: pins }] = await Promise.all([
    supabase.from("fields").select("*").order("position"),
    supabase.from("project_members").select("*").eq("user_id", user.id),
    supabase.from("profile_pins").select("project_id, position").eq("user_id", user.id).order("position"),
  ]);
  const ids = ((mems ?? []) as ProjectMember[]).map((m) => m.project_id);
  const { data: projects } = ids.length
    ? await supabase.from("projects").select("id, name, status").in("id", ids)
    : { data: [] };

  if (!profile) {
    return <p>Không tìm thấy profile — bạn đã chạy supabase/schema.sql chưa?</p>;
  }

  return (
    <>
      <PageHeader title="Profile của bạn" subtitle="Tuỳ biến thoải mái. Chỉ những gì bạn điền mới hiện ra." />
      <ProfileForm
        profile={profile}
        fields={(fields ?? []) as Field[]}
        projects={(projects ?? []) as Pick<Project, "id" | "name" | "status">[]}
        memberships={(mems ?? []) as ProjectMember[]}
        pinned={((pins ?? []) as { project_id: string }[]).map((p) => p.project_id)}
      />
    </>
  );
}
