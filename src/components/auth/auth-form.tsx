"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(translate(error.message));
      router.push(params.get("next") || "/dashboard");
      router.refresh();
      return;
    }

    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(uname)) {
      setLoading(false);
      return setError("Username 3–30 ký tự, chỉ gồm a-z, 0-9, dấu _ hoặc .");
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: uname, display_name: displayName.trim() },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);
    if (error) return setError(translate(error.message));
    if (data.session) {
      // "Confirm email" đang tắt → vào luôn
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("Đã gửi email xác nhận 📬 Mở mail và bấm link để kích hoạt tài khoản (nhớ check cả Spam).");
    }
  }

  return (
    <form onSubmit={onSubmit} className="box shadow-sketch w-full max-w-sm space-y-4 p-6">
      <div>
        <h1 className="h-hand text-4xl">{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
        <p className="text-sm text-smoke">
          {mode === "login" ? "Quay lại manage cho tử tế." : "Vì con người rồi sẽ già đi — bắt đầu thôi."}
        </p>
      </div>

      {mode === "signup" && (
        <>
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="vd: tung.dev" required />
          </div>
          <div>
            <label className="label">Tên hiển thị (tuỳ)</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
        </>
      )}
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <label className="label">Mật khẩu</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {error && <p className="sketch bg-white px-3 py-2 text-sm text-danger">⚠ {error}</p>}
      {info && <p className="sketch bg-fog px-3 py-2 text-sm">{info}</p>}

      <button className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Đợi xíu…" : mode === "login" ? "Vào thôi →" : "Tạo tài khoản →"}
      </button>

      <p className="text-center text-sm text-smoke">
        {mode === "login" ? (
          <>
            Chưa có tài khoản?{" "}
            <Link href="/signup" className="font-semibold text-ink underline">
              Đăng ký
            </Link>
          </>
        ) : (
          <>
            Có tài khoản rồi?{" "}
            <Link href="/login" className="font-semibold text-ink underline">
              Đăng nhập
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Sai email hoặc mật khẩu.";
  if (/email not confirmed/i.test(msg)) return "Email chưa được xác nhận — check hộp thư nhé.";
  if (/already registered/i.test(msg)) return "Email này đã có tài khoản.";
  if (/rate limit/i.test(msg)) return "Gửi email quá nhiều (giới hạn của Supabase free). Đợi chút rồi thử lại.";
  if (/database error saving new user/i.test(msg)) return "Lỗi DB khi tạo user — bạn đã chạy supabase/schema.sql chưa?";
  return msg;
}
