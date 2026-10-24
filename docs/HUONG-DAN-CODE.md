# Hướng dẫn đọc code BecauseManAge

File này giải thích **từng file làm gì** và **dùng kỹ thuật gì**, để vừa đọc vừa học.
Nên đọc theo thứ tự các phần bên dưới. Mỗi phần có mục **💡 Học được gì** và vài **bài tập nhỏ**.

---

## 0. Bức tranh tổng

```
Trình duyệt ──► middleware.ts (kiểm tra đăng nhập)
             ──► Server Component (page.tsx / layout.tsx)  ── đọc DB ──► Supabase (Postgres + RLS)
                     │ truyền data qua props
                     ▼
                 Client Component ("use client")  ── ghi DB trực tiếp ──► Supabase
                     │ ghi xong gọi router.refresh()
                     ▼
                 Server Component chạy lại → lấy data mới → UI cập nhật
```

Có 3 ý lớn, nắm được là hiểu cả project:

1. **Đọc bằng Server Component, ghi bằng Client Component.**
   Trang (`page.tsx`) chạy trên server, query Supabase rồi đưa data cho component con. Component có nút bấm / form (`"use client"`) gọi Supabase để insert / update, xong gọi `router.refresh()` để server render lại với data mới.
2. **Bảo mật nằm ở database (RLS + trigger), không nằm ở UI.**
   UI chỉ ẩn nút cho đẹp. Kể cả ai đó mở DevTools gọi API thẳng thì Postgres vẫn chặn.
3. **Logic nghiệp vụ thuần (tính %, màu phase, ngày tháng) nằm trong `src/lib/`** dưới dạng hàm thuần, không dính React → dễ đọc, dễ test, dễ sửa.

---

## 1. File cấu hình ở thư mục gốc

| File | Làm gì |
|---|---|
| `package.json` | Danh sách thư viện + lệnh `dev`, `build`, `start`, `typecheck`. Chỉ có Next, React, 2 gói Supabase, `dompurify`; dev có Tailwind v4 + TypeScript. |
| `tsconfig.json` | Cấu hình TypeScript. Đáng chú ý: `"strict": true` (bắt lỗi chặt), `"paths": { "@/*": ["./src/*"] }` → viết `import x from "@/lib/utils"` thay cho `../../../lib/utils`. |
| `next.config.ts` | Cho phép ảnh từ `*.supabase.co`; tắt ESLint khi build (MVP chưa cài ESLint). |
| `postcss.config.mjs` | Gắn plugin Tailwind v4 vào PostCSS. Tailwind v4 không cần `tailwind.config.js` nữa, cấu hình nằm trong CSS. |
| `next-env.d.ts` | Next tự sinh, **đừng sửa**. |
| `.env.example` → `.env.local` | Biến môi trường. Biến nào bắt đầu bằng `NEXT_PUBLIC_` sẽ được nhúng vào code chạy trên trình duyệt → chỉ để key công khai (publishable/anon), **không bao giờ** để service_role. |
| `src/types/assets.d.ts` | Khai báo `declare module "*.css"` để TypeScript chấp nhận `import "./globals.css"`. |

💡 **Học được gì:** path alias `@/`; quy tắc `NEXT_PUBLIC_`; Tailwind v4 cấu hình bằng CSS.

---

## 2. `supabase/` — Database

### `schema.sql` (file quan trọng nhất của backend)

Đọc theo thứ tự các phần đã đánh số trong file:

