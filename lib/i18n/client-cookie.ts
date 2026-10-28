import { type Locale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";

export function readLocaleCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
}

export function writeLocaleCookie(locale: Locale): void {
  const secure = location.protocol === "https:" ? "; secure" : "";

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}
