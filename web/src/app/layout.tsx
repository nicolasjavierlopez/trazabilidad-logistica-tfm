import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Trazabilidad Logística - PFM",
  description: "Sistema de trazabilidad logística sobre Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen">
        <Providers>
          <AuthGuard>{children}</AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
