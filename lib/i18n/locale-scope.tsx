import { NextIntlClientProvider } from "next-intl";

import type { Namespace } from "./config";
import { HtmlLang } from "./html-lang";
import { loadMessages } from "./messages";
import { getRequestLocale } from "./request-locale";

export async function LocaleScope({ namespaces, children }: { namespaces: readonly Namespace[]; children: React.ReactNode }) {
  const locale = await getRequestLocale();

  const messages = await loadMessages(locale, namespaces);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} lock />
      {children}
    </NextIntlClientProvider>
  );
}
