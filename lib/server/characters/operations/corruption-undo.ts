import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { undoCorruption } from "@/systems/wfrp/server/corruption-handler";
import { corruptionUndoSchema } from "@/systems/wfrp/server/corruption-schemas";

export const corruptionUndoOperation = defineCharacterOperation({
  name: "corruption.undo",
  action: "undo corruption",
  schema: corruptionUndoSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: undoCorruption,
});

export const POST = characterRoute(corruptionUndoOperation);