| Phần | Nội dung | Kỹ thuật |
|---|---|---|
| 0–4 | `create table …` | Khoá chính `uuid default gen_random_uuid()`; khoá ngoại `references … on delete cascade` (xoá dự án → xoá luôn milestones, tasks…); `check (...)` để DB tự từ chối dữ liệu sai (VD `status in ('todo','in_progress',…)`). |
| `personal_priorities` | Priority riêng tư | `check ((task_id is null) <> (milestone_id is null))` = **đúng 1 trong 2 cột** có giá trị. `unique (user_id, task_id)` để `upsert` được. |
| `milestone_marks` | Mỗi người 1 mark / mốc | Khoá chính ghép `(milestone_id, user_id)` → không thể mark 2 lần, chỉ cập nhật. |
| `mindmaps.data jsonb` | Cả bảng mindmap là 1 cục JSON | Chọn JSON thay vì mỗi khối 1 dòng → lưu 1 lần là xong, code đơn giản. Đánh đổi: khó cho nhiều người sửa cùng lúc. |
| 5. Helper functions | `is_project_member()`, `is_project_manager()`, `can_access_channel()`… | `security definer` = hàm chạy bằng quyền của người tạo hàm, **bỏ qua RLS** bên trong → tránh lỗi đệ quy vô hạn khi policy của bảng A phải đọc chính bảng A. `auth.uid()` = id của user đang gọi (Supabase lấy từ JWT). |
| 6. RLS policies | Ai được đọc / ghi dòng nào | `using (...)` = điều kiện để **thấy / sửa / xoá** dòng; `with check (...)` = điều kiện cho dòng **mới / sau khi sửa**. `(select auth.uid())` bọc trong `select` để Postgres tính 1 lần thay vì mỗi dòng (nhanh hơn). |
| 7. Triggers | Tự động hoá | `handle_new_user`: đăng ký → tạo `profiles`. `handle_new_project`: tạo dự án → thêm owner + 3 kênh chat + commit. `guard_member_role`: chặn Manager tự phong người khác làm Manager. `prepare_task`: `before` trigger, tự điền `assigned_by`, chặn Member sửa field không phải của mình. `after_*`: sinh commit + thông báo. |
| 8. RPC | `create_custom_channel`, `profile_stats`, `commit_calendar`, `pinned_projects` | Hàm SQL gọi từ JS bằng `supabase.rpc("tên", {tham_số})`. Dùng khi cần làm nhiều bước một lúc, hoặc trả về dữ liệu tổng hợp mà không lộ dữ liệu gốc (VD lịch commit chỉ trả về *ngày + số lượng*). |
| 9. Storage | Bucket `avatars` | Giới hạn 2MB + MIME ngay ở bucket. Policy: chỉ được upload vào folder `{user_id}/…` của mình. |
| 10. Realtime | `alter publication supabase_realtime add table …` | Bảng nào được thêm vào đây thì client mới subscribe được thay đổi. |

### `reset.sql`, `migrations/`

`reset.sql` xoá sạch để chạy lại khi đang dev. `migrations/20261024000000_init.sql` là bản copy của schema, để sau này dùng Supabase CLI.

💡 **Học được gì:** RLS là "if" ở tầng database; `before` trigger sửa được dữ liệu trước khi lưu (`new.x := …`), còn `after` trigger để làm việc phụ (ghi log, gửi thông báo); `security definer` cần `set search_path = public` cho an toàn.

🏋️ **Bài tập:** viết policy cho phép Manager sửa sự kiện của người khác nhưng không được xoá.

---

## 3. `src/lib/` — Logic dùng chung (đọc phần này trước khi đọc component)

| File | Làm gì | Kỹ thuật |
|---|---|---|
| `supabase/env.ts` | Đọc URL + key từ env, hỗ trợ cả `PUBLISHABLE_KEY` lẫn `ANON_KEY` | `hasSupabaseEnv` để middleware đẩy về `/setup` khi chưa cấu hình. |
| `supabase/client.ts` | Supabase client cho **trình duyệt** | Singleton: tạo 1 lần, dùng lại (biến `browserClient` ngoài hàm). |
| `supabase/server.ts` | Supabase client cho **server** | Đọc session từ cookie bằng `cookies()` của Next. `try/catch` khi set cookie vì Server Component không được phép ghi cookie (middleware lo việc đó). |
| `supabase/middleware.ts` | Refresh session + chặn trang khi chưa đăng nhập | Code mẫu chuẩn của `@supabase/ssr`: `getAll` / `setAll` cookie, gọi `auth.getUser()` để làm mới token, rồi redirect nếu cần. |
| `types.ts` | Kiểu TypeScript cho mọi bảng | Viết tay cho dễ đọc; sau này có thể generate bằng `supabase gen types`. `MiniProfile = Pick<Profile, …>` = lấy vài field của kiểu lớn. |
| `utils.ts` | Hàm tiện ích | `cn()` nối class có điều kiện; hàm ngày tháng tự viết (`parseDate`, `addDays`, `startOfWeek`…) thay vì cài thư viện; map enum → nhãn hiển thị (`MARK_LABEL`…); `safeUrl()` chặn link `javascript:`. |
| `progress.ts` | **Trái tim của tính năng milestones** | `milestoneState()` gộp mark của nhiều người thành 1 trạng thái; `computeProgress()` tính `% = done / total`, sort theo phase, tổng hợp từng phase; `phaseColor()` chọn màu xanh theo phase. Toàn **hàm thuần**: vào data, ra data, không gọi DB, không dùng React. |
| `mindmap.ts` | Mặc định style khối, bảng màu, template | `TEMPLATES[].build()` trả về JSON mindmap mẫu; `isDark()` tính độ sáng màu để tự đổi chữ trắng/đen. |
| `sanitize.ts` | Lọc HTML do user nhập | DOMPurify chỉ cho phép vài thẻ (`b`, `i`, `u`, `div`…). Không có `window` (đang ở server) thì dùng `stripTags` ra text thuần. |
| `data.ts` | Hàm đọc dữ liệu dùng trên server | `requireUser()` lấy user + profile, chưa login thì `redirect`. `fetchProfilesByIds()` lấy profile theo danh sách id rồi trả về dạng map `{id: profile}` để tra cứu O(1). |
| `project-data.ts` | `loadProject(id)`: tải mọi thứ chung của 1 dự án | Bọc bằng `cache()` của React → layout **và** page trong cùng 1 request gọi `loadProject` 2 lần nhưng chỉ query 1 lần. `Promise.all` để chạy nhiều query song song. |

