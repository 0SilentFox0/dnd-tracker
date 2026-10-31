import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind, CampaignVisibility, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { ContentError } from "@/lib/server/content/errors";
import type { Bundle, TemplateDb } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { localizeSrdBundle } from "@/lib/server/templates/localize-srd-bundle";
import { translationsFor } from "@/lib/server/templates/srd-translations";
import { canReadSource } from "@/lib/utils/api/is-dm";
import { isCanonicalSrdTemplate, isLegacySrdTemplate, SRD_CONTENT_LOCALES, type SrdContentLocale, type TemplateIdentity } from "@/lib/utils/campaigns/template-locales";

export type PreparedCampaignSource = { id: string; bundle: Bundle; contentLocale: string | null; source: TemplateIdentity };

type Options = {
  userId: string;
  contentLocale?: SrdContentLocale;
  mode: "create" | "clone" | "save";
  /** Runs after resolution/authorization, before the sole export. Action callers lock this ID in their transaction. */
  beforeExport?: (resolvedSourceId: string) => Promise<void>;
};

export async function prepareCampaignSource(db: TemplateDb, sourceId: string, options: Options): Promise<PreparedCampaignSource> {
  const read = (id: string) => db.campaign.findUnique({ where: { id }, include: { members: { where: { userId: options.userId } } } });

  const requested = await read(sourceId);

  if (!requested || (options.mode === "create" && requested.kind !== CampaignKind.TEMPLATE)) throw new ContentError(API_ERRORS.TEMPLATE_NOT_FOUND, 404);

  if (!canReadSource(requested.visibility, requested.members)) throw new ContentError(API_ERRORS.TEMPLATE_FORBIDDEN, 403);

  const overlay = options.mode !== "save" && (isCanonicalSrdTemplate(requested) || isLegacySrdTemplate(requested));

  if (options.contentLocale !== undefined && (!SRD_CONTENT_LOCALES.includes(options.contentLocale) || !overlay)) throw new ContentError(API_ERRORS.TEMPLATE_CONTENT_LOCALE, 400);

  let source = requested;

  if (overlay) {
    const candidates = await db.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL, templateKey: SRD_TEMPLATE_NAME, OR: [{ locale: "en" }, { locale: null }] }, select: { id: true } });

    if (candidates.length !== 1) throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

    const canonical = await read(candidates[0].id);

    if (!canonical || !isCanonicalSrdTemplate(canonical)) throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

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

  const contentLocale = overlay ? options.contentLocale ?? (isLegacySrdTemplate(requested) ? "uk" : "en") : source.locale ?? null;

  const bundle = await exportCampaign(db, source.id);

  return { id: source.id, source: { kind: source.kind, visibility: source.visibility, templateKey: source.templateKey, locale: source.locale }, contentLocale, bundle: overlay ? localizeSrdBundle(bundle, translationsFor(contentLocale as SrdContentLocale)) : bundle };
}
