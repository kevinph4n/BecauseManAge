import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/ui";

export const metadata = { title: "Đăng ký" };

export default function SignupPage() {
  return (
    <main className="paper-dots flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <Logo />
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
