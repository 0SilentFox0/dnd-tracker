import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { careerAdvanceSchema, careerSetSchema } from "@/lib/schemas/out-of-combat";
import { advanceCareer, setCareer } from "@/lib/server/characters/core/career-handler";

export const careerSetOperation = defineCharacterOperation({
  name: "career-set",
  action: "set character career",
  schema: careerSetSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: setCareer,
});

export const careerAdvanceOperation = defineCharacterOperation({
  name: "career-advance",
  action: "advance character career",
  schema: careerAdvanceSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: advanceCareer,
});

export const POST = characterRoute(careerSetOperation);
