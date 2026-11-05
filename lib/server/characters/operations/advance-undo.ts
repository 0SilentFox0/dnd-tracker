import { z } from "zod";

import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { undoAdvance } from "@/lib/server/characters/core/advance-handler";

export const advanceUndoOperation = defineCharacterOperation({
  name: "advance-undo",
  action: "undo advance",
  schema: z.object({}),
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  query: () => ({}),
  run: (gate, _input) => undoAdvance(gate),
});

export const DELETE = characterRoute(advanceUndoOperation);
