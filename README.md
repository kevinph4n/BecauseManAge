# BecauseManAge

> **because man age** — vì con người rồi sẽ già đi, nên làm gì làm cho tử tế.
> **because manage** — vì cần quản lý.

App quản lý công việc tối giản (đen trắng, style vẽ tay):

- **Notes mindmap**: kéo thả khối thông tin, đổi font / màu nền / cỡ chữ / đậm / nghiêng, nối dây, rồi trích xuất sang dự án.
- **Projects**: milestones theo phase (tự co %), Owner → Manager → Member, bảng phân công, Gantt, lịch, chat 4 tầng, notes bàn giao, commits.
- **Profile**: bio, field, avatar, personal info tuỳ chọn, followers/following, biểu đồ commit đen trắng, pin dự án, threads.

Tech stack: **Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage + Realtime) · Vercel**.
Không dùng thêm thư viện UI nào: Gantt, lịch, mindmap đều tự viết. Ngoài Next/React/Supabase chỉ có `dompurify` (để lọc HTML của note).

Pitch / MVP / demo script cho team & judges: xem [`docs/PITCH.md`](docs/PITCH.md).

---

## 0. Cần có

- Node.js **20+** (`node -v`)
- 1 project Supabase (free tier là đủ): https://supabase.com/dashboard

## 1. Dựng database trên Supabase (SQL Editor)

1. Supabase Dashboard → project của bạn → **SQL Editor** → **New query**.
2. Mở `supabase/schema.sql`, copy **toàn bộ** → dán → **Run**.
   - File tạo: bảng, RLS policies, triggers, RPC functions, bucket `avatars` (≤ 2MB, png/jpg/webp/gif), realtime cho chat + thông báo.
   - Muốn chạy lại từ đầu thì chạy `supabase/reset.sql` trước (⚠ **xoá sạch data**, giữ lại user trong Auth).
3. Kiểm tra: **Table Editor** phải thấy các bảng `profiles`, `projects`, `milestones`, … và bảng `fields` đã có sẵn dữ liệu.

> Nếu đoạn **storage policies** báo lỗi quyền (`must be owner of table objects`): xoá phần 9 trong file, chạy lại phần còn lại, rồi tạo bucket `avatars` bằng tay ở **Storage** (Public, giới hạn 2MB, MIME `image/png, image/jpeg, image/webp, image/gif`) và thêm 4 policy giống phần 9 qua giao diện **Storage → Policies**.

## 2. Bật đăng ký / đăng nhập bằng email

Supabase có sẵn dịch vụ gửi mail (built-in SMTP) — dùng tạm để test được, nhưng **bị giới hạn vài email/giờ**.

**Authentication → Sign In / Providers → Email**: bật Email provider (mặc định đã bật).

Chọn 1 trong 2 cách:

| Cách | Làm gì | Khi nào dùng |
|---|---|---|
| **A. Test nhanh** | Tắt **Confirm email** | Đăng ký xong vào app luôn, không cần mail. Hợp để demo / tạo nhiều acc test. |
| **B. Có xác nhận email** | Giữ **Confirm email** bật | User phải bấm link trong mail. Dùng mail của Supabase (giới hạn ít), sau này gắn SMTP riêng (Resend, SendGrid…) ở **Authentication → Emails → SMTP Settings**. |

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (lúc deploy đổi thành domain Vercel)
- **Redirect URLs** thêm:
  - `http://localhost:3000/**`
  - `https://<tên-app>.vercel.app/**` (khi deploy)

Luồng xác nhận email: link trong mail → Supabase verify → chuyển về `/auth/callback?code=…` → app đổi code lấy session (`src/app/auth/callback/route.ts`) → vào `/dashboard`.

## 3. Chạy local

```bash
npm install
cp .env.example .env.local      # Windows (PowerShell): copy .env.example .env.local
```

