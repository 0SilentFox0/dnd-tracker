import { z } from "zod";

import { abilityActionSchema } from "../ability-action/ability-action-mutation";
import { createAbilityUseMutation } from "../ability-use/ability-use-mutation";

import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export const bonusActionSchema = abilityActionSchema.extend({ targetParticipantId: z.string().optional() });

export type BonusActionBody = z.infer<typeof bonusActionSchema>;

export const createBonusActionMutation = (deps?: SummonDeps) => createAbilityUseMutation<BonusActionBody>("bonusAction", deps);

export const bonusActionMutation = createBonusActionMutation();
