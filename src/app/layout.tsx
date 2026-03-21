import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "OptoVendas - Gestao Optometrica",
  description: "Sistema completo para optometria e otica itinerante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
