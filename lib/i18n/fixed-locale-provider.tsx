"use client";

import { NextIntlClientProvider } from "next-intl";

import type { Locale } from "./config";
import { HtmlLang } from "./html-lang";

// client-side so the server render stays static (the server provider reads request config)
export function FixedLocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      <HtmlLang locale={locale} lock />
      {children}
    </NextIntlClientProvider>
  );
}
