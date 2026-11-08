import { campaignGate, characterRoute, defineCharacterOperation } from "../operation-runner";

import { downtimePeriodUndoSchema } from "@/lib/schemas/downtime";
import { undoPeriod } from "@/lib/server/characters/core/downtime-handler";

export const downtimePeriodUndoOperation = defineCharacterOperation({
  name: "downtime.period.undo",
  action: "undo downtime period",
  schema: downtimePeriodUndoSchema,
  gate: campaignGate,
  run: undoPeriod,
});

export const POST = characterRoute(downtimePeriodUndoOperation);
