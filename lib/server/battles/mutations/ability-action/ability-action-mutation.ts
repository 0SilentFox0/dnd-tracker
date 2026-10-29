import { z } from "zod";

import { createAbilityUseMutation } from "../ability-use/ability-use-mutation";

import { mapCellSchema } from "@/lib/schemas/battles";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export const abilityActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantIds: z.array(z.string()).optional(),
  targetCell: mapCellSchema.optional(),
});

export type AbilityActionBody = z.infer<typeof abilityActionSchema>;

export const createAbilityActionMutation = (deps?: SummonDeps) => createAbilityUseMutation<AbilityActionBody>("action", deps);

export const abilityActionMutation = createAbilityActionMutation();
