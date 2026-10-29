import { NextIntlClientProvider } from "next-intl";

import type { Namespace } from "./config";
import { HtmlLang } from "./html-lang";
import { loadMessages } from "./messages";
import { getRequestLocale } from "./request-locale";
import { getRequestTimeZone } from "./request-time-zone";

export async function LocaleScope({ namespaces, children }: { namespaces: readonly Namespace[]; children: React.ReactNode }) {
  const [locale, timeZone] = await Promise.all([getRequestLocale(), getRequestTimeZone()]);

  const messages = await loadMessages(locale, namespaces);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <HtmlLang locale={locale} lock />
      {children}
    </NextIntlClientProvider>
  );
}
