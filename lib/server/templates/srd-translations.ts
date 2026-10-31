import "server-only";
import uk from "@/data/templates/srd-5.2/i18n/uk.json";
import type { Translations } from "@/lib/srd/i18n/catalog";
import type { SrdContentLocale } from "@/lib/utils/campaigns/template-locales";

export const translationsFor = (locale: SrdContentLocale): Translations => locale === "uk" ? uk : {};
