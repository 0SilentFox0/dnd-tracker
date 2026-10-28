import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { isDmMember } from "@/lib/utils/api/is-dm";

export async function readInventory(campaignId: string, characterId: string, actor?: Actor, readOnly = false): Promise<NextResponse> {
  const authResult = actor ? {userId:actor.userId} : await requireAuth();

  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { inventory: true, campaign: { omit: { aiInstructions: true }, include: { members: { where: { userId } } } } },
  });

  if (!character || character.campaignId !== campaignId) return errorResponse(API_ERRORS.NOT_FOUND, 404);

  if (!isDmMember(character.campaign.members) && character.controlledBy !== userId) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  if (character.inventory) return NextResponse.json(character.inventory);

  if (readOnly) return NextResponse.json({ characterId, gold: 0, silver: 0, copper: 0, equipped: {}, backpack: [], items: [], stash: [], attuned: [] });

  const created = await prisma.characterInventory.create({
    data: { characterId, gold: 0, silver: 0, copper: 0, equipped: {}, backpack: [], items: [] },
  });

  return NextResponse.json(created);
}
