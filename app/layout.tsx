import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";
import { hudFontClassName } from "@/components/hud";
import { Header } from "@/components/layout/Header";
import { ScreenBackground } from "@/components/layout/screen-background";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { QueryProvider } from "@/lib/providers/query-provider";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  preload: false,
});

export const metadata: Metadata = {
  title: "D&D Combat Tracker",
  description: "Combat tracker for D&D 5e campaigns",
};

async function getSessionEmail(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  return data?.claims?.email ?? null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const email = await getSessionEmail();

  return (
    <html lang="uk" className="dark">
      <body className={`${geistSans.variable} ${hudFontClassName} antialiased`}>
        <ScreenBackground />
        <QueryProvider>
          <ConfirmProvider>
            <Header email={email} />
            <PageTransition>{children}</PageTransition>
          </ConfirmProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
