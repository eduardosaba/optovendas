import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ConfigProvider } from "@/context/ConfigContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "OptoVendas • Inteligência em Óptica",
  description: "Sistema de Gestão Optométrica e Comercial",
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
  themeColor: "#0891b2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable}`}>
      <body className="overflow-x-hidden antialiased selection:bg-cyan-100 selection:text-cyan-900 bg-slate-50 text-slate-900 font-sans">
        <ConfigProvider>
          <ToastProvider>
            <main className="min-h-screen">{children}</main>
          </ToastProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
