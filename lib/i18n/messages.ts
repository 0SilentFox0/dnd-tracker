import { DEFAULT_LOCALE, type Locale, LOCALES, type Namespace } from "./config";
import { localSource } from "./local-source";

import { WHATS_NEW_SHOWN } from "@/lib/onboarding/whats-new";

type Messages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];

    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }

  return result;
}

export async function loadMessages(locale: Locale, namespaces: readonly Namespace[]): Promise<Messages> {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      const own = await localSource.load(locale, namespace);

      if (locale === DEFAULT_LOCALE) return [namespace, own] as const;

      return [namespace, deepMerge(await localSource.load(DEFAULT_LOCALE, namespace), own)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function trimWhatsNew(messages: Messages): Messages {
  const whatsNew = messages.whatsNew;

  if (!isPlainObject(whatsNew)) return messages;

  const shown = new Set(WHATS_NEW_SHOWN.map((entry) => entry.id));

  return { ...messages, whatsNew: Object.fromEntries(Object.entries(whatsNew).filter(([key]) => key === "ui" || shown.has(key))) };
}

export async function loadStaticMessages(namespaces: readonly Namespace[]): Promise<Record<Locale, Messages>> {
  const entries = await Promise.all(LOCALES.map(async (locale) => [locale, trimWhatsNew(await loadMessages(locale, namespaces))] as const));

  return Object.fromEntries(entries) as Record<Locale, Messages>;
}
