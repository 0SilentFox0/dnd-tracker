import { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_DECKS_PER_CAMPAIGN } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import type { Slide } from "@/types/show";

/** Native HTTP and actor adapters share these writes and their CAS/limits. */
export async function createDeckRecord(campaignId: string, title: string) {
  return withCampaignContentWrite(campaignId, async () => {
  const existing = await prisma.slideDeck.aggregate({ where: { campaignId }, _count: true, _max: { sortOrder: true } });

  if (existing._count >= MAX_DECKS_PER_CAMPAIGN) throw new ContentError(API_ERRORS.DECK_LIMIT, 400);

  return prisma.slideDeck.create({ data: { campaignId, title, sortOrder: (existing._max.sortOrder ?? -1) + 1 } });

  });
}

export async function saveDeckRecord(campaignId: string, deckId: string, updatedAt: Date, title: string, slides: Slide[]) {
  return withCampaignContentWrite(campaignId, async () => {
  try {
    return await prisma.slideDeck.update({ where: { id: deckId, campaignId, updatedAt }, data: { title, slides: slides as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;

    throw error;
  }

  });
}

export async function bindDeckRecord(campaignId: string, deckId: string, _updatedAt: Date, scenarioPageId: string | null) {
  return withCampaignContentWrite(campaignId, async () => {
  if (scenarioPageId) {
    const page = await prisma.scenarioPage.findFirst({ where: { id: scenarioPageId, campaignId, kind: "scene" }, select: { id: true } });

    if (!page) throw new ContentError(API_ERRORS.DECK_SCENE_INVALID, 400);
  }

  const current = await prisma.slideDeck.findUnique({ where: { id: deckId }, select: { updatedAt: true } });

  if (!current) throw new ContentError(API_ERRORS.DECK_NOT_FOUND, 404);

  return prisma.slideDeck.update({ where: { id: deckId }, data: { scenarioPageId, updatedAt: current.updatedAt } });

  });
}

export const deleteDeckRecord = (campaignId: string, deckId: string) => withCampaignContentWrite(campaignId, () => prisma.slideDeck.delete({ where: { id: deckId } }));
