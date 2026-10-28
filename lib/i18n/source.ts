import type { Locale, Namespace } from "./config";

export interface MessageSource {
  load(locale: Locale, namespace: Namespace): Promise<Record<string, unknown>>;
}
