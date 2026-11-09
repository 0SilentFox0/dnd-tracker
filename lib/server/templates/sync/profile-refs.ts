import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import type { SyncDb } from "@/lib/server/templates/sync/context";
import { isRecord } from "@/lib/utils/common/is-record";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";

type RefScope = "feats" | "careers";

const speciesProfiles = async (db: SyncDb, campaignId: string) =>
  (await db.race.findMany({ where: { campaignId }, select: { profile: true } })).flatMap((r) => (r.profile == null ? [] : [r.profile]));

/** Profiles and tiers reference rows by id inside JSON, so no FK stops a sync delete. */
export async function isFeatReferenced(db: SyncDb, campaignId: string, featIds: string[]): Promise<boolean> {
  const [profiles, careers] = await Promise.all([speciesProfiles(db, campaignId), db.career.findMany({ where: { campaignId }, select: { tiers: true } })]);

  const used = collectKeysAndStrings([profiles, careers.flatMap((c) => (Array.isArray(c.tiers) ? c.tiers : []).map((t) => (isRecord(t) ? t.talents : null)))]);

  return featIds.some((id) => used.has(id));
}

export async function isCareerReferenced(db: SyncDb, campaignId: string, careerIds: string[]): Promise<boolean> {
  const [profiles, characters] = await Promise.all([speciesProfiles(db, campaignId), db.character.findMany({ where: { campaignId }, select: { characteristics: true } })]);

  const used = new Set<string>();

  for (const p of profiles) {
    const parsed = SpeciesProfileSchema.safeParse(p);

    if (parsed.success) for (const r of parsed.data.careerTable) used.add(r.careerId);
  }

  for (const { characteristics } of characters) {
    const career = isRecord(characteristics) ? characteristics.career : null;

    if (isRecord(career) && typeof career.careerId === "string") used.add(career.careerId);
  }

  return careerIds.some((id) => used.has(id));
}

export const isRowReferenced = (db: SyncDb, campaignId: string, scope: RefScope, ids: string[]) =>
  scope === "feats" ? isFeatReferenced(db, campaignId, ids) : isCareerReferenced(db, campaignId, ids);

export const blockedWarning = (scope: RefScope, name: string) =>
  scope === "feats" ? `feats ${name}: not deleted, used by a species profile or career` : `careers ${name}: not deleted, used by a species profile or character`;

export async function danglingProfileWarnings(db: SyncDb, campaignId: string): Promise<string[]> {
  const [races, careers, feats] = await Promise.all([
    db.race.findMany({ where: { campaignId }, select: { name: true, profile: true } }),
    db.career.findMany({ where: { campaignId }, select: { id: true } }),
    db.feat.findMany({ where: { campaignId }, select: { id: true } }),
  ]);

  const careerIds = new Set(careers.map((c) => c.id));

  const featIds = new Set(feats.map((f) => f.id));

  return races.flatMap(({ name, profile }) => {
    const parsed = SpeciesProfileSchema.safeParse(profile);

    if (!parsed.success) return [];

    const p = parsed.data;

    const missing = [
      ...p.careerTable.filter((r) => !careerIds.has(r.careerId)).map((r) => r.careerId),
      ...[...p.talents, ...p.randomTalents.map((r) => r.featId)].filter((id) => !featIds.has(id)),
    ];

    return missing.length ? [`races ${name}: dangling profile refs ${[...new Set(missing)].join(", ")}`] : [];
  });
}
