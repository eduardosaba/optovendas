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
  turbopack: {},
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/**",
          },
        ]
      : [],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
