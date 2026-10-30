import { request } from "./client";

import type { Locale } from "@/lib/i18n/config";

export interface LocaleSettings {
  locale: Locale | null;
  timeZone: string | null;
}

export const localeApi = {
  get: () => request<LocaleSettings>("/api/locale", { cache: "no-store" }),
  set: (patch: { locale?: Locale; timeZone?: string | null }) =>
    request<Partial<LocaleSettings>>("/api/locale", { method: "PUT", body: JSON.stringify(patch) }),
};
