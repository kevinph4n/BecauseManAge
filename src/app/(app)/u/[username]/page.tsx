import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data";
import type { Field, Post, Profile } from "@/lib/types";
import { Avatar, EmptyState, Labels, SectionTitle } from "@/components/ui";
import { ContributionGraph } from "@/components/profile/contribution-graph";
import { FollowButton } from "@/components/profile/follow-button";
import { PostCard } from "@/components/threads/post-card";
import { cn, formatDate, safeUrl } from "@/lib/utils";

const INFO_LABEL: Record<string, string> = {
  pronouns: "Xưng hô",
  location: "Sống ở",
  company: "Làm việc tại",
  school: "Học tại",
  birthday: "Sinh nhật",
  languages: "Ngôn ngữ",
  website: "Website",
  contact: "Liên hệ",
};

const FONT_CLASS = { sans: "font-sans font-bold", hand: "h-hand", mono: "font-mono font-bold", serif: "font-serif font-bold" };
const BANNER_CLASS = { dots: "paper-dots", grid: "paper-grid", lines: "paper-lines", cross: "paper-cross", plain: "" };

type Pinned = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  role: string;
  total: number;
  done: number;
  labels: { kind: "field" | "custom" | "need"; text: string }[];
};

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;
  const isMe = p.id === user.id;

  const [{ data: stats }, { data: cal }, { data: pins }, { data: follow }, { data: posts }, { data: field }] = await Promise.all([
    supabase.rpc("profile_stats", { p_user: p.id }).single(),
    supabase.rpc("commit_calendar", { p_user: p.id }),
    supabase.rpc("pinned_projects", { p_user: p.id }),
    supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p.id).maybeSingle(),
    supabase.from("posts").select("*").eq("author_id", p.id).order("created_at", { ascending: false }).limit(20),
    p.field_id ? supabase.from("fields").select("*").eq("id", p.field_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const s = (stats ?? {}) as {
    active_projects?: number;
    past_projects?: number;
    total_projects?: number;
    followers?: number;
    following?: number;
    total_commits?: number;
  };
  const theme = p.theme ?? {};
  const info = Object.entries(p.personal_info ?? {}).filter(([, v]) => typeof v === "string" && v.trim());
  const pinned = (pins ?? []) as Pinned[];
  const links = (p.links ?? [])
    .map((l) => ({ label: l.label, url: safeUrl(l.url) }))
    .filter((l): l is { label: string; url: string } => Boolean(l.url));

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="box shadow-sketch overflow-hidden p-0!">
        <div
          className={cn("h-32 border-b-[1.5px] border-ink md:h-40", BANNER_CLASS[theme.banner ?? "dots"], theme.invert && "bg-ink!")}
          style={theme.invert ? { filter: "invert(1)" } : undefined}
        />
        <div className="relative px-5 pb-5">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <Avatar profile={p} size={104} className="border-[3px] bg-white" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className={cn("text-3xl leading-tight md:text-4xl", FONT_CLASS[theme.font ?? "hand"])}>
                {p.display_name || p.username}
              </h1>
              <p className="text-sm text-smoke">
                @{p.username}
                {p.personal_info?.pronouns ? ` · ${p.personal_info.pronouns}` : ""}
              </p>
            </div>
            <div className="flex gap-2 pb-1">
              {isMe ? (
                <Link href="/settings/profile" className="btn">
                  ✎ Chỉnh profile
                </Link>
              ) : (
                <FollowButton meId={user.id} targetId={p.id} following={Boolean(follow)} />
              )}
            </div>
          </div>

          {(p.status_emoji || p.status_text) && (
            <p className="sketch mt-4 inline-block bg-fog px-3 py-1 text-sm">
              {p.status_emoji} {p.status_text}
            </p>
          )}
          {field && (
            <p className="mt-3">
              <span className="chip bg-label-field">{(field as Field).label}</span>
            </p>
          )}
          {p.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap">{p.bio}</p>}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Stat n={s.followers ?? 0} label="followers" />
            <Stat n={s.following ?? 0} label="following" />
            <Stat n={s.active_projects ?? 0} label="dự án đang tham gia" />
            <Stat n={s.past_projects ?? 0} label="dự án đã tham gia" />
            <Stat n={s.total_commits ?? 0} label="commits" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* contributions */}
          <section className="box p-5">
            <SectionTitle>Commits</SectionTitle>
            <ContributionGraph data={(cal ?? []) as { day: string; count: number }[]} />
          </section>

          {/* pinned */}
          <section>
            <SectionTitle right={isMe && <Link href="/settings/profile#pins" className="text-sm underline">chọn pin</Link>}>
              📌 Dự án nổi bật
            </SectionTitle>
            {pinned.length === 0 ? (
              <EmptyState title="Chưa pin dự án nào" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pinned.map((pr) => {
                  const pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
                  return (
                    <div key={pr.id} className="box p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="h-hand text-2xl leading-tight">{pr.name}</p>
                        <span className="chip bg-white">{pr.role}</span>
                      </div>
                      <Labels labels={pr.labels} className="mt-1.5" />
                      {pr.description && <p className="mt-2 line-clamp-2 text-sm text-smoke">{pr.description}</p>}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-2 flex-1 border border-ink bg-white">
                          <div className="h-full bg-ms-3" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* threads */}
          <section>
            <SectionTitle right={isMe && <Link href="/threads" className="text-sm underline">viết bài</Link>}>Threads</SectionTitle>
            {(posts ?? []).length === 0 ? (
              <EmptyState title="Chưa đăng gì" />
            ) : (
              <div className="space-y-3">
                {((posts ?? []) as Post[]).map((post) => (
                  <PostCard key={post.id} post={post} author={p} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* sidebar info */}
        <aside className="space-y-4">
          <section className="box p-4">
            <p className="h-hand text-xl">Thông tin</p>
            {info.length === 0 ? (
              <p className="mt-1 text-sm text-smoke">Người này giữ bí ẩn 🕶</p>
            ) : (
              <dl className="mt-2 space-y-2 text-sm">
                {info.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-smoke">{INFO_LABEL[k] ?? k}</dt>
                    <dd className="break-words">
                      {k === "website" && safeUrl(String(v)) ? (
                        <a href={safeUrl(String(v))!} target="_blank" rel="noopener noreferrer" className="underline">
                          {String(v)}
                        </a>
                      ) : k === "birthday" ? (
                        formatDate(String(v))
                      ) : (
                        String(v)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          {links.length > 0 && (
            <section className="box p-4">
              <p className="h-hand text-xl">Links</p>
              <ul className="mt-2 space-y-1 text-sm">
                {links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">
                      ↗ {l.label || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-xs text-smoke">Tham gia từ {formatDate(p.created_at, true)}</p>
        </aside>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span>
      <b className="h-hand text-2xl">{n}</b> <span className="text-smoke">{label}</span>
    </span>
  );
}
