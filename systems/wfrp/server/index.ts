import type { SystemServer } from "@/lib/server/systems/types";
import { CharacteristicsSchema, UnitCharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";
import { WfrpItemStatsSchema } from "@/systems/wfrp/rules/equipment/stats";

export const WFRP_SERVER: SystemServer = {
  schemas: { characteristics: CharacteristicsSchema, unitCharacteristics: UnitCharacteristicsSchema, systemStats: WfrpItemStatsSchema },
};
