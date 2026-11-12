import { spendHitDieFor } from "./handlers/hit-die-handler";

import { hitDieSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { defineCharacterOperation, gateOptions } from "@/lib/server/characters/operation-runner";

export const hitDiceOperation = defineCharacterOperation({
  name: "hit-dice",
  action: "spend hit die",
  schema: hitDieSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: spendHitDieFor,
});
