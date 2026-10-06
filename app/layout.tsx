import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";
import { hudFontClassName } from "@/components/hud";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { QueryProvider } from "@/lib/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  preload: false,
});

export const metadata: Metadata = {
  title: "D&D Combat Tracker",
  description: "Combat tracker for D&D 5e campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark">
      <body className={`${geistSans.variable} ${hudFontClassName} antialiased`}>
        <QueryProvider>
          <ConfirmProvider>
            <Header />
            <PageTransition>{children}</PageTransition>
          </ConfirmProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
