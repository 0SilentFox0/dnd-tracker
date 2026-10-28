import type { Metadata } from "next";

import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";

export async function authMetadata(titleKey: string): Promise<Metadata> {
  const locale = await getRequestLocale();

  const [t, common] = await Promise.all([getTranslator(locale, "auth"), getTranslator(locale, "common")]);

  return { title: `${t(titleKey)} — ${common("app.name")}` };
}
