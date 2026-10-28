import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { hitDieSchema } from "@/lib/schemas/out-of-combat";
import { spendHitDieFor } from "@/lib/server/characters/core/hit-die-handler";

export const hitDiceOperation = defineCharacterOperation({
  name: "hit-dice",
  action: "spend hit die",
  schema: hitDieSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: spendHitDieFor,
});

export const POST = characterRoute(hitDiceOperation);
