export const LOCALES = ["uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_CHANGE_EVENT = "locale-change";

export const APP_TIME_ZONE = "Europe/Kyiv";

export const NAMESPACES = ["common", "validation", "errors", "auth", "landing", "onboarding", "whatsNew", "help", "races", "skills", "classes", "feats", "backgrounds", "artifacts", "music", "choices", "campaigns", "dashboard", "characters", "characterProfile", "inventory", "rest", "spells", "spellEditor", "units", "abilities", "abilityRegistry", "rules", "skillTree", "scenario", "show", "acquaintances", "world", "ai", "compendium", "contentImport", "gameTerms", "assistant", "compendiumReport"] as const;

export const SERVER_NAMESPACES = ["errors", "assistant", "compendiumReport"] as const satisfies readonly (typeof NAMESPACES)[number][];

export type Namespace = (typeof NAMESPACES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
