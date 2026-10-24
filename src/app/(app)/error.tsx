"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="box shadow-sketch mx-auto mt-10 max-w-lg p-6">
      <p className="h-hand text-3xl">Toang rồi 😵</p>
      <p className="mt-2 text-sm text-smoke">{error.message || "Có lỗi xảy ra."}</p>
      <p className="mt-2 text-xs text-smoke">
        Nếu lỗi kiểu “relation … does not exist” → bạn chưa chạy <code className="font-mono">supabase/schema.sql</code>.
      </p>
      <button className="btn btn-primary mt-4" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