💡 **Học được gì:** tách logic thuần ra khỏi UI; `cache()` để khử trùng lặp request; map id → object thay vì `.find()` lặp lại nhiều lần.

🏋️ **Bài tập:** sửa `milestoneState` để mốc chỉ tính Completed khi **≥ 2 người** mark Completed, rồi xem thanh tiến độ thay đổi.

---

## 4. `src/middleware.ts`

Chạy **trước mọi request** (trừ file tĩnh, theo `matcher`). Gọi `updateSession` để:

1. Thiếu env → đẩy về `/setup`.
2. Chưa đăng nhập mà vào trang cần login → `/login?next=…`.
3. Đã đăng nhập mà vào `/login` / `/signup` → `/dashboard`.

💡 Vì có `src/` nên middleware phải nằm ở `src/middleware.ts`, không phải ở thư mục gốc.

---

## 5. `src/app/` — Routing (mỗi thư mục = 1 URL)

Quy ước App Router:

- `page.tsx` = nội dung trang, `layout.tsx` = khung bọc ngoài (giữ nguyên khi chuyển trang con)
- `loading.tsx` = hiện trong lúc chờ, `error.tsx` = khi có lỗi, `not-found.tsx` = 404
- `route.ts` = API endpoint (GET/POST)
- `[id]` = tham số động, `(app)` = **route group**: gom nhóm, không xuất hiện trên URL

