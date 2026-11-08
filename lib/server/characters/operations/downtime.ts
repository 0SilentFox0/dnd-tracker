import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { downtimeSetSchema } from "@/lib/schemas/downtime";
import { setDowntime } from "@/lib/server/characters/core/downtime-handler";

export const downtimeSetOperation = defineCharacterOperation({
  name: "downtime.set",
  action: "set downtime",
  schema: downtimeSetSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: setDowntime,
});

export const PUT = characterRoute(downtimeSetOperation);
