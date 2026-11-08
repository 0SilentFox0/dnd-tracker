import { campaignGate, characterRoute, defineCharacterOperation } from "../operation-runner";

import { downtimePeriodSchema } from "@/lib/schemas/downtime";
import { passPeriod } from "@/lib/server/characters/core/downtime-handler";

export const downtimePeriodOperation = defineCharacterOperation({
  name: "downtime.period",
  action: "pass downtime period",
  schema: downtimePeriodSchema,
  gate: campaignGate,
  run: passPeriod,
});

export const POST = characterRoute(downtimePeriodOperation);
