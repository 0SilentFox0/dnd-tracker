import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";

type RefId = string | null | undefined;

export type CampaignRefKind = "spell" | "spellGroup" | "mainSkill" | "skill" | "artifactSet" | "race";

export type CampaignRefs = Partial<Record<CampaignRefKind, RefId | RefId[]>>;

type Counter = (campaignId: string, ids: string[]) => Promise<number>;

const REF_KINDS: Record<CampaignRefKind, { count: Counter; message: string }> = {
  spell: {
    count: (campaignId, ids) => prisma.spell.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_SPELL,
  },
  spellGroup: {
    count: (campaignId, ids) => prisma.spellGroup.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_SPELL_GROUP,
  },
  mainSkill: {
    count: (campaignId, ids) => prisma.mainSkill.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_MAIN_SKILL,
  },
  skill: {
    count: (campaignId, ids) => prisma.skill.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_SKILL,
  },
  artifactSet: {
    count: (campaignId, ids) => prisma.artifactSet.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_ARTIFACT_SET,
  },
  race: {
    count: (campaignId, ids) => prisma.race.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_RACE,
  },
};

/** Ids of `next` not yet stored in `prev` (a JSON column value), so stale stored ids never block a save. */
export function addedIds(next: string[] | undefined, prev: unknown): string[] | undefined {
  if (next === undefined) return undefined;

  const known = new Set(Array.isArray(prev) ? prev : []);

  return next.filter((id) => !known.has(id));
}

/** First foreign ref's message, or null. FK guarantees a referenced row exists, not that it belongs to this campaign. */
export async function foreignCampaignRef(campaignId: string, refs: CampaignRefs): Promise<string | null> {
  const checks = (Object.entries(refs) as Array<[CampaignRefKind, RefId | RefId[]]>)
    .map(([kind, value]) => ({ kind, ids: [...new Set([value].flat().filter((id): id is string => !!id))] }))
    .filter(({ ids }) => ids.length > 0);

  const counts = await Promise.all(checks.map(({ kind, ids }) => REF_KINDS[kind].count(campaignId, ids)));

  const failed = checks.find(({ ids }, i) => counts[i] < ids.length);

  return failed ? REF_KINDS[failed.kind].message : null;
}

export async function assertCampaignRefs(campaignId: string, refs: CampaignRefs): Promise<void> {
  const message = await foreignCampaignRef(campaignId, refs);

  if (message) throw new ContentError(message, 400);
}
