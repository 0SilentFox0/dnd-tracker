import { campaignGate, characterRoute, defineCharacterOperation } from "../operation-runner";

import { passPeriod } from "@/systems/wfrp/server/downtime-handler";
import { downtimePeriodSchema } from "@/systems/wfrp/server/downtime-schemas";

export const downtimePeriodOperation = defineCharacterOperation({
  name: "downtime.period",
  action: "pass downtime period",
  schema: downtimePeriodSchema,
  gate: campaignGate,
  run: passPeriod,
});

export const POST = characterRoute(downtimePeriodOperation);
