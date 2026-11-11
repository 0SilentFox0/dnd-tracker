import type { SystemServer } from "@/lib/server/systems/types";
import { CharacteristicsSchema, UnitCharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";
import { WfrpItemStatsSchema } from "@/systems/wfrp/rules/equipment/stats";
import { WFRP_OPERATIONS } from "@/systems/wfrp/server/operations";

export const WFRP_SERVER: SystemServer = {
  schemas: { characteristics: CharacteristicsSchema, unitCharacteristics: UnitCharacteristicsSchema, systemStats: WfrpItemStatsSchema },
  operations: WFRP_OPERATIONS,
};
