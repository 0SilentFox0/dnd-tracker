import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { corruptionGrantSchema } from "@/lib/schemas/corruption";
import { grantCorruption } from "@/lib/server/characters/core/corruption-handler";

export const corruptionGrantOperation = defineCharacterOperation({
  name: "corruption.grant",
  action: "grant corruption",
  schema: corruptionGrantSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: grantCorruption,
});

export const POST = characterRoute(corruptionGrantOperation);
