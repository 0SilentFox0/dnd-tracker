import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { isDmMember } from "@/lib/utils/api/is-dm";

export async function readCharacter(campaignId: string, characterId: string): Promise<NextResponse> {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      user: true,
      inventory: true,
      campaign: { include: { members: { where: { userId } } } },
    },
  });

  if (!character || character.campaignId !== campaignId) return errorResponse(API_ERRORS.NOT_FOUND, 404);

  if (!isDmMember(character.campaign.members) && character.controlledBy !== userId) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const knownSpells = Array.isArray(character.knownSpells) ? character.knownSpells : [];

  return NextResponse.json({ ...character, knownSpells });
}
