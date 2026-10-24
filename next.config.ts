import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // avatars -> Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  // MVP -> no ESLint yet -> turn off lint during build -> deploy vercel (no blocking)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
