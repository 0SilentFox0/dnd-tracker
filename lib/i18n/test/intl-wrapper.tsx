import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

import type { Locale } from "../config";
import { catalog } from "./text";

/** Real catalogs without async loading; the test file must `vi.unmock("next-intl")`, otherwise the global mock passes children through. */
export function IntlWrapper({ children, locale = "uk" }: { children: ReactNode; locale?: Locale }) {
  return (
    <NextIntlClientProvider locale={locale} messages={catalog(locale) as never} onError={() => undefined}>
      {children}
    </NextIntlClientProvider>
  );
}
