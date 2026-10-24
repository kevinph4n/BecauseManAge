import { fetchProfilesByIds, requireUser } from "@/lib/data";
import type { Post } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/ui";
import { Composer } from "@/components/threads/composer";
import { PostCard } from "@/components/threads/post-card";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = { title: "Threads" };

export default async function ThreadsPage({ searchParams }: { searchParams: Promise<{ kind?: string; tag?: string; feed?: string }> }) {
  const { kind, tag, feed } = await searchParams;
  const { supabase, user } = await requireUser();

  let authorIds: string[] | null = null;
  if (feed === "following") {
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    authorIds = [user.id, ...((data ?? []) as { following_id: string }[]).map((f) => f.following_id)];
  }

  let q = supabase.from("posts").select("*");
  if (kind === "post" || kind === "article" || kind === "share") q = q.eq("kind", kind);
  if (tag) q = q.contains("tags", [tag]);
  if (authorIds) q = q.in("author_id", authorIds);
  const { data } = await q.order("bumped_at", { ascending: false }).limit(50);
  const posts = (data ?? []) as Post[];
  const authors = await fetchProfilesByIds(supabase, posts.map((p) => p.author_id));

  const tabs = [
    { label: "Tất cả", href: "/threads", on: !kind && !feed && !tag },
    { label: "Đang follow", href: "/threads?feed=following", on: feed === "following" },
    { label: "Posts", href: "/threads?kind=post", on: kind === "post" },
    { label: "Articles", href: "/threads?kind=article", on: kind === "article" },
    { label: "Chia sẻ", href: "/threads?kind=share", on: kind === "share" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Threads" subtitle="Viết post, article, chia sẻ link — bài nào có trả lời mới sẽ được đẩy (bump) lên đầu." />
      <Composer />
      <div className="my-5 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={cn("chip py-1", t.on ? "bg-ink text-white" : "bg-white")}>
            {t.label}
          </Link>
        ))}
        {tag && <span className="chip bg-label-sky py-1">#{tag}</span>}
      </div>
      {posts.length === 0 ? (
        <EmptyState title="Chưa có bài nào">Mở bát đi!</EmptyState>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} author={authors[p.author_id]} />
          ))}
        </div>
      )}
    </div>
  );
}
