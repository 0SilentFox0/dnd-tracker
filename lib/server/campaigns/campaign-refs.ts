import type { NextResponse } from "next/server";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/utils/api/api-response";

type RefId = string | null | undefined;

export type CampaignRefKind = "spell" | "spellGroup" | "mainSkill" | "artifactSet";

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
  artifactSet: {
    count: (campaignId, ids) => prisma.artifactSet.count({ where: { campaignId, id: { in: ids } } }),
    message: API_ERRORS.FOREIGN_ARTIFACT_SET,
  },
};

/** FK guarantees a referenced row exists, not that it belongs to this campaign → 400 for the first foreign ref. */
export async function invalidCampaignRefs(campaignId: string, refs: CampaignRefs): Promise<NextResponse | null> {
  const checks = (Object.entries(refs) as Array<[CampaignRefKind, RefId | RefId[]]>)
    .map(([kind, value]) => ({ kind, ids: [...new Set([value].flat().filter((id): id is string => !!id))] }))
    .filter(({ ids }) => ids.length > 0);

  const counts = await Promise.all(checks.map(({ kind, ids }) => REF_KINDS[kind].count(campaignId, ids)));

  const failed = checks.find(({ ids }, i) => counts[i] < ids.length);

  return failed ? errorResponse(REF_KINDS[failed.kind].message, 400) : null;
}
