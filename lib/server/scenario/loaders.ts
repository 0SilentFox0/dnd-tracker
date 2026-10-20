import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { loadOwned } from "@/lib/utils/api/load-owned";

type OwnedRow<S extends Prisma.ScenarioPageSelect> = Prisma.ScenarioPageGetPayload<{ select: S }> & { campaignId: string };

export const loadOwnedPage = <S extends Prisma.ScenarioPageSelect & { campaignId: true }>(campaignId: string, pageId: string, select: S) =>
  loadOwned(prisma.scenarioPage.findUnique({ where: { id: pageId }, select }) as PromiseLike<OwnedRow<S> | null>, campaignId, API_ERRORS.SCENARIO_NOT_FOUND);

export async function characterInCampaign(campaignId: string, characterId: string | null | undefined): Promise<boolean> {
  if (!characterId) return true;

  return !!(await prisma.character.findFirst({ where: { id: characterId, campaignId }, select: { id: true } }));
}
