import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { sheetRollSchema } from "@/lib/schemas/out-of-combat";
import { rollForSheet } from "@/lib/server/characters/core/roll-handler";

export const rollOperation = defineCharacterOperation({
  name: "roll",
  action: "roll from sheet",
  schema: sheetRollSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: rollForSheet,
});

export const POST = characterRoute(rollOperation);
