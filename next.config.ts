import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // avatar được lưu ở Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  // Bản MVP không cài ESLint → tắt bước lint khi build để build trên Vercel không bị chặn
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
