import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { corruptionUndoSchema } from "@/lib/schemas/corruption";
import { undoCorruption } from "@/lib/server/characters/core/corruption-handler";

export const corruptionUndoOperation = defineCharacterOperation({
  name: "corruption.undo",
  action: "undo corruption",
  schema: corruptionUndoSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: undoCorruption,
});

export const POST = characterRoute(corruptionUndoOperation);
