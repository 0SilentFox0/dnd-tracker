import { createTranslator } from "use-intl/core";

import { DEFAULT_LOCALE, type Locale, NAMESPACES } from "../config";
import { formatText } from "../text-ref";
import type { Translator } from "../translator";

import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

const files = (import.meta as unknown as { glob: (pattern: string, options: { eager: true; import: "default" }) => Record<string, Record<string, unknown>> }).glob("../../../messages/*/*.json", { eager: true, import: "default" });

function catalog(locale: Locale): Record<string, unknown> {
  const own = (ns: string) => files[`../../../messages/${locale}/${ns}.json`] ?? {};

  const base = (ns: string) => files[`../../../messages/${DEFAULT_LOCALE}/${ns}.json`] ?? {};

  return Object.fromEntries(NAMESPACES.map((ns) => [ns, merge(base(ns), own(ns))]));
}

function merge(base: Record<string, unknown>, own: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(own)) {
    const current = out[key];

    out[key] = typeof current === "object" && current !== null && typeof value === "object" && value !== null ? merge(current as Record<string, unknown>, value as Record<string, unknown>) : value;
  }

  return out;
}

const translators = new Map<Locale, Translator>();

function translatorFor(locale: Locale): Translator {
  const cached = translators.get(locale);

  if (cached) return cached;

  const created = createTranslator({
    locale,
    messages: catalog(locale),
    getMessageFallback: ({ namespace, key }) => (namespace ? `${namespace}.${key}` : key),
    onError: () => {},
  } as Parameters<typeof createTranslator>[0]) as unknown as Translator;

  translators.set(locale, created);

  return created;
}

export const textOf = (line: LogLine, locale: Locale = DEFAULT_LOCALE): string => formatText(translatorFor(locale), line);

export function logTextOf(action: Pick<BattleAction, "log" | "resultText">, locale: Locale = DEFAULT_LOCALE): string {
  if (!action.log) return action.resultText;

  return action.log.map((line) => textOf(line, locale)).join(" | ");
}
