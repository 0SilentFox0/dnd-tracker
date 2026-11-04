import { layeredModels } from "@/lib/db/layer/config";
import { BUNDLE_TABLES, type TemplateDb } from "@/lib/server/templates/bundle";
import { cachedExport } from "@/lib/server/templates/bundle-cache";
import { latestPublishedVersion } from "@/lib/server/templates/publish";
import { translationsFor } from "@/lib/server/templates/srd-translations";
import { rowHash } from "@/lib/server/templates/sync/hash";
import { isCanonicalSrdTemplate, type SrdContentLocale } from "@/lib/utils/campaigns/template-locales";

export const PROTECTED_CAMPAIGN_IDS: ReadonlySet<string> = new Set(["cmuylhk0c0001ia06lg5eommv"]);

export type IneligibleReason =
  | "ALREADY_LAYERED"
  | "PROTECTED"
  | "IS_TEMPLATE"
  | "NO_SOURCE"
  | "SOURCE_MISSING"
  | "SOURCE_NOT_TEMPLATE"
  | "SOURCE_LAYERED"
  | "SOURCE_NOT_PUBLISHED"
  | "SOURCE_UNPUBLISHED_CHANGES"
  | "LOCALIZED_CONTENT"
  | "HAS_DERIVED_CAMPAIGNS"
  | "ACTIVE_BATTLE";

export type Eligibility = { ok: true; sourceId: string; version: number } | { ok: false; reason: IneligibleReason; detail?: string };

interface CountDelegate { count(args: unknown): Promise<number> }

interface BaseOpenDelegate { findMany(args: unknown): Promise<Array<Record<string, unknown> & { id: string }>> }

type Row = Record<string, unknown> & { id: string };

const no = (reason: IneligibleReason, detail?: string): Eligibility => ({ ok: false, reason, detail });

async function unpublishedChange(db: object, source: { id: string; contentVersion: number }): Promise<string | null> {
  const bundle = await cachedExport(db as TemplateDb, source.id, source.contentVersion);

  for (const t of BUNDLE_TABLES) {
    const open = await (db as Record<string, BaseOpenDelegate>)[layeredModels()[t.model].base].findMany({ where: { sourceCampaignId: source.id, validTo: null } });

    const openHashes = new Map(open.map((r) => [r.id, rowHash(r, t)]));

    const rows = bundle[t.key] as Row[];

    const current = new Set(rows.map((r) => r.id));

    const stale = rows.find((r) => openHashes.get(r.id) !== rowHash(r, t)) ?? open.find((r) => !current.has(r.id));

    if (stale) return `${t.key}:${stale.id}`;
  }

  return null;
}

export async function checkEligibility(db: object, campaignId: string): Promise<Eligibility> {
  const d = db as {
    campaign: { findUnique(args: unknown): Promise<Record<string, unknown> | null> } & CountDelegate;
    battleScene: CountDelegate;
  };

  const campaign = await d.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, kind: true, baseSourceId: true, createdFromId: true, locale: true },
  });

  if (campaign?.baseSourceId) return no("ALREADY_LAYERED");

  if (PROTECTED_CAMPAIGN_IDS.has(campaignId)) return no("PROTECTED");

  if (!campaign) return no("SOURCE_MISSING", "campaign not found");

  if (campaign.kind === "template") return no("IS_TEMPLATE");

  const sourceId = campaign.createdFromId as string | null;

  if (!sourceId) return no("NO_SOURCE");

  const source = await d.campaign.findUnique({
    where: { id: sourceId },
    select: { id: true, kind: true, baseSourceId: true, contentVersion: true, visibility: true, templateKey: true, locale: true },
  });

  if (!source) return no("SOURCE_MISSING");

  if (source.kind !== "template") return no("SOURCE_NOT_TEMPLATE");

  if (source.baseSourceId) return no("SOURCE_LAYERED");

  const version = await latestPublishedVersion(db, sourceId);

  if (version === null) return no("SOURCE_NOT_PUBLISHED");

  const contentVersion = source.contentVersion as number;

  const stale = contentVersion !== version ? `contentVersion ${contentVersion} != published ${version}` : await unpublishedChange(db, { id: sourceId, contentVersion });

  if (stale) return no("SOURCE_UNPUBLISHED_CHANGES", stale);

  const locale = ((campaign.locale as string | null) ?? "en") as SrdContentLocale;

  if (isCanonicalSrdTemplate(source) && Object.keys(translationsFor(locale)).length > 0) return no("LOCALIZED_CONTENT", locale);

  if ((await d.campaign.count({ where: { createdFromId: campaignId } })) > 0) return no("HAS_DERIVED_CAMPAIGNS");

  if ((await d.battleScene.count({ where: { campaignId, status: "active" } })) > 0) return no("ACTIVE_BATTLE");

  return { ok: true, sourceId, version };
}
