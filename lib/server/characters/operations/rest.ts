import { campaignGate, characterRoute, defineCharacterOperation } from "../operation-runner";

import { restSchema } from "@/lib/schemas/out-of-combat";
import { restParty } from "@/lib/server/characters/core/rest-handler";

export const restOperation = defineCharacterOperation({
  name: "rest",
  action: "rest party",
  schema: restSchema,
  gate: campaignGate,
  run: restParty,
});

export const POST = characterRoute(restOperation);
