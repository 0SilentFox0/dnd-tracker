import { type Locale, LOCALE_COOKIE } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readLocaleCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
}

export function writeLocaleCookie(locale: Locale): void {
  const secure = location.protocol === "https:" ? "; secure" : "";

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`;
}
