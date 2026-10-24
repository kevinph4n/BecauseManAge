import { Logo } from "@/components/ui";

export const metadata = { title: "Setup" };

export default function SetupPage() {
  return (
    <main className="paper-grid flex min-h-screen items-center justify-center p-4">
      <div className="box shadow-sketch max-w-lg space-y-4 p-6">
        <Logo />
        <h1 className="h-hand text-3xl">Chưa cấu hình Supabase 🛠</h1>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            Copy <code className="font-mono">.env.example</code> thành <code className="font-mono">.env.local</code>
          </li>
          <li>
            Điền <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> và{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (hoặc ANON_KEY)
          </li>
          <li>
            Chạy <code className="font-mono">supabase/schema.sql</code> trong SQL Editor
          </li>
          <li>
            Restart <code className="font-mono">npm run dev</code>
          </li>
        </ol>
        <p className="text-sm text-smoke">Chi tiết xem README.md.</p>
      </div>
    </main>
  );
}
