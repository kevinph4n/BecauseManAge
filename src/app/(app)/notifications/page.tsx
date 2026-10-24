import { requireUser } from "@/lib/data";
import type { Notification } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = { title: "Thông báo" };

export default async function NotificationsPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Thông báo" subtitle="Được giao việc, được thêm vào dự án, task bị báo vấn đề…" />
      <NotificationList initial={(data ?? []) as Notification[]} meId={user.id} />
    </div>
  );
}
