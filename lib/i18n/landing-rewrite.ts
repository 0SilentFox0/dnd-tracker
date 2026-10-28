import { resolveLocale } from "./resolve-locale";

export function landingRewriteTarget(input: { pathname: string; cookie?: string | null; acceptLanguage?: string | null }): "/en" | null {
  if (input.pathname !== "/") return null;

  return resolveLocale({ cookie: input.cookie, acceptLanguage: input.acceptLanguage }) === "en" ? "/en" : null;
}
