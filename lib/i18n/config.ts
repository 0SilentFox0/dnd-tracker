export const LOCALES = ["uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_CHANGE_EVENT = "locale-change";

export const NAMESPACES = ["common", "validation", "errors", "auth", "landing"] as const;

export type Namespace = (typeof NAMESPACES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
