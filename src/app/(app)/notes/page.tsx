import Link from "next/link";
import { requireUser } from "@/lib/data";
import type { Mindmap } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/ui";
import { NewMindmapButton } from "@/components/notes/new-mindmap";
import { stripTags } from "@/lib/sanitize";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Notes" };

export default async function NotesPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("mindmaps")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  const maps = (data ?? []) as Mindmap[];

  return (
    <>
      <PageHeader
        title="Notes mindmap"
        subtitle="Note những thứ cần được note — kéo thả, tô màu, nối dây. Sau đó trích xuất sang dự án."
        actions={<NewMindmapButton />}
      />
      {maps.length === 0 ? (
        <EmptyState title="Chưa có bảng note nào">Bấm “+ Bảng mới” và chọn một template để bắt đầu.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => {
            const nodes = m.data?.nodes ?? [];
            return (
              <Link key={m.id} href={`/notes/${m.id}`} className="box group block p-0 transition hover:shadow-sketch">
                <div className="paper-dots relative h-36 overflow-hidden border-b-[1.5px] border-ink">
                  <MiniMap nodes={nodes} />
                </div>
                <div className="p-4">
                  <h3 className="h-hand text-2xl leading-tight">{m.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-smoke">
                    {nodes
                      .slice(0, 4)
                      .map((n) => stripTags(n.html))
                      .filter(Boolean)
                      .join(" · ") || "Trống"}
                  </p>
                  <p className="mt-2 text-xs text-smoke">
                    {nodes.length} khối · sửa {timeAgo(m.updated_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function MiniMap({ nodes }: { nodes: Mindmap["data"]["nodes"] }) {
  if (!nodes.length) return null;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + 60));
  const scale = Math.min(300 / Math.max(maxX - minX, 1), 120 / Math.max(maxY - minY, 1), 0.5);
  return (
    <div className="absolute inset-0 p-3">
      {nodes.slice(0, 40).map((n) => (
        <div
          key={n.id}
          className="absolute border border-ink"
          style={{
            left: 12 + (n.x - minX) * scale,
            top: 12 + (n.y - minY) * scale,
            width: n.w * scale,
            height: 40 * scale,
            background: n.style?.bg ?? "#fff",
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
}
