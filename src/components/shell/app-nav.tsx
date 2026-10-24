"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { MiniProfile } from "@/lib/types";
import { Avatar, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notes", label: "Notes" },
  { href: "/projects", label: "Projects" },
  { href: "/threads", label: "Threads" },
];

export function AppNav({ profile, unread }: { profile: MiniProfile; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        <Logo href="/dashboard" />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "h-hand px-3 py-1 text-lg transition",
                  active ? "sketch bg-ink text-paper" : "hover:bg-fog sketch border-transparent",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/notifications" className="btn btn-ghost btn-sm relative" aria-label="Thông báo">
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-paper">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex items-center" aria-label="Menu tài khoản">
              <Avatar profile={profile} size={34} />
            </button>
            {menu && (
              <div className="box shadow-sketch absolute right-0 mt-2 w-52 p-1 text-sm" onMouseLeave={() => setMenu(false)}>
                <div className="border-b border-line px-3 py-2">
                  <p className="font-semibold">{profile.display_name || profile.username}</p>
                  <p className="text-xs text-smoke">@{profile.username}</p>
                </div>
                <Link href={`/u/${profile.username}`} className="block px-3 py-2 hover:bg-fog" onClick={() => setMenu(false)}>
                  Trang cá nhân
                </Link>
                <Link href="/settings/profile" className="block px-3 py-2 hover:bg-fog" onClick={() => setMenu(false)}>
                  Chỉnh sửa profile
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="block w-full px-3 py-2 text-left hover:bg-fog">Đăng xuất</button>
                </form>
              </div>
            )}
          </div>
          <button className="btn btn-sm md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Mở menu">
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-line px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="h-hand py-2 text-xl">
              {pathname.startsWith(l.href) ? "→ " : ""}
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
