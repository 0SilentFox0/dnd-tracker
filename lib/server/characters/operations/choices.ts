import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { saveCharacterChoices } from "@/lib/server/characters/core/choices-handler";

export const choicesOperation = defineCharacterOperation({
  name: "choices",
  action: "save character choices",
  schema: ChoicesBodySchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: saveCharacterChoices,
});

export const PUT = characterRoute(choicesOperation);
