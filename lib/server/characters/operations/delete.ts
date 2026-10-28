import { z } from "zod";

import { requireCharacterSelect } from "../access";
import { characterRoute, defineCharacterOperation, dmCharacterGate } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";

export const deleteOperation = defineCharacterOperation({
  name: "delete",
  action: "delete character",
  schema: z.object({ characterId: z.string() }),
  gate: dmCharacterGate((ctx, access) => requireCharacterSelect(ctx.campaignId, ctx.characterId, { campaignId: true }, { access, notFound: API_ERRORS.NOT_FOUND })),
  query: ({ params }) => ({ characterId: params.characterId }),
  run: async (_gate, { characterId }) => {
    await prisma.character.deleteMany({ where: { id: characterId } });

    return { success: true };
  },
});

export const DELETE = characterRoute(deleteOperation);
