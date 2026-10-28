import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

interface ResolveInput {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");

      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));

      const q = qParam ? Number(qParam.slice(2)) : 1;

      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag.split("-")[0]);
}

export function resolveLocale({ cookie, acceptLanguage }: ResolveInput): Locale {
  if (isLocale(cookie)) return cookie;

  if (acceptLanguage) {
    const match = parseAcceptLanguage(acceptLanguage).find(isLocale);

    if (match) return match;
  }

  return DEFAULT_LOCALE;
}
