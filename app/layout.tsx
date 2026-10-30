import type { Metadata } from "next";

import "./globals.css";
import "./fonts.css";
import { HUD_PRELOAD_FONTS, hudFontClassName } from "@/components/hud";
import { HeaderGate } from "@/components/layout/HeaderGate";
import { PageTransition } from "@/components/layout/PageTransition";
import { ScreenBackground } from "@/components/layout/screen-background";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { SITE_INDEXING, SITE_URL } from "@/lib/constants/site";
import { ClientLocaleProvider } from "@/lib/i18n/client-locale-provider";
import { loadStaticMessages } from "@/lib/i18n/messages";
import { ROOT_NAMESPACES } from "@/lib/i18n/scopes";
import { QueryProvider } from "@/lib/providers/query-provider";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "D&D Combat Tracker",
  description: "Dungeon Master companion for D&D 5e campaigns",
  robots: SITE_INDEXING ? undefined : { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await loadStaticMessages(ROOT_NAMESPACES);

  return (
    <html lang="uk" className="dark">
      <head>
        {HUD_PRELOAD_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body className={`font-geist ${hudFontClassName} antialiased`}>
        <ScreenBackground />
        <ClientLocaleProvider messages={messages}>
          <QueryProvider>
            <ConfirmProvider>
              <HeaderGate />
              <PageTransition>{children}</PageTransition>
            </ConfirmProvider>
          </QueryProvider>
        </ClientLocaleProvider>
      </body>
    </html>
  );
}
