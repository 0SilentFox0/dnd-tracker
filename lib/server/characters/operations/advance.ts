import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { advanceSchema } from "@/lib/schemas/out-of-combat";
import { advanceCharacter } from "@/systems/wfrp/server/advance-handler";

export const advanceOperation = defineCharacterOperation({
  name: "advance",
  action: "advance character",
  schema: advanceSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: advanceCharacter,
});

export const POST = characterRoute(advanceOperation);