| File | Làm gì |
|---|---|
| `layout.tsx` (gốc) | Khung HTML toàn site: `metadata` (title, description), font Google, `globals.css`. `metadata.title.template = "%s · BecauseManAge"` → trang nào khai `title: "Dashboard"` sẽ thành "Dashboard · BecauseManAge". |
| `globals.css` | `@import "tailwindcss"` + `@theme { … }`: biến thành class Tailwind (`--color-ink` → `bg-ink`, `text-ink`; `--font-hand` → `font-hand`; `--shadow-sketch` → `shadow-sketch`). Trong `@layer components` là các class tự chế: `.sketch` (viền vẽ tay bằng `border-radius` 8 giá trị), `.box`, `.btn`, `.input`, `.chip`, `.paper-dots`, `.hatch` (sọc chéo bằng `repeating-linear-gradient`). |
| `page.tsx` | Landing page. Server Component, có `DemoBar` minh hoạ phase. |
| `login/`, `signup/` | Bọc `AuthForm` trong `<Suspense>` vì nó dùng `useSearchParams()` (Next yêu cầu). |
| `auth/callback/route.ts` | Người dùng bấm link trong email → Supabase trả về `?code=…` → `exchangeCodeForSession(code)` đổi code lấy session (luồng PKCE). |
| `auth/signout/route.ts` | `POST` → `signOut()` → redirect `303` về trang chủ. Dùng `<form method="post">` thay vì link để tránh bị gọi nhầm bằng GET. |
| `setup/page.tsx` | Trang hướng dẫn khi thiếu env. |
| `not-found.tsx` | 404. |
| `(app)/layout.tsx` | Khung cho mọi trang cần đăng nhập: gọi `requireUser()`, đếm thông báo chưa đọc (`count: "exact", head: true` = chỉ đếm, không tải dữ liệu), render `AppNav`. |
| `(app)/error.tsx`, `loading.tsx` | Lỗi / đang tải cho cả khu vực app. `error.tsx` bắt buộc là Client Component. |
| `(app)/dashboard/page.tsx` | Gom dự án, deadline 14 ngày, priority High, thông báo, notes gần đây. Nhiều query chạy cùng lúc bằng `Promise.all`, rồi xử lý bằng JS thuần (filter / sort). |
| `(app)/notes/page.tsx` | Danh sách bảng mindmap + `MiniMap` vẽ thu nhỏ bằng `position: absolute` theo toạ độ đã scale. |
| `(app)/notes/[id]/page.tsx` | Tải 1 mindmap + danh sách dự án (để trích xuất) → `MindmapEditor`. |
| `(app)/projects/page.tsx` | Danh sách dự án + thanh tiến độ từng cái. |
| `(app)/projects/[id]/layout.tsx` | Header dự án (tên, labels, progress, role) + `ProjectTabs`. Vì là layout nên **không render lại** khi đổi tab, nhưng `router.refresh()` vẫn cập nhật được nó. |
| `(app)/projects/[id]/*/page.tsx` | Mỗi tab 1 file, cùng 1 kiểu: `await params` → `loadProject(id)` → query thêm thứ riêng của tab → trả về 1 Client Component. |
| `(app)/u/[username]/page.tsx` | Profile công khai: gọi 3 RPC (`profile_stats`, `commit_calendar`, `pinned_projects`) + follow + posts. Theme người dùng chọn được map sang class (`BANNER_CLASS`, `FONT_CLASS`). |
| `(app)/settings/profile/page.tsx` | Tải dữ liệu → `ProfileForm`. |
| `(app)/threads/page.tsx` | Feed. Lọc bằng `searchParams` trên URL (`?kind=article`, `?feed=following`) → bấm tab là đổi URL, server lọc, không cần state. |
| `(app)/threads/[id]/page.tsx` | 1 bài + replies. |
| `(app)/notifications/page.tsx` | Danh sách thông báo. |

💡 **Next 15:** `params` và `searchParams` là **Promise** → phải `await params`.

💡 **Vì sao sửa `metadata` trong `layout.tsx` "không thấy gì"?** `metadata` chỉ đi vào thẻ `<head>`: `title` = chữ trên **tab trình duyệt**, `description` = thẻ `<meta>` cho Google / Facebook (**không hiện trên trang**). Title mặc định chỉ dùng cho trang **không tự khai title** (VD trang chủ `/`); `/dashboard` có title riêng nên hiện "Dashboard · BecauseManAge". Sửa xong nhớ F5 rồi nhìn tab, hoặc Ctrl+U xem source.

---

## 6. `src/components/` — Giao diện

### Dùng chung

| File | Làm gì | Kỹ thuật |
|---|---|---|
| `ui.tsx` | `Logo`, `Avatar`, `LabelChip`, `Labels`, `EmptyState`, `PageHeader`, `Card`, `SectionTitle`, `RoleBadge` | Không có `"use client"`, không dùng hook → dùng được ở **cả** server lẫn client. `Labels` luôn sort theo `labelOrder` → vàng, sky, đen đúng thứ tự. |
| `modal.tsx` | Hộp thoại | `if (!open) return null`; bấm nền để đóng nhưng `stopPropagation()` ở hộp bên trong; `useEffect` gắn phím Esc và gỡ ra khi đóng. |
| `progress-bar.tsx` | Thanh tiến độ phase | Mỗi milestone 1 ô `flex-1` (rộng bằng nhau) → phase nhiều mốc tự chiếm nhiều %. Xong: màu đặc. Chưa xong: `.hatch` + `opacity`. |
| `safe-html.tsx` | Render HTML an toàn | Server render text thuần, client `useEffect` mới sanitize rồi `dangerouslySetInnerHTML` → không bị lệch hydration giữa server và client. |
| `shell/app-nav.tsx` | Thanh điều hướng | `usePathname()` để tô đậm link đang mở; menu mobile bằng state `open`. |
| `auth/auth-form.tsx` | Form login + signup chung | 1 component, prop `mode`. `signUp` có `options.data` → vào `raw_user_meta_data` → trigger `handle_new_user` đọc ra username. Không có session sau khi signUp = đang bật xác nhận email. |

### `notes/` — Mindmap (phần khó nhất về frontend, đáng đọc kỹ)

