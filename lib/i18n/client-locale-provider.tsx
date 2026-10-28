"use client";

import { useSyncExternalStore } from "react";
import { NextIntlClientProvider } from "next-intl";

import { readLocaleCookie } from "./client-cookie";
import { DEFAULT_LOCALE, type Locale,LOCALE_CHANGE_EVENT } from "./config";
import { HtmlLang } from "./html-lang";
import { resolveLocale } from "./resolve-locale";

type Messages = Record<string, unknown>;

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
}

// mirrors the server: cookie, then the browser languages (the Accept-Language source), then the default
function readLocale(): Locale {
  return resolveLocale({ cookie: readLocaleCookie(), acceptLanguage: navigator.languages.join(",") });
}

export function ClientLocaleProvider({ messages, children }: { messages: Record<Locale, Messages>; children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
