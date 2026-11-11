import { Prisma } from "@prisma/client";

import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import type { SyncDb } from "@/lib/server/templates/sync/context";
import { isRecord } from "@/lib/utils/common/is-record";
import { parseSpeciesProfile, profileRefIds } from "@/systems/wfrp/server/profile-refs";

export type RefScope = "feats" | "careers" | "artifacts";

export const isRefScope = (scope: string): scope is RefScope => scope === "feats" || scope === "careers" || scope === "artifacts";

const speciesProfiles = async (db: SyncDb, campaignId: string) =>
  (await db.race.findMany({ where: { campaignId }, select: { profile: true } })).flatMap((r) => (r.profile == null ? [] : [r.profile]));

/** Profiles and tiers reference rows by id inside JSON, so no FK stops a sync delete. */
async function featRefs(db: SyncDb, campaignId: string): Promise<Set<string>> {
  const [profiles, careers] = await Promise.all([speciesProfiles(db, campaignId), db.career.findMany({ where: { campaignId }, select: { tiers: true } })]);

  return collectKeysAndStrings([profiles, careers.flatMap((c) => (Array.isArray(c.tiers) ? c.tiers : []).map((t) => (isRecord(t) ? t.talents : null)))]);
}

async function careerRefs(db: SyncDb, campaignId: string): Promise<Set<string>> {
  const [profiles, characters] = await Promise.all([speciesProfiles(db, campaignId), db.character.findMany({ where: { campaignId }, select: { characteristics: true } })]);

  const used = new Set<string>();

  for (const p of profiles) for (const id of profileRefIds(parseSpeciesProfile(p) ?? { careerTable: [], talents: [], randomTalents: [] }).careers) used.add(id);

  for (const { characteristics } of characters) {
    const career = isRecord(characteristics) ? characteristics.career : null;

    if (isRecord(career) && typeof career.careerId === "string") used.add(career.careerId);
  }

  return used;
}

/** Inventories hold artifact ids in JSON (equipped, backpack, stash), so no FK stops a sync delete. */
async function artifactRefs(db: SyncDb, campaignId: string): Promise<Set<string>> {
  const inventories = await db.characterInventory.findMany({ where: { character: { campaignId } }, select: { equipped: true, backpack: true, stash: true } });

  return collectKeysAndStrings(inventories.flatMap((i) => [i.equipped, i.backpack, i.stash]));
}

const REFS = { feats: featRefs, careers: careerRefs, artifacts: artifactRefs } as const;

const BLOCKED_TEXT: Record<RefScope, string> = {
  feats: "used by a species profile or career",
  careers: "used by a species profile or character",
  artifacts: "in a character inventory",
};

const blockedText = (scope: RefScope, name: string) => `${scope} ${name}: not deleted, ${BLOCKED_TEXT[scope]}`;

/** Lazy per-sync memo of reference sets, so N deleted rows cost one read per scope. */
export function createRefChecker(db: SyncDb, campaignId: string) {
  const memo = new Map<RefScope, Promise<Set<string>>>();

  const refs = (scope: RefScope) => {
    if (!memo.has(scope)) memo.set(scope, REFS[scope](db, campaignId));

    return memo.get(scope)!;
  };

  return {
    /** Warning when the row is still referenced (caller skips the delete), otherwise null. */
    async blockedBy(scope: string, ids: string[], name: string): Promise<string | null> {
      if (!isRefScope(scope)) return null;

      const used = await refs(scope);

      return ids.some((id) => used.has(id)) ? blockedText(scope, name) : null;
    },
    /** A deleted career stops referencing its tier talents. */
    deleted(scope: string) {
      if (scope === "careers") memo.delete("feats");
    },
  };
}

export type RefChecker = ReturnType<typeof createRefChecker>;

export async function danglingProfileWarnings(db: SyncDb, campaignId: string): Promise<string[]> {
  const races = await db.race.findMany({ where: { campaignId, profile: { not: Prisma.DbNull } }, select: { name: true, profile: true } });

  if (!races.length) return [];

  const [careers, feats] = await Promise.all([db.career.findMany({ where: { campaignId }, select: { id: true } }), db.feat.findMany({ where: { campaignId }, select: { id: true } })]);

  const careerIds = new Set(careers.map((c) => c.id));

  const featIds = new Set(feats.map((f) => f.id));

  return races.flatMap(({ name, profile }) => {
    const p = parseSpeciesProfile(profile);

    if (!p) return [];

    const refs = profileRefIds(p);

    const missing = [...refs.careers.filter((id) => !careerIds.has(id)), ...refs.feats.filter((id) => !featIds.has(id))];

    return missing.length ? [`races ${name}: dangling profile refs ${[...new Set(missing)].join(", ")}`] : [];
  });
}
