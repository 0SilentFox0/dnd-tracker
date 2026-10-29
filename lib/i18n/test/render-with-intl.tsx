import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";

import { DEFAULT_LOCALE, type Locale, type Namespace } from "../config";
import { loadMessages } from "../messages";

// `errors` is server-only (see docs/architecture/i18n.md): loading it would hide raw-key bugs in client code
const CLIENT_NAMESPACES: readonly Namespace[] = ["common", "validation"];

export async function renderWithIntl(
  ui: ReactElement,
  { locale = DEFAULT_LOCALE, namespaces = CLIENT_NAMESPACES }: { locale?: Locale; namespaces?: readonly Namespace[] } = {},
) {
  const { NextIntlClientProvider } = await vi.importActual<typeof import("next-intl")>("next-intl");

  const messages = await loadMessages(locale, namespaces);

  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
