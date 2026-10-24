"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Avatar, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Field, PersonalInfo, Profile, ProfileTheme, Project, ProjectMember } from "@/lib/types";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, cn, safeUrl } from "@/lib/utils";

const INFO_FIELDS: { key: keyof PersonalInfo; label: string; type?: string; placeholder?: string }[] = [
  { key: "pronouns", label: "Xưng hô", placeholder: "anh / chị / bạn / he / she / they…" },
  { key: "location", label: "Sống ở", placeholder: "TP.HCM" },
  { key: "company", label: "Làm việc tại" },
  { key: "school", label: "Học tại" },
  { key: "birthday", label: "Sinh nhật", type: "date" },
  { key: "languages", label: "Ngôn ngữ", placeholder: "Tiếng Việt, English" },
  { key: "website", label: "Website", placeholder: "https://…" },
  { key: "contact", label: "Liên hệ", placeholder: "email / telegram / zalo…" },
];

const BANNERS: NonNullable<ProfileTheme["banner"]>[] = ["dots", "grid", "lines", "cross", "plain"];
const BANNER_CLASS = { dots: "paper-dots", grid: "paper-grid", lines: "paper-lines", cross: "paper-cross", plain: "bg-white" };
const FONTS: { id: NonNullable<ProfileTheme["font"]>; label: string; cls: string }[] = [
  { id: "hand", label: "Viết tay", cls: "h-hand" },
  { id: "sans", label: "Sans", cls: "font-sans font-bold" },
  { id: "serif", label: "Serif", cls: "font-serif font-bold" },
  { id: "mono", label: "Mono", cls: "font-mono font-bold" },
];

