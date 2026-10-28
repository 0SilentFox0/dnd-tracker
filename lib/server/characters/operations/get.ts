import { NextResponse } from "next/server";

import { guardedCharacterHandler } from "../operation-context";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { Actor } from "@/lib/utils/api/actor";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { isDmMember } from "@/lib/utils/api/is-dm";

async function readCharacterImpl(campaignId: string, characterId: string, actor?: Actor): Promise<NextResponse> {
  const authResult = actor ? { userId: actor.userId } : await requireAuth();

  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      user: { select: PUBLIC_USER_SELECT },
      inventory: true,
      campaign: { omit: { aiInstructions: true }, include: { members: { where: { userId } } } },
    },
  });

  if (!character || character.campaignId !== campaignId) return errorResponse(API_ERRORS.NOT_FOUND, 404);

  if (!isDmMember(character.campaign.members) && character.controlledBy !== userId) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const { notes, ...rest } = character;

  const knownSpells = Array.isArray(rest.knownSpells) ? rest.knownSpells : [];

  // нотатки — особисті: майстер їх не бачить
  return NextResponse.json({ ...rest, ...(character.controlledBy === userId && { notes }), knownSpells });
}

export const readCharacter = guardedCharacterHandler(readCharacterImpl, "get");
