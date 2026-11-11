import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import { ContentError } from "@/lib/server/content/errors";
import type { Bundle, TemplateDb } from "@/lib/server/templates/bundle";
import { cachedExport } from "@/lib/server/templates/bundle-cache";
import { templateTranslationsFor } from "@/lib/server/templates/dictionaries";
import { exportLocalLayer, exportSkeleton, type LocalLayer } from "@/lib/server/templates/export-campaign";
import { localizedExport } from "@/lib/server/templates/localized-export";
import { latestPublishedVersion } from "@/lib/server/templates/publish";
import { canReadSource } from "@/lib/utils/api/is-dm";
import type { TemplateContentLocale } from "@/lib/utils/templates/manifest";
import { isCanonicalTemplate, isLegacyLocalizedTemplate, localizationOf, type TemplateIdentity, templateKeyOf, templateKeyWhere } from "@/lib/utils/templates/registry";

export type PreparedLayer = LocalLayer & { sourceId: string; baseVersion: number };

/** `layer` set: `bundle` holds only what the new campaign stores itself; the rest is read from the base template. */
export type PreparedCampaignSource = { id: string; bundle: Bundle; contentLocale: string | null; contentVersion: number; source: TemplateIdentity; layer?: PreparedLayer };

type Options = {
  userId: string;
  contentLocale?: TemplateContentLocale;
  mode: "create" | "clone" | "save";
  /** Runs after resolution/authorization, before the sole export. Action callers lock this ID in their transaction. */
  beforeExport?: (resolvedSourceId: string) => Promise<void>;
};

async function layeredSource(db: TemplateDb, source: { id: string; baseSourceId: string | null; baseVersion: number | null }, mode: Options["mode"], localized: boolean): Promise<{ bundle: Bundle; layer: PreparedLayer } | null> {
  if (mode === "create") {
    const baseVersion = localized ? null : await latestPublishedVersion(db, source.id);

    return baseVersion == null ? null : { bundle: await exportSkeleton(db, source.id), layer: { sourceId: source.id, baseVersion, overrides: {}, hides: [] } };
  }

  if (!source.baseSourceId || source.baseVersion == null) return null;

  const { bundle, layer } = await exportLocalLayer(db, source.id);

  return { bundle, layer: { ...layer, sourceId: source.baseSourceId, baseVersion: source.baseVersion } };
}

export async function prepareCampaignSource(db: TemplateDb, sourceId: string, options: Options): Promise<PreparedCampaignSource> {
  const read = (id: string) => db.campaign.findUnique({ where: { id }, include: { members: { where: { userId: options.userId } } } });

  const requested = await read(sourceId);

  if (!requested || (options.mode === "create" && requested.kind !== CampaignKind.TEMPLATE)) throw new ContentError(API_ERRORS.TEMPLATE_NOT_FOUND, 404);

  if (!canReadSource(requested.visibility, requested.members)) throw new ContentError(API_ERRORS.TEMPLATE_FORBIDDEN, 403);

  const localization = localizationOf(requested);

  const overlay = options.mode !== "save" && localization !== null;

  if (options.contentLocale !== undefined && (!overlay || !localization.locales.includes(options.contentLocale))) throw new ContentError(API_ERRORS.TEMPLATE_CONTENT_LOCALE, 400);

  let source = requested;

  if (overlay && localization) {
    const candidates = await db.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL, AND: [templateKeyWhere([localization.templateKey]), { OR: [{ locale: "en" }, { locale: null }] }] }, select: { id: true } });

    if (candidates.length !== 1) throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

    const canonical = await read(candidates[0].id);

    if (!canonical || !isCanonicalTemplate(canonical) || templateKeyOf(canonical) !== localization.templateKey) throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

    source = canonical;
  }

  if (!canReadSource(source.visibility, source.members)) throw new ContentError(API_ERRORS.TEMPLATE_FORBIDDEN, 403);

  if (options.beforeExport) {
    await options.beforeExport(source.id);

    const locked = await read(source.id);

    if (!locked || !canReadSource(locked.visibility, locked.members)) throw new ContentError(API_ERRORS.TEMPLATE_FORBIDDEN, 403);

    if ((["kind", "visibility", "templateKey", "locale"] as const).some((key) => locked[key] !== source[key])) throw new ContentError(API_ERRORS.SOURCE_CHANGED, 409);

    source = locked;
  }

  const contentLocale = overlay ? options.contentLocale ?? (isLegacyLocalizedTemplate(requested) ? "uk" : "en") : source.locale ?? null;

  const identity = { id: source.id, contentVersion: source.contentVersion, source: { kind: source.kind, visibility: source.visibility, templateKey: source.templateKey, name: source.name, locale: source.locale }, contentLocale };

  const translations = overlay && localization ? await templateTranslationsFor(localization.templateKey, contentLocale as TemplateContentLocale) : null;

  const layered = await layeredSource(db, source, options.mode, !!translations && Object.keys(translations).length > 0);

  if (layered) return { ...identity, ...layered };

  const bundle = translations ? await localizedExport(db, source.id, source.contentVersion, translations) : await cachedExport(db, source.id, source.contentVersion);

  return { ...identity, bundle };
}
