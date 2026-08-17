import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseHostname = "";

try {
  if (supabaseUrl) {
    supabaseHostname = new URL(supabaseUrl).hostname;
  }
} catch {
  supabaseHostname = "";
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            // mais específico para storage público do Supabase
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true,
});

export default process.env.ENABLE_PWA === "true" ? withPWA(nextConfig) : nextConfig;
