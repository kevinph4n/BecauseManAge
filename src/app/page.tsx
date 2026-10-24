import Link from "next/link";
import { Logo } from "@/components/ui";
import { PHASE_GREENS } from "@/lib/progress";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    no: "01",
    title: "Mindmap Notetaking",
    body: "Kéo thả các khối thông tin trên một mặt giấy vô hạn. Đổi font, màu nền, cỡ chữ, in đậm, in nghiêng. e.g, Quán ăn Q1–Q3, tính cách một người, ý tưởng lộn xộn —> nhét hết vào.",
  },
  {
    no: "02",
    title: "Milestones",
    body: "10 mốc xong = 100%. Mở rộng dự án thêm mốc → % tự co lại. Mỗi phase một sắc xanh, nhìn thanh tiến độ là biết dự án đã lớn lên thế nào.",
  },
  {
    no: "03",
    title: "Owner → Manager → Member",
    body: "Owner bổ nhiệm Manager, Manager giao việc, Member nhận thông báo và đánh dấu tiến độ. Bảng phân công tổng để ai cũng double-check được.",
  },
  {
    no: "04",
    title: "Chat theo cấp bậc",
    body: "Kênh toàn dự án · kênh Members · kênh tuỳ chọn · kênh quản lý. Đúng người, đúng chuyện.",
  },
  {
    no: "05",
    title: "Gantt + Lịch",
    body: "Nhìn timeline milestones & tasks dạng Gantt, xem deadline và sự kiện theo ngày, tuần, tháng.",
  },
  {
    no: "06",
    title: "Commits & Profile",
    body: "Mỗi lần đánh dấu tiến độ là một commit. Profile có biểu đồ đóng góp đen trắng, dự án được pin, threads, followers.",
  },
];

export default async function Landing() {
  let loggedIn = false;
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = Boolean(data.user);
  }

  return (
    <div className="paper-dots min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Logo />
        <div className="flex gap-2">
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-primary">
              Vào app →
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Đăng nhập
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Bắt đầu
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 md:px-6 md:pt-20">
        <p className="h-hand text-xl text-smoke">because man age · because manage</p>
        <h1 className="h-hand mt-2 max-w-4xl text-5xl leading-[1.05] md:text-7xl">
          Con người rồi sẽ già đi,
          <br />
          <span className="scribble">nên làm gì làm cho tử tế.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-smoke">
          BecauseManAge là app quản lý công việc tối giản: note dạng mindmap cho những thứ cần nhớ, và quản lý dự án theo
          milestones — có phân quyền, Gantt, lịch, chat theo cấp bậc và nhật ký commit cho từng thành viên.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={loggedIn ? "/dashboard" : "/signup"} className="btn btn-primary px-6 py-3 text-base">
            Manage cho tử tế →
          </Link>
          <a href="#features" className="btn px-6 py-3 text-base">
            Xem tính năng
          </a>
        </div>

        {/* minh hoạ thanh tiến độ phase */}
        <div className="box shadow-sketch mt-14 max-w-3xl p-5">
          <p className="h-hand text-xl">Dự án lớn dần theo từng phase</p>
          <div className="mt-4 space-y-4 text-sm">
            <DemoBar label="Phase 1 xong" parts={[{ n: 10, done: 10, phase: 1 }]} />
            <DemoBar
              label="Mở rộng +5 mốc"
              parts={[
                { n: 10, done: 10, phase: 1 },
                { n: 5, done: 0, phase: 2 },
              ]}
            />
            <DemoBar
              label="Phase 2 xong, +5 mốc"
              parts={[
                { n: 10, done: 10, phase: 1 },
                { n: 5, done: 5, phase: 2 },
                { n: 5, done: 0, phase: 3 },
              ]}
            />
          </div>
        </div>
      </section>

      <section id="features" className="border-t-[1.5px] border-ink bg-paper">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.no} className="box p-5">
              <p className="font-mono text-xs text-smoke">{f.no}</p>
              <h3 className="h-hand mt-1 text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t-[1.5px] border-ink bg-ink py-8 text-center text-paper">
        <p className="h-hand text-2xl">BecauseManAge</p>
        <p className="mt-1 text-xs opacity-70">Next.js · Supabase · Tailwind — làm cho tử tế.</p>
      </footer>
    </div>
  );
}

function DemoBar({ label, parts }: { label: string; parts: { n: number; done: number; phase: number }[] }) {
  const total = parts.reduce((s, p) => s + p.n, 0);
  const done = parts.reduce((s, p) => s + p.done, 0);
  const cells = parts.flatMap((p) =>
    Array.from({ length: p.n }, (_, i) => ({ phase: p.phase, done: i < p.done })),
  );
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span>{label}</span>
        <span className="h-hand text-lg">{Math.round((done / total) * 100)}%</span>
      </div>
      <div className="box flex h-5 overflow-hidden p-0!">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`h-full flex-1 ${c.done ? "" : "hatch"} ${i ? "border-l border-white/70" : ""}`}
            style={{ background: PHASE_GREENS[c.phase - 1], opacity: c.done ? 1 : 0.35 }}
          />
        ))}
      </div>
    </div>
  );
}
