import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProfilesByIds, requireUser } from "@/lib/data";
import type { Post, PostReply } from "@/lib/types";
import { PostCard } from "@/components/threads/post-card";
import { Replies } from "@/components/threads/replies";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();
  const { data: replies } = await supabase.from("post_replies").select("*").eq("post_id", id).order("created_at");
  const list = (replies ?? []) as PostReply[];
  const profiles = await fetchProfilesByIds(supabase, [(post as Post).author_id, ...list.map((r) => r.author_id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/threads" className="text-sm text-smoke hover:text-ink">
        ← Threads
      </Link>
      <PostCard post={post as Post} author={profiles[(post as Post).author_id]} full />
      <Replies post={post as Post} replies={list} profiles={profiles} meId={user.id} />
    </div>
  );
}
