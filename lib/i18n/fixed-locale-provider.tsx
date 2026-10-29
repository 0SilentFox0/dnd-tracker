"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";

import { readLocaleCookie, writeLocaleCookie } from "./client-cookie";
import { APP_TIME_ZONE, type Locale,LOCALE_CHANGE_EVENT } from "./config";
import { HtmlLang } from "./html-lang";

// client-side so the server render stays static (the server provider reads request config)
export function FixedLocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    if (readLocaleCookie()) return;

    // the language the visitor read the landing in becomes their choice for sign-up
    writeLocaleCookie(locale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={{}} timeZone={APP_TIME_ZONE}>
      <HtmlLang locale={locale} lock />
      {children}
    </NextIntlClientProvider>
  );
}
