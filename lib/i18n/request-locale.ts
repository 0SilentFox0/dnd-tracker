import { cookies, headers } from "next/headers";

import { type Locale,LOCALE_COOKIE } from "./config";
import { resolveLocale } from "./resolve-locale";

import "server-only";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
