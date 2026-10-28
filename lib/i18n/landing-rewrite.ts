import { negotiateLocale } from "./resolve-locale";

import { LANDING_PATH } from "@/lib/constants/site";

// only an explicit preference moves `/` off English: crawlers without Accept-Language keep the x-default page
export function landingRewriteTarget(input: { pathname: string; cookie?: string | null; acceptLanguage?: string | null }): string | null {
  if (input.pathname !== LANDING_PATH.en) return null;

  const locale = negotiateLocale({ cookie: input.cookie, acceptLanguage: input.acceptLanguage });

  return locale && locale !== "en" ? LANDING_PATH[locale] : null;
}
