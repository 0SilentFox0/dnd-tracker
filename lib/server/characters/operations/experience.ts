import { campaignGate, characterRoute, defineCharacterOperation } from "../operation-runner";

import { experienceSchema } from "@/lib/schemas/out-of-combat";
import { awardExperience } from "@/lib/server/characters/core/experience-handler";

export const experienceOperation = defineCharacterOperation({
  name: "experience",
  action: "award experience",
  schema: experienceSchema,
  gate: campaignGate,
  run: awardExperience,
});

export const POST = characterRoute(experienceOperation);