`mindmap-editor.tsx`:

- **Toạ độ "thế giới" và viewport:** mỗi khối có `x, y` trong toạ độ thế giới. Cả lớp được `transform: translate(view.x, view.y) scale(view.zoom)`. `toWorld()` đổi toạ độ chuột trên màn hình sang toạ độ thế giới: `(clientX - left - view.x) / zoom`.
- **Kéo thả không dùng thư viện:** `onPointerDown` ghi "đang kéo cái gì" vào `dragRef` (`useRef`, không gây re-render); một `useEffect` gắn `pointermove` / `pointerup` lên `window` và đọc `dragRef`. Có 4 kiểu kéo: `pan`, `node`, `resize`, `link`.
- **Vì sao dùng `useRef` cho `viewRef`, `nodesRef`?** Hàm trong `useEffect([])` chỉ tạo 1 lần nên sẽ thấy state cũ (stale closure). Ref luôn trỏ tới giá trị mới nhất.
- **Zoom bằng wheel:** phải `addEventListener("wheel", …, { passive: false })` thủ công vì `onWheel` của React là passive, không `preventDefault` được. Zoom quanh con trỏ: giữ điểm thế giới dưới chuột cố định.
- **Dây nối:** SVG `path` đường cong Bézier (`C`). `edgePath()` chọn cạnh nối (trái/phải/trên/dưới) theo vị trí tương đối 2 khối. Chiều cao khối đo bằng `ResizeObserver` (`onMeasure`).
- **Sửa chữ:** `contentEditable` chỉ bật cho khối đang edit; in đậm từng chữ bằng `document.execCommand`; blur thì đọc `innerHTML` → sanitize → lưu. `dangerouslySetInnerHTML` bọc `useMemo` để React không ghi đè lúc đang gõ.
- **Autosave (debounce):** `useEffect` theo `[nodes, edges, view, title]` → `setTimeout(900ms)`; thay đổi mới thì cleanup huỷ timer cũ → chỉ lưu khi user ngừng tay.
- **Chỉ render ở client** (`mounted`): tránh lệch hydration vì sanitize chỉ chạy được ở trình duyệt.

`new-mindmap.tsx`: modal chọn template → `insert(...).select("id").single()` → chuyển trang.

### `projects/` — Quản lý dự án

| File | Làm gì | Kỹ thuật |
|---|---|---|
| `create-project.tsx` | Tạo dự án + labels + milestones phase 1 trong 1 form | Insert `projects` trước, lấy `id`, rồi insert labels / milestones (trigger đã thêm owner nên RLS cho qua). |
| `project-tabs.tsx` | Thanh tab | So `pathname` để biết tab nào đang mở. |
| `milestones-board.tsx` | Tab Milestones | Gom theo phase bằng `Map<number, Milestone[]>`; chọn nhiều bằng mảng `selected`; mark hàng loạt bằng **1 lệnh** `upsert([...], { onConflict: "milestone_id,user_id" })`; hiện "Completed — Marked by A; B" bằng cách lọc marks theo status. `useTransition` + `router.refresh()` để làm mới mà không chặn UI. Form sửa dùng `key={milestone.id}` để reset state khi đổi mốc. |
| `priority-select.tsx` | Priority 🔒 | `upsert` với key động `[col]: id` (`task_id` hoặc `milestone_id`). Riêng tư là nhờ RLS `user_id = auth.uid()`. |
| `task-board.tsx` | Tab Phân công | Ba khu: việc của tôi / bảng phân công tổng / tổng hợp theo thành viên. Lọc bằng state `filter` + `useMemo`. Giao 1 task cho nhiều người = insert nhiều dòng. Member chỉ gửi `status` / `flagged`; còn lại để trigger lo (`assigned_by`, `reviewed_by`…). |
| `gantt.tsx` | Gantt tự vẽ | Mỗi ngày = `px` pixel (34 hoặc 12). `left = (ngày bắt đầu − ngày đầu thang) × px`, `width = số ngày × px`. Cột tên dùng `position: sticky; left: 0` để đứng yên khi cuộn ngang. Rows là discriminated union `type: "phase" \| "milestone" \| "task" \| "group"`. |
| `project-calendar.tsx` | Lịch ngày / tuần / tháng | Gom mọi thứ vào `Map<"YYYY-MM-DD", Item[]>` 1 lần; lưới tháng = 42 ô (6 tuần × 7) bắt đầu từ thứ 2 của tuần chứa ngày 1. |
| `project-chat.tsx` | Chat realtime | Load 200 tin gần nhất (`order desc` rồi `reverse`), `supabase.channel().on("postgres_changes", { event: "INSERT", filter: "channel_id=eq.…" })`; cleanup `removeChannel` khi đổi kênh. Biến `alive` chống set state sau khi đã rời kênh. `canRead()` ở UI chỉ là gợi ý, quyền thật là `can_access_channel()` trong DB. |
| `project-notes.tsx` | Notes bàn giao + clip mindmap | Mở note → `upsert` vào `note_reads` → danh sách "Đã xem bởi". Clip render lại đúng style bằng `SafeHtml` + inline style. |
| `commit-log.tsx` | Kiểu `git log` | Đếm commit theo người bằng `Map`, vẽ thanh tỉ lệ `n / max`. `shortHash` = 7 ký tự đầu của uuid. |
| `members-panel.tsx` | Thành viên | Tìm user bằng `.or("username.ilike.%q%,display_name.ilike.%q%")`; mời lại người cũ bằng `upsert({ left_at: null })`; "xoá" thành viên = set `left_at` (giữ lịch sử). |
| `project-settings.tsx` | Sửa dự án, labels, xoá dự án | Xoá phải gõ đúng tên dự án (chống bấm nhầm). Input `list=` + `<datalist>` để gợi ý nhu cầu. |

