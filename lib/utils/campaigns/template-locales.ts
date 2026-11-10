import { CampaignKind, CampaignVisibility, GRIM_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";

export const TEMPLATE_CONTENT_LOCALES = ["en", "uk"] as const;
export type TemplateContentLocale = (typeof TEMPLATE_CONTENT_LOCALES)[number];
export const SRD_CONTENT_LOCALES = TEMPLATE_CONTENT_LOCALES;
export type SrdContentLocale = TemplateContentLocale;
export type TemplateIdentity = { kind?: string; visibility?: string; templateKey?: string | null; locale?: string | null };
export type TemplateLocalization = { templateKey: string; locales: readonly TemplateContentLocale[] };

export const TEMPLATE_LOCALIZATIONS: Readonly<Record<string, { locales: readonly TemplateContentLocale[] }>> = {
  [SRD_TEMPLATE_NAME]: { locales: TEMPLATE_CONTENT_LOCALES },
  [GRIM_TEMPLATE_NAME]: { locales: TEMPLATE_CONTENT_LOCALES },
};

export function localizationOf(source: TemplateIdentity): TemplateLocalization | null {
  if (source.kind !== CampaignKind.TEMPLATE || source.visibility !== CampaignVisibility.OFFICIAL || !source.templateKey) return null;

  const entry = Object.hasOwn(TEMPLATE_LOCALIZATIONS, source.templateKey) ? TEMPLATE_LOCALIZATIONS[source.templateKey] : undefined;

  return entry ? { templateKey: source.templateKey, locales: entry.locales } : null;
}

export const isLocalizableTemplate = (source: TemplateIdentity): boolean => localizationOf(source) !== null;
export const isCanonicalTemplate = (source: TemplateIdentity): boolean => isLocalizableTemplate(source) && (source.locale == null || source.locale === "en");
export const isLegacyLocalizedTemplate = (source: TemplateIdentity): boolean => isLocalizableTemplate(source) && source.locale === "uk";

export const isOfficialSrdTemplate = (source: TemplateIdentity): boolean => isLocalizableTemplate(source) && source.templateKey === SRD_TEMPLATE_NAME;
export const isCanonicalSrdTemplate = (source: TemplateIdentity): boolean => isOfficialSrdTemplate(source) && (source.locale == null || source.locale === "en");
export const isLegacySrdTemplate = (source: TemplateIdentity): boolean => isOfficialSrdTemplate(source) && source.locale === "uk";
