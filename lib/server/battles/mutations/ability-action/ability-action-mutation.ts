import type { z } from "zod";

import { createAbilityUseMutation } from "../ability-use/ability-use-mutation";

import { abilityActionSchema } from "@/lib/schemas/battles";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export { abilityActionSchema };

export type AbilityActionBody = z.infer<typeof abilityActionSchema>;

export const createAbilityActionMutation = (deps?: SummonDeps) => createAbilityUseMutation<AbilityActionBody>("action", deps);

export const abilityActionMutation = createAbilityActionMutation();