### `profile/`, `threads/`, `notifications/`

| File | Làm gì | Kỹ thuật |
|---|---|---|
| `profile/contribution-graph.tsx` | Biểu đồ commit | SVG 53 cột × 7 hàng; `level()` chia số commit thành 5 mức xám. |
| `profile/follow-button.tsx` | Follow / unfollow | Insert / delete bảng `follows`. |
| `profile/profile-form.tsx` | Chỉnh profile | Upload avatar: kiểm tra loại + dung lượng ở client (bucket kiểm lại lần nữa) → `storage.upload("{uid}/avatar-<thời gian>.ext")` → `getPublicUrl`. Tên file có timestamp để trình duyệt không dùng ảnh cache cũ. Pins: xoá hết rồi insert lại theo thứ tự. Có preview cá nhân hoá trực tiếp. |
| `threads/composer.tsx` | Viết bài | Tags tách bằng regex `/[,\s]+/`, tối đa 6. |
| `threads/post-card.tsx` | Thẻ bài viết | Server-safe, dùng chung cho feed + profile. |
| `threads/replies.tsx` | Trả lời kiểu imageboard | Mỗi dòng bắt đầu bằng `>>abc1234` thành link `#abc1234`; id phần tử = shortHash nên nhảy tới đúng reply (`:target`). |
| `notifications/notification-list.tsx` | Thông báo | Realtime INSERT theo `user_id`; đánh dấu đã đọc = set `read_at`. |

---

## 7. Lộ trình đọc gợi ý (khoảng 2–3 buổi)

1. `supabase/schema.sql` phần 0–4 (bảng) → hiểu dữ liệu.
2. `src/lib/progress.ts` + `components/progress-bar.tsx` → tính năng milestone.
3. `src/lib/supabase/*` + `src/middleware.ts` → luồng đăng nhập.
4. `app/(app)/projects/[id]/layout.tsx` → `lib/project-data.ts` → `components/projects/milestones-board.tsx` → nắm vòng đọc → ghi → refresh.
5. `schema.sql` phần 5–7 (RLS + trigger) → vì sao Member không sửa được task người khác.
6. `components/notes/mindmap-editor.tsx` → pointer events, ref, debounce.
7. `gantt.tsx`, `project-calendar.tsx` → tính toán layout bằng toán ngày tháng.

## 8. Bài tập để tự lên tay

1. **Dễ:** thêm field `"Khác"` vào bảng `fields` bằng SQL rồi xem nó xuất hiện ở form.
2. **Dễ:** đổi màu phase trong `PHASE_GREENS` sang xanh dương.
3. **Vừa:** thêm nút "Đánh dấu tất cả thông báo của dự án này là đã đọc".
4. **Vừa:** cho Gantt hiện tên người được giao ngay trên thanh task.
5. **Khó:** kéo thả đổi thứ tự milestone (cập nhật cột `position`).
6. **Khó:** realtime cho tab Milestones (subscribe `milestone_marks` → `router.refresh()`).
