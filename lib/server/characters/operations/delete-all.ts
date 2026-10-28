import { z } from "zod";

import { characterRoute, defineCharacterOperation, dmScope } from "../operation-runner";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";

export const deleteAllOperation = defineCharacterOperation({
  name: "delete-all",
  action: "delete all characters",
  schema: z.object({}),
  gate: dmScope,
  query: () => ({}),
  run: async ({ campaignId }) => {
    const result = await prisma.character.deleteMany({ where: { campaignId, type: CharacterType.PLAYER } });

    return { success: true, deleted: result.count };
  },
});

export const DELETE = characterRoute(deleteAllOperation);
