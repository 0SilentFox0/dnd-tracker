import { request } from "./client";

import type { Locale } from "@/lib/i18n/config";

export const localeApi = {
  get: () => request<{ locale: Locale | null }>("/api/locale", { cache: "no-store" }),
  set: (locale: Locale) => request<{ locale: Locale }>("/api/locale", { method: "PUT", body: JSON.stringify({ locale }) }),
};
