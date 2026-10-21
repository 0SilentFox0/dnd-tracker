import type { Metadata } from "next";

import "./globals.css";
import "./fonts.css";
import { HUD_PRELOAD_FONTS, hudFontClassName } from "@/components/hud";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { ScreenBackground } from "@/components/layout/screen-background";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { QueryProvider } from "@/lib/providers/query-provider";
import { createClient } from "@/lib/supabase/server";

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
      <head>
        {HUD_PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body className={`font-geist ${hudFontClassName} antialiased`}>
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
