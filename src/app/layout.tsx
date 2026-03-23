import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ConfigProvider } from "@/context/ConfigContext";

export const metadata: Metadata = {
  title: "OptoVendas",
  description: "Sistema de Gestao Optometrica",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ConfigProvider>
          <ToastProvider>{children}</ToastProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
