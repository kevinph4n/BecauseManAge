import Link from "next/link";
import { Avatar } from "@/components/ui";
import type { MiniProfile, Post } from "@/lib/types";
import { displayName, safeUrl, shortHash, timeAgo } from "@/lib/utils";

const KIND_LABEL: Record<Post["kind"], string> = { post: "Post", article: "Article", share: "Chia sẻ" };

export function PostCard({ post, author, full }: { post: Post; author?: MiniProfile; full?: boolean }) {
  return (
    <article className="box p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs text-smoke">
        <Avatar profile={author} size={24} />
        {author ? (
          <Link href={`/u/${author.username}`} className="font-semibold text-ink hover:underline">
            {displayName(author)}
          </Link>
        ) : (
          <span>Ẩn danh</span>
        )}
        <span>·</span>
        <span>{timeAgo(post.created_at)}</span>
        <span className="font-mono">No.{shortHash(post.id)}</span>
        <span className="chip ml-auto bg-white">{KIND_LABEL[post.kind]}</span>
      </header>
      <Link href={`/threads/${post.id}`} className="block">
        {post.title && <h3 className={`h-hand mt-2 leading-tight ${full ? "text-4xl" : "text-2xl"}`}>{post.title}</h3>}
        <p className={`mt-2 text-sm whitespace-pre-wrap ${full ? "" : "line-clamp-4"}`}>{post.body}</p>
      </Link>
      {safeUrl(post.link_url) && (
        <a
          href={safeUrl(post.link_url)!}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="sketch mt-3 block truncate bg-fog px-3 py-2 font-mono text-xs hover:bg-white"
        >
          🔗 {post.link_url}
        </a>
      )}
      <footer className="mt-3 flex flex-wrap items-center gap-2 text-xs text-smoke">
        {post.tags.map((t) => (
          <span key={t} className="font-mono">
            #{t}
          </span>
        ))}
        <Link href={`/threads/${post.id}`} className="ml-auto hover:text-ink">
          💬 {post.reply_count} trả lời
        </Link>
      </footer>
    </article>
  );
}
