import Link from "next/link";

export default function NotFound() {
  return (
    <main className="paper-dots flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="h-hand text-8xl">404</p>
      <p className="h-hand text-2xl">Trang này già quá nên… đi mất rồi.</p>
      <p className="text-sm text-smoke">Hoặc bạn không có quyền xem nó.</p>
      <Link href="/dashboard" className="btn btn-primary">
        Về Dashboard
      </Link>
    </main>
  );
}
