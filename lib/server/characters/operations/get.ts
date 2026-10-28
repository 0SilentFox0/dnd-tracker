import { NextResponse } from "next/server";
import { z } from "zod";

import { type CharacterOpCtx, defineCharacterOperation, executeCharacterRoute } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { Actor } from "@/lib/utils/api/actor";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { isDmMember } from "@/lib/utils/api/is-dm";

const userGate = async (ctx: CharacterOpCtx): Promise<{ userId: string; campaignId: string } | NextResponse> => {
  const auth = ctx.actor ? { userId: ctx.actor.userId } : await requireAuth();

  return auth instanceof NextResponse ? auth : { userId: auth.userId, campaignId: ctx.campaignId };
};

export const getOperation = defineCharacterOperation({
  name: "get",
  action: "fetch character",
  schema: z.object({ characterId: z.string() }),
  unlocked: true,
  gate: userGate,
  query: ({ params }) => ({ characterId: params.characterId }),
  run: async ({ userId, campaignId }, { characterId }) => {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        user: { select: PUBLIC_USER_SELECT },
        inventory: true,
        campaign: { omit: { aiInstructions: true }, include: { members: { where: { userId } } } },
      },
    });

    if (!character || character.campaignId !== campaignId) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    if (!isDmMember(character.campaign.members) && character.controlledBy !== userId) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    const { notes, ...rest } = character;

    const knownSpells = Array.isArray(rest.knownSpells) ? rest.knownSpells : [];

    // нотатки — особисті: майстер їх не бачить
    return { ...rest, ...(character.controlledBy === userId && { notes }), knownSpells };
  },
});

export const readCharacter = (campaignId: string, characterId: string, actor?: Actor) => executeCharacterRoute(getOperation, { campaignId, params: { characterId }, actor });
