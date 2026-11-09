export { CareerStateSchema, CharacteristicsSchema, UnitCharacteristicsSchema } from "./wfrp/characteristics/schema";
export { parseProfile, SpeciesProfileSchema } from "./wfrp/creation/schema";
import type { ZodType } from "zod";

import { AilmentInputSchema, EndeavourSchema } from "./wfrp/downtime/schema";
import { WfrpItemStatsSchema } from "./wfrp/equipment/stats";
import type { RuleSystemKey } from "./types";

export { AilmentInputSchema, EndeavourSchema };
export { WfrpItemStatsSchema as WfrpArtifactStatsSchema };

/** Write-path schema of `artifacts.systemStats`; the registry hook stays Zod-free (client graph), so the schema lives here */
export const SYSTEM_STATS_SCHEMAS: Partial<Record<RuleSystemKey, ZodType<unknown>>> = { wfrp: WfrpItemStatsSchema };
