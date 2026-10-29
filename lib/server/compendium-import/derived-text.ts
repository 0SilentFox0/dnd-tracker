import { createTranslator } from "use-intl/core";

import "server-only";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translator";
import en from "@/messages/en/compendiumReport.json";
import uk from "@/messages/uk/compendiumReport.json";

const MESSAGES = { uk, en } satisfies Record<Locale, unknown>;

const cache = new Map<Locale, Translator>();

/** Sync translator for `compendiumReport.derived.*`: import text is written into the DB in the importer's locale. */
export function derivedTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const cached = cache.get(locale);

  if (cached) return cached;

  const translator = createTranslator({
    locale,
    messages: { compendiumReport: MESSAGES[locale] },
    namespace: "compendiumReport",
    getMessageFallback: ({ namespace, key }) => (namespace ? `${namespace}.${key}` : key),
    onError: () => {},
  } as Parameters<typeof createTranslator>[0]) as unknown as Translator;

  cache.set(locale, translator);

  return translator;
}
