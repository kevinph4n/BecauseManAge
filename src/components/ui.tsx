import Link from "next/link";
import type { ReactNode } from "react";
import type { LabelKind, MiniProfile, ProjectLabel } from "@/lib/types";
import { LABEL_KINDS, cn, displayName, labelOrder } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-0.5 select-none", className)}>
      <span className="h-hand text-2xl leading-none">Because</span>
      <span className="h-hand text-2xl leading-none font-bold underline decoration-2 underline-offset-4">ManAge</span>
    </Link>
  );
}

export function Avatar({
  profile,
  size = 32,
  className,
}: {
  profile?: Pick<MiniProfile, "username" | "display_name" | "avatar_url"> | null;
  size?: number;
  className?: string;
}) {
  const name = displayName(profile);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-ink bg-white font-semibold",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      title={name}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover grayscale-[15%]" />
      ) : (
        <span className="h-hand">{initials}</span>
      )}
    </span>
  );
}

export function LabelChip({ kind, text }: { kind: LabelKind; text: string }) {
  const k = LABEL_KINDS.find((l) => l.kind === kind)!;
  return <span className={cn("chip", k.className)}>{text}</span>;
}

/** Labels luôn hiển thị đúng thứ tự: vàng (ngành) → sky (tự gắn) → đen (nhu cầu) */
export function Labels({ labels, className }: { labels: Pick<ProjectLabel, "kind" | "text">[]; className?: string }) {
  if (!labels.length) return null;
  const sorted = [...labels].sort((a, b) => labelOrder(a.kind) - labelOrder(b.kind));
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {sorted.map((l, i) => (
        <LabelChip key={i} kind={l.kind} text={l.text} />
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="box border-dashed! bg-transparent! p-8 text-center">
      <p className="h-hand text-2xl">{title}</p>
      {children && <div className="mt-2 text-sm text-smoke">{children}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-hand text-4xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-smoke">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("box p-4", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="h-hand text-2xl">{children}</h2>
      {right}
    </div>
  );
}

export function RoleBadge({ role }: { role: "owner" | "manager" | "member" }) {
  const cls =
    role === "owner" ? "bg-ink text-white" : role === "manager" ? "bg-white text-ink" : "bg-fog text-ink border-dashed";
  return <span className={cn("chip", cls)}>{role === "owner" ? "★ Owner" : role === "manager" ? "◆ Manager" : "Member"}</span>;
}
