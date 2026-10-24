import { requireUser } from "@/lib/data";
import { AppNav } from "@/components/shell/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="min-h-screen">
      <AppNav
        profile={
          profile ?? { id: user.id, username: "me", display_name: user.email ?? null, avatar_url: null }
        }
        unread={count ?? 0}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
