import { z } from "zod";

import { AbilityTargetSchema } from "@/lib/utils/abilities/schema/common";

const ChangeMoraleSchema = z.object({
  kind: z.literal("changeMorale"),
  delta: z.number().int().refine((d) => d !== 0),
  target: AbilityTargetSchema.optional(),
});

export const MORALE_MODULE_EFFECT_SCHEMAS = [ChangeMoraleSchema] as const;
