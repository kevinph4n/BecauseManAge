import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/ui";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="paper-dots flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
