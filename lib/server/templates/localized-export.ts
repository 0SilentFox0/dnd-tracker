import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { Bundle, TemplateDb } from "@/lib/server/templates/bundle";
import { cachedExport, clearBundleCache } from "@/lib/server/templates/bundle-cache";
import { hasUnsluggedRows, localizeTemplateBundle } from "@/lib/server/templates/localize-template-bundle";
import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";

/** Fail-closed: with a non-empty dictionary, rows without slugs (prod between deploy and backfill) would silently stay English, so re-export once and then refuse. */
export async function localizedExport(db: TemplateDb, sourceId: string, contentVersion: number, translations: TranslationsV2): Promise<Bundle> {
  let bundle = await cachedExport(db, sourceId, contentVersion);

  if (!Object.keys(translations).length) return bundle;

  if (hasUnsluggedRows(bundle)) {
    clearBundleCache();
    bundle = await cachedExport(db, sourceId, contentVersion);

    if (hasUnsluggedRows(bundle)) throw new ContentError(API_ERRORS.TEMPLATE_NOT_READY, 409);
  }

  return localizeTemplateBundle(bundle, translations);
}
