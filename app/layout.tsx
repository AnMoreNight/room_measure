import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const title = "CAMESUKE — 写真でトイレの自動採寸";
const description = "お客様の写真からトイレ空間の寸法を自動計測し、見積もり作成を支援します。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#006973",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* Not covered by the Metadata API — React hoists these into <head> on render. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
