import { z } from "zod";

import { characterRoute, defineCharacterOperation, tokenScope } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";

const tokenDeleteSchema = z.object({ characterId: z.string(), tokenId: z.string() });

export const tokensDeleteOperation = defineCharacterOperation({
  name: "tokens-delete",
  action: "delete character token",
  schema: tokenDeleteSchema,
  gate: tokenScope,
  query: ({ params }) => ({ characterId: params.characterId, tokenId: params.tokenId }),
  run: async ({ campaignId }, { characterId, tokenId }) => {
    const token = await prisma.characterToken.findUnique({ where: { id: tokenId }, select: { characterId: true, character: { select: { campaignId: true } } } });

    if (!token || token.characterId !== characterId || token.character.campaignId !== campaignId) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    await prisma.characterToken.delete({ where: { id: tokenId } });

    return { ok: true };
  },
});

export const DELETE = characterRoute(tokensDeleteOperation);