Điền `.env.local` (lấy ở **Project Settings → API Keys**, hoặc nút **Connect** trên dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # hoặc dùng dòng ANON_KEY bên dưới
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev          # http://localhost:3000
npm run build        # kiểm tra build trước khi deploy
```

> ⚠ **Không bao giờ** bỏ `service_role` / secret key vào biến `NEXT_PUBLIC_*`. App này chỉ cần publishable/anon key, mọi quyền đã được RLS chặn ở database.

### Test nhanh các role

Mở 3 cửa sổ (thường + ẩn danh + trình duyệt khác) → đăng ký 3 tài khoản:

1. Acc A tạo dự án (A = **Owner**) → tab *Thành viên* → thêm B, C bằng username.
2. A bổ nhiệm B làm **Manager**.
3. B vào tab *Phân công* → giao việc cho C → C thấy chuông thông báo.
4. C tick milestone → *In progress*; A cũng tick cùng mốc → hiện “In progress — Marked by C; A”.
5. C bấm ⚑ *Báo vấn đề* trên task → A, B nhận thông báo → A vào *Xem xét* để giao lại.
6. Chat: C thấy kênh **members**, A/B thì không; A/B thấy kênh **quản-lý**, C thì không.
7. Priority 🔒: mỗi người đặt High/Low khác nhau, người khác không thấy.

## 4. Deploy lên Vercel

1. Push code lên GitHub (file `.env.local` đã nằm trong `.gitignore`).
2. Vercel → **Add New Project** → import repo. Framework tự nhận Next.js, không cần chỉnh build command.
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (hoặc `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `NEXT_PUBLIC_SITE_URL` = `https://<tên-app>.vercel.app`
4. Deploy. Sau đó quay lại Supabase → **URL Configuration**: đổi **Site URL** thành domain Vercel, thêm `https://<tên-app>.vercel.app/**` vào Redirect URLs.

Ghi chú khi deploy:

- Biến `NEXT_PUBLIC_*` được **nhúng lúc build** → đổi env xong phải **Redeploy**.
- Nên chọn **Function Region** của Vercel gần region Supabase (VD Supabase ở Singapore → Vercel `sin1`): *Project Settings → Functions → Function Region*. Mỗi request đều gọi Supabase nên gần nhau sẽ nhanh hơn hẳn.
- Preview deployments có URL dạng `*-<team>.vercel.app` → muốn đăng nhập/confirm email trên preview thì thêm `https://*-<team>.vercel.app/**` vào Redirect URLs.
- Supabase free tier **tự pause project sau ~7 ngày không có request** → trước buổi demo nhớ mở app 1 lần (hoặc bấm Restore trên dashboard).
- Ảnh avatar lấy từ `*.supabase.co` đã khai báo trong `next.config.ts`.

## 5. Sau này chuyển sang Supabase CLI

Migration đầu tiên đã có sẵn: `supabase/migrations/20261024000000_init.sql` (giống hệt `schema.sql`).

```bash
npx supabase init                      # tạo supabase/config.toml (giữ nguyên thư mục migrations)
npx supabase login
npx supabase link --project-ref <ref>  # ref nằm trong URL dashboard

# Nếu DB trên cloud ĐÃ chạy schema.sql bằng SQL Editor → đánh dấu migration này là đã áp dụng:
npx supabase migration repair --status applied 20261024000000

# Từ giờ mỗi thay đổi = 1 file migration mới:
npx supabase migration new add_something
npx supabase db push

# Generate type TypeScript từ DB thật (thay cho src/lib/types.ts viết tay):
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

Chạy local full stack (cần Docker): `npx supabase start` → dùng URL/key local in ra trong `.env.local`.

## 6. Cấu trúc thư mục

```
supabase/
  schema.sql                 # dán vào SQL Editor
  reset.sql                  # xoá sạch để chạy lại
  migrations/                # cho Supabase CLI sau này
docs/PITCH.md                # MVP, tính năng nổi bật, demo script
src/
  middleware.ts              # refresh session + chặn route khi chưa login
  app/
    page.tsx                 # landing
    login/ signup/ setup/    # auth + trang hướng dẫn khi thiếu env
    auth/callback|signout    # route handlers
    (app)/                   # khu vực cần đăng nhập
      dashboard/ notes/ notes/[id]/ projects/ threads/ notifications/
      u/[username]/          # profile công khai
      settings/profile/      # chỉnh profile
      projects/[id]/         # layout chung + các tab:
        page.tsx (Milestones) tasks/ timeline/ calendar/ chat/ notes/ commits/ members/ settings/
  components/
    notes/                   # mindmap editor
    projects/                # milestones, phân công, gantt, lịch, chat, …
    profile/ threads/ shell/ notifications/
  lib/
    supabase/                # client (browser) / server / middleware
    progress.ts              # logic % tiến độ & màu phase
    types.ts utils.ts mindmap.ts sanitize.ts data.ts project-data.ts
```

## 7. Phân quyền (RLS — chặn ở database, không chỉ ở UI)

| Hành động | Owner | Manager | Member | Ghi chú |
|---|:-:|:-:|:-:|---|
| Xem dự án, milestones, tasks, notes, commits | ✅ | ✅ | ✅ | chỉ thành viên đang tham gia |
| Sửa thông tin dự án, labels, milestones | ✅ | ✅ | — | |
| Xoá dự án | ✅ | — | — | |
| Thêm / mời ra thành viên | ✅ | ✅ | — | Member tự rời được |
| Bổ nhiệm / bãi nhiệm Manager | ✅ | — | — | trigger `guard_member_role` |
| Giao việc, giao lại, ghi chú xem xét | ✅ | ✅ | — | |
| Đổi status / báo vấn đề task của mình | ✅ | ✅ | ✅ | trigger chặn member sửa field khác |
| Mark milestone (In progress / Completed / Hiatus) | ✅ | ✅ | ✅ | mỗi người 1 mark / mốc |
| Priority cá nhân | chỉ mình | chỉ mình | chỉ mình | người khác không query được |
| Chat 1 `toàn-dự-án` | ✅ | ✅ | ✅ | |
| Chat 2 `members` | — | — | ✅ | không gian riêng của Members |
| Chat 3 tuỳ chọn | nếu được thêm | nếu được thêm | nếu được thêm | Owner/Manager tạo |
| Chat 4 `quản-lý` | ✅ | ✅ | — | |

## 8. Luật tính tiến độ

`src/lib/progress.ts`:

- `% = số milestone Completed / tổng milestone` (làm tròn). 10/10 = 100% → thêm 1 mốc = 10/11 = **91%**.
- Một milestone tính là **Completed** khi có ít nhất 1 thành viên mark Completed (muốn “cần cả team đồng ý” thì sửa hàm `milestoneState`).
- Màu theo phase: Phase 1 xanh nhạt nhất, mỗi lần **Mở rộng dự án** → phase mới đậm hơn 1 bậc. Thanh tiến độ chia ô theo số mốc, nên 10 mốc phase 1 + 5 mốc phase 2 = 66% nhạt / 33% đậm hơn.

## 9. Lỗi hay gặp

| Lỗi | Nguyên nhân / cách sửa |
|---|---|
| `Database error saving new user` khi đăng ký | Chưa chạy `schema.sql` (trigger tạo profile), hoặc chạy lỗi giữa chừng → chạy `reset.sql` rồi chạy lại. |
| `relation "public.xxx" does not exist` | Chưa chạy `schema.sql`. |
| Bị đẩy về `/setup` | Thiếu env trong `.env.local` → điền xong restart `npm run dev`. |
| Đăng ký không thấy mail | Built-in SMTP bị giới hạn số mail/giờ, check Spam; hoặc tắt **Confirm email** để test. |
| Link xác nhận mở ra lỗi / về localhost trên production | Chưa sửa **Site URL / Redirect URLs** + `NEXT_PUBLIC_SITE_URL`. |
| Chat / thông báo không realtime | Kiểm tra **Database → Publications → supabase_realtime** có `chat_messages`, `notifications`. |
| Upload avatar lỗi | File > 2MB hoặc sai định dạng; hoặc thiếu bucket/policy `avatars` (xem bước 1). |

## 10. Giới hạn của bản MVP / việc nên làm tiếp

- Mindmap lưu dạng JSON 1 cục (đơn giản, nhanh) → chưa có chỉnh sửa realtime nhiều người cùng lúc.
- Chưa có kéo thả đổi thứ tự milestone (đổi `phase` / sửa ngày trong form Sửa).
- Thông báo trong app (chưa gửi email/push).
- Chưa có i18n (UI tiếng Việt), chưa có dark mode toàn app (profile có tuỳ chọn banner đảo màu).

> ⚠ Code này được viết trong môi trường **không truy cập được npm**, nên chưa chạy `npm install` / `npm run build` thật. Logic đã được soát kiểu bằng TypeScript với type giả lập. Lần đầu chạy nếu có lỗi build/type nào thì gửi log để sửa.
