import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import type { SyncDb } from "@/lib/server/templates/sync/context";

/** Race profiles reference feats by id inside JSON, so no FK stops a sync delete. */
export async function isFeatUsedByRaceProfile(db: Pick<SyncDb, "raceProfile">, campaignId: string, featIds: string[]): Promise<boolean> {
  const profiles = await db.raceProfile.findMany({ where: { campaignId }, select: { profile: true } });

  const used = collectKeysAndStrings(profiles.map((p) => p.profile));

  return featIds.some((id) => used.has(id));
}

export const blockedByProfileWarning = (name: string) => `feats ${name}: not deleted, used by a species profile`;
