import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

import type { Locale } from "../config";
import { catalog } from "./text";

/** Real catalogs without async loading; the test file must `vi.unmock("next-intl")`, otherwise the global mock passes children through. */
export function IntlWrapper({ children, locale = "uk", timeZone }: { children: ReactNode; locale?: Locale; timeZone?: string }) {
  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={catalog(locale) as never} onError={() => undefined}>
      {children}
    </NextIntlClientProvider>
  );
}
