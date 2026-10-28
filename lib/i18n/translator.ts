import { createTranslator } from "use-intl/core";

import { type Locale, type Namespace,NAMESPACES } from "./config";
import { loadMessages } from "./messages";

export interface Translator {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
  raw(key: string): unknown;
}

export async function getTranslator(locale: Locale, namespace?: Namespace): Promise<Translator> {
  const messages = await loadMessages(locale, namespace ? [namespace] : NAMESPACES);

  const translator = createTranslator({
    locale,
    messages,
    namespace,
    getMessageFallback: ({ namespace: ns, key }) => (ns ? `${ns}.${key}` : key),
    onError: () => {},
  } as Parameters<typeof createTranslator>[0]) as unknown as (key: string, values?: Record<string, string | number>) => string;

  return translator as Translator;
}
