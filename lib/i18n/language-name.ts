import type { Locale } from "./config";

const NAMES: Record<Locale, "Ukrainian" | "English"> = { uk: "Ukrainian", en: "English" };

export function languageName(locale: Locale): "Ukrainian" | "English" {
  return NAMES[locale];
}
