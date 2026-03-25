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
  // Removido uso explícito do Turbopack para evitar conflitos no CI (Vercel).
  reactStrictMode: true,
  // Habilita uma configuração vazia de Turbopack para evitar erro quando
  // há custom webpack configs em uso. Mantém comportamento atual.
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
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
