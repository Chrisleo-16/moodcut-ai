import type { Metadata } from "next";
import { Suspense } from "react";
import { Anton, Crimson_Pro, Inter_Tight, Montserrat } from "next/font/google";

import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const ui = Inter_Tight({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const serif = Crimson_Pro({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-crimson",
});

const label = Montserrat({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  title: {
    default: "Moodcut",
    template: "%s — Moodcut",
  },
  description:
    "Films, series, and people, with official YouTube trailers and a mood search that can run on-device. Moodcut does not stream movies or series.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${serif.variable} ${label.variable} light`} data-theme="light">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <Providers>
          <Suspense fallback={<div className="hdr" aria-hidden />}>
            <SiteHeader />
          </Suspense>
          <main id="content">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
