import "server-only";
import grimUk from "@/data/templates/grim-d100/i18n/uk.json";
import srdUk from "@/data/templates/srd-5.2/i18n/uk.json";
import { GRIM_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import type { Translations } from "@/lib/srd/i18n/catalog";
import type { TemplateContentLocale } from "@/lib/utils/campaigns/template-locales";

const DICTIONARIES: Record<string, Partial<Record<TemplateContentLocale, Translations>>> = {
  [SRD_TEMPLATE_NAME]: { uk: srdUk },
  [GRIM_TEMPLATE_NAME]: { uk: grimUk },
};

export const templateTranslationsFor = (templateKey: string, locale: TemplateContentLocale): Translations => (Object.hasOwn(DICTIONARIES, templateKey) ? DICTIONARIES[templateKey][locale] : undefined) ?? {};
