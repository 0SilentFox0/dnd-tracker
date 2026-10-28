"use client";

import { useSyncExternalStore } from "react";
import { NextIntlClientProvider } from "next-intl";

import { DEFAULT_LOCALE, isLocale, type Locale,LOCALE_COOKIE } from "./config";
import { HtmlLang } from "./html-lang";

type Messages = Record<string, unknown>;

export const LOCALE_CHANGE_EVENT = "locale-change";

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
}

function readLocaleCookie(): Locale {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${LOCALE_COOKIE}=`));

  const value = match?.slice(LOCALE_COOKIE.length + 1);

  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function ClientLocaleProvider({ messages, children }: { messages: Record<Locale, Messages>; children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocaleCookie, () => DEFAULT_LOCALE);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