export function ProfileForm({
  profile,
  fields,
  projects,
  memberships,
  pinned,
}: {
  profile: Profile;
  fields: Field[];
  projects: Pick<Project, "id" | "name" | "status">[];
  memberships: ProjectMember[];
  pinned: string[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [fieldId, setFieldId] = useState(profile.field_id ?? "");
  const [statusEmoji, setStatusEmoji] = useState(profile.status_emoji ?? "");
  const [statusText, setStatusText] = useState(profile.status_text ?? "");
  const [info, setInfo] = useState<PersonalInfo>(profile.personal_info ?? {});
  const [links, setLinks] = useState(profile.links?.length ? profile.links : []);
  const [theme, setTheme] = useState<ProfileTheme>({ banner: "dots", font: "hand", invert: false, ...profile.theme });
  const [pins, setPins] = useState<string[]>(pinned);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setMsg({ ok: false, text: "Chỉ nhận PNG, JPG, WEBP hoặc GIF." });
    if (file.size > AVATAR_MAX_BYTES) return setMsg({ ok: false, text: "Ảnh tối đa 2MB thôi nha." });
    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      setUploading(false);
      return setMsg({ ok: false, text: error.message });
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    setMsg({ ok: true, text: "Đã đổi ảnh đại diện ✓" });
    router.refresh();
  }

  async function removeAvatar() {
    await createClient().from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    setAvatarUrl(null);
    router.refresh();
  }

  async function save() {
    setMsg(null);
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(uname)) return setMsg({ ok: false, text: "Username 3–30 ký tự: a-z, 0-9, _ hoặc ." });
    const cleanLinks = links
      .map((l) => ({ label: l.label.trim(), url: safeUrl(l.url) ?? "" }))
      .filter((l) => l.url)
      .slice(0, 6);
    const cleanInfo: PersonalInfo = {};
    for (const f of INFO_FIELDS) {
      const v = info[f.key]?.trim();
      if (v) cleanInfo[f.key] = v;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: uname,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        field_id: fieldId || null,
        status_emoji: statusEmoji.trim() || null,
        status_text: statusText.trim() || null,
        personal_info: cleanInfo,
        links: cleanLinks,
        theme,
      })
      .eq("id", profile.id);
    if (error) {
      setBusy(false);
      return setMsg({
        ok: false,
        text: /duplicate|unique/i.test(error.message) ? "Username này có người dùng rồi." : error.message,
      });
    }
    // pins: xoá hết rồi ghi lại theo thứ tự
    await supabase.from("profile_pins").delete().eq("user_id", profile.id);
    if (pins.length) {
      await supabase
        .from("profile_pins")
        .insert(pins.map((project_id, position) => ({ user_id: profile.id, project_id, position })));
    }
    setBusy(false);
    setLinks(cleanLinks);
    setMsg({ ok: true, text: "Đã lưu ✓" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* basics */}
        <section className="box p-5">
          <SectionTitle>Cơ bản</SectionTitle>
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <Avatar profile={{ username, display_name: displayName, avatar_url: avatarUrl }} size={88} />
            <div className="space-y-2">
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Đang tải lên…" : "Đổi ảnh đại diện"}
                </button>
                {avatarUrl && (
                  <button className="btn btn-ghost btn-sm" onClick={removeAvatar}>
                    Gỡ ảnh
                  </button>
                )}
              </div>
              <p className="text-xs text-smoke">PNG / JPG / WEBP / GIF · tối đa 2MB</p>
              <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(",")} className="hidden" onChange={onAvatar} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Username</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="label">Tên hiển thị</label>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
            </div>
            <div>
              <label className="label">Field / Lĩnh vực</label>
              <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
                <option value="">— chưa chọn —</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <label className="label">Status</label>
                <input className="input text-center" value={statusEmoji} onChange={(e) => setStatusEmoji(e.target.value)} maxLength={8} placeholder="🎯" />
              </div>
              <div className="flex-1">
                <label className="label">&nbsp;</label>
                <input className="input" value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={80} placeholder="Đang chạy deadline…" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Bio ({bio.length}/600)</label>
              <textarea className="input min-h-28" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
            </div>
          </div>
        </section>

        {/* personal info */}
        <section className="box p-5">
          <SectionTitle>Thông tin cá nhân</SectionTitle>
          <p className="-mt-2 mb-3 text-xs text-smoke">Không bắt buộc. Trường nào bạn điền thì sẽ hiện công khai trên profile.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {INFO_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  type={f.type ?? "text"}
                  value={info[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setInfo((i) => ({ ...i, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* links */}
        <section className="box p-5">
          <SectionTitle
            right={
              links.length < 6 && (
                <button className="btn btn-sm" onClick={() => setLinks((l) => [...l, { label: "", url: "" }])}>
                  + Link
                </button>
              )
            }
          >
            Links
          </SectionTitle>
          {links.length === 0 && <p className="text-sm text-smoke">GitHub, LinkedIn, Behance, blog…</p>}
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input w-36!"
                  placeholder="Tên"
                  value={l.label}
                  onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="input"
                  placeholder="https://"
                  value={l.url}
                  onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* pins */}
        <section id="pins" className="box p-5">
          <SectionTitle>📌 Pin dự án nổi bật ({pins.length}/6)</SectionTitle>
          {projects.length === 0 ? (
            <p className="text-sm text-smoke">
              Chưa có dự án nào. <Link href="/projects" className="underline">Tạo một cái</Link>.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {projects.map((p) => {
                const on = pins.includes(p.id);
                const left = memberships.find((m) => m.project_id === p.id)?.left_at;
                return (
                  <label key={p.id} className={cn("box flex cursor-pointer items-center gap-2 p-2.5 text-sm", on && "shadow-sketch")}>
                    <input
                      type="checkbox"
                      className="accent-ink"
                      checked={on}
                      disabled={!on && pins.length >= 6}
                      onChange={() => setPins((ps) => (on ? ps.filter((x) => x !== p.id) : [...ps, p.id]))}
                    />
                    <span className="flex-1 truncate font-semibold">{p.name}</span>
                    <span className="text-xs text-smoke">{left ? "đã rời" : p.status}</span>
                  </label>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* personalization */}
      <aside className="space-y-4">
        <section className="box p-4 lg:sticky lg:top-20">
          <p className="h-hand text-2xl">Cá nhân hoá</p>
          <p className="label mt-3">Banner</p>
          <div className="grid grid-cols-5 gap-1.5">
            {BANNERS.map((b) => (
              <button
                key={b}
                title={b}
                onClick={() => setTheme((t) => ({ ...t, banner: b }))}
                className={cn("h-10 border-[1.5px] border-ink", BANNER_CLASS[b], theme.banner === b && "ring-2 ring-ink ring-offset-2")}
              />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-ink" checked={!!theme.invert} onChange={(e) => setTheme((t) => ({ ...t, invert: e.target.checked }))} />
            Banner nền đen (đảo màu)
          </label>
          <p className="label mt-3">Font tên</p>
          <div className="grid grid-cols-2 gap-1.5">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTheme((t) => ({ ...t, font: f.id }))}
                className={cn("btn btn-sm", f.cls, theme.font === f.id && "btn-primary")}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* preview */}
          <div className="mt-4 overflow-hidden border-[1.5px] border-ink">
            <div
              className={cn("h-14 border-b-[1.5px] border-ink", BANNER_CLASS[theme.banner ?? "dots"])}
              style={theme.invert ? { filter: "invert(1)" } : undefined}
            />
            <div className="flex items-center gap-2 p-2">
              <Avatar profile={{ username, display_name: displayName, avatar_url: avatarUrl }} size={36} />
              <div className="min-w-0">
                <p className={cn("truncate text-lg leading-tight", FONTS.find((f) => f.id === theme.font)?.cls)}>
                  {displayName || username}
                </p>
                <p className="truncate text-xs text-smoke">
                  {statusEmoji} {statusText || `@${username}`}
                </p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary mt-4 w-full" onClick={save} disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu tất cả"}
          </button>
          {msg && <p className={cn("mt-2 text-sm", !msg.ok && "text-danger")}>{msg.text}</p>}
          <Link href={`/u/${profile.username}`} className="mt-2 block text-center text-sm underline">
            Xem profile →
          </Link>
        </section>
      </aside>
    </div>
  );
}
