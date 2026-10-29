import type { z } from "zod";

import { createAbilityUseMutation } from "../ability-use/ability-use-mutation";

import { bonusActionSchema } from "@/lib/schemas/battles";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";


export type BonusActionBody = z.infer<typeof bonusActionSchema>;

export const createBonusActionMutation = (deps?: SummonDeps) => createAbilityUseMutation<BonusActionBody>("bonusAction", deps);

export const bonusActionMutation = createBonusActionMutation();
