export { CareerStateSchema, CharacteristicsSchema, UnitCharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";
export { parseProfile, SpeciesProfileSchema } from "@/systems/wfrp/rules/creation/schema";
import type { ZodType } from "zod";

import type { RuleSystemKey } from "@/lib/utils/rules/systems/types";
import { AilmentInputSchema, EndeavourSchema } from "@/systems/wfrp/rules/downtime/schema";
import { WfrpItemStatsSchema } from "@/systems/wfrp/rules/equipment/stats";

export { AilmentInputSchema, EndeavourSchema };
export { WfrpItemStatsSchema as WfrpArtifactStatsSchema };

/** Write-path schema of `artifacts.systemStats`; the registry hook stays Zod-free (client graph), so the schema lives here */
export const SYSTEM_STATS_SCHEMAS: Partial<Record<RuleSystemKey, ZodType<unknown>>> = { wfrp: WfrpItemStatsSchema };
