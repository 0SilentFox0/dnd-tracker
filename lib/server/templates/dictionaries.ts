import "server-only";
import { DICTIONARY_LOADERS } from "@/data/templates/dictionaries.server";
import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";
import type { TemplateContentLocale } from "@/lib/utils/templates/manifest";

export async function templateTranslationsFor(templateKey: string, locale: TemplateContentLocale): Promise<TranslationsV2> {
  const loaders = Object.hasOwn(DICTIONARY_LOADERS, templateKey) ? DICTIONARY_LOADERS[templateKey] : undefined;

  const load = loaders && Object.hasOwn(loaders, locale) ? loaders[locale] : undefined;

  return load ? ((await load()).default as TranslationsV2) : {};
}
