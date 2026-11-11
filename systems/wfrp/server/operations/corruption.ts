import { requireCharacterAccess } from "@/lib/server/characters/access";
import { characterRoute, defineCharacterOperation, gateOptions } from "@/lib/server/characters/operation-runner";
import { grantCorruption } from "@/systems/wfrp/server/corruption-handler";
import { corruptionGrantSchema } from "@/systems/wfrp/server/corruption-schemas";

export const corruptionGrantOperation = defineCharacterOperation({
  name: "corruption.grant",
  action: "grant corruption",
  schema: corruptionGrantSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: grantCorruption,
});

export const POST = characterRoute(corruptionGrantOperation);
