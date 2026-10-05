import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { BackgroundImage } from "@/components/layout/BackgroundImage";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { QueryProvider } from "@/lib/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ConfirmProvider>
            <BackgroundImage />
            <Header />
            <PageTransition>{children}</PageTransition>
          </ConfirmProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
