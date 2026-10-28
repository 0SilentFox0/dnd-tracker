import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";

import { DEFAULT_LOCALE, type Locale, type Namespace, NAMESPACES } from "../config";
import { loadMessages } from "../messages";

export async function renderWithIntl(
  ui: ReactElement,
  { locale = DEFAULT_LOCALE, namespaces = NAMESPACES }: { locale?: Locale; namespaces?: readonly Namespace[] } = {},
) {
  const { NextIntlClientProvider } = await vi.importActual<typeof import("next-intl")>("next-intl");

  const messages = await loadMessages(locale, namespaces);

  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
