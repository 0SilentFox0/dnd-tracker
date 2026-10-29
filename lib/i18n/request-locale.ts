import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, type Locale, LOCALE_COOKIE } from "./config";
import { negotiateLocale } from "./resolve-locale";

import "server-only";
import { bearerToken } from "@/lib/utils/api/bearer";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const negotiated = negotiateLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return negotiated ?? (bearerToken({ headers: headerStore }) ? "en" : DEFAULT_LOCALE);
}
