"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { seg: "", label: "Milestones" },
  { seg: "tasks", label: "Phân công" },
  { seg: "timeline", label: "Gantt" },
  { seg: "calendar", label: "Lịch" },
  { seg: "chat", label: "Chat" },
  { seg: "notes", label: "Notes" },
  { seg: "commits", label: "Commits" },
  { seg: "members", label: "Thành viên" },
  { seg: "settings", label: "Cài đặt" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  return (
    <nav className="thin-scroll -mx-1 flex gap-1 overflow-x-auto border-b-[1.5px] border-ink px-1">
      {TABS.map((t) => {
        const href = t.seg ? `${base}/${t.seg}` : base;
        const active = t.seg ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={t.seg}
            href={href}
            className={cn(
              "h-hand -mb-[1.5px] shrink-0 border-[1.5px] px-4 pt-1.5 pb-1 text-lg transition",
              active ? "rounded-t-md border-ink border-b-paper bg-paper" : "border-transparent text-smoke hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
