import { CampaignKind, CampaignVisibility, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";

export const SRD_CONTENT_LOCALES = ["en", "uk"] as const;
export type SrdContentLocale = (typeof SRD_CONTENT_LOCALES)[number];
export type TemplateIdentity = { kind?: string; visibility?: string; templateKey?: string | null; locale?: string | null };

export const isOfficialSrdTemplate = (source: TemplateIdentity): boolean => source.kind === CampaignKind.TEMPLATE && source.visibility === CampaignVisibility.OFFICIAL && source.templateKey === SRD_TEMPLATE_NAME;
export const isCanonicalSrdTemplate = (source: TemplateIdentity): boolean => isOfficialSrdTemplate(source) && (source.locale == null || source.locale === "en");
export const isLegacySrdTemplate = (source: TemplateIdentity): boolean => isOfficialSrdTemplate(source) && source.locale === "uk";
