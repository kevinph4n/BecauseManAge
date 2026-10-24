import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BecauseManAge - Manage cho tử tế...",
    template: "%s · BecauseManAge",
  },
  description:
    "Because Man Age: con người rồi cũng sẽ già đi... nên làm gì thì làm cho tử tế.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Patrick+Hand&display=swap"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
